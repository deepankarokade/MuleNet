import networkx as nx
from typing import Dict, List, Set, Tuple, Any, Optional
from collections import defaultdict
from app.models import (
    FraudRing,
    SuspiciousAccount,
    DetectedCycle,
    DetectedSmurfing,
    DetectedShellChain,
    RiskLevel,
    GraphVisualizationData,
    CytoscapeNode,
    CytoscapeNodeData,
    CytoscapeEdge,
    CytoscapeEdgeData,
    Transaction,
    AccountStats
)
from app.core.config import settings


def aggregate_fraud_rings(
    G: nx.DiGraph,
    transactions: List[Transaction],
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount],
    cycles: List[DetectedCycle],
    smurfing_patterns: List[DetectedSmurfing],
    shell_chains: List[DetectedShellChain]
) -> Tuple[List[FraudRing], Dict[str, SuspiciousAccount], GraphVisualizationData]:
    """
    Groups suspicious accounts and patterns into distinct Fraud Rings via connected components,
    identifies orchestrators and money flows, and formats graph data for Cytoscape.js.
    """
    # 1. Build an undirected graph connecting accounts that participate in shared patterns
    ring_graph = nx.Graph()

    # Add cycle members
    for c in cycles:
        for i in range(len(c.accounts)):
            for j in range(i + 1, len(c.accounts)):
                ring_graph.add_edge(c.accounts[i], c.accounts[j], pattern="CYCLE")

    # Add smurfing spokes to hub
    for sm in smurfing_patterns:
        for spoke in sm.spoke_accounts:
            ring_graph.add_edge(sm.hub_account, spoke, pattern=sm.pattern_type.value)

    # Add shell chain connections (excluding any verified merchants/payroll)
    for sc in shell_chains:
        full_chain = [sc.source_account] + sc.intermediary_shells + [sc.destination_account]
        for i in range(len(full_chain) - 1):
            u, v = full_chain[i], full_chain[i + 1]
            u_stat = account_stats.get(u)
            v_stat = account_stats.get(v)
            if u_stat and (u_stat.is_merchant or u_stat.is_payroll):
                continue
            if v_stat and (v_stat.is_merchant or v_stat.is_payroll):
                continue
            ring_graph.add_edge(u, v, pattern="SHELL_CHAIN")

    # Also add direct transactions between suspicious accounts (score >= 40)
    suspicious_ids = set(suspicious_accounts.keys())
    for tx in transactions:
        if tx.sender_account in suspicious_ids and tx.receiver_account in suspicious_ids:
            ring_graph.add_edge(tx.sender_account, tx.receiver_account, pattern="DIRECT_TX")

    # 2. Extract connected components
    components = list(nx.connected_components(ring_graph))
    
    # Sort components by size descending
    components.sort(key=len, reverse=True)

    fraud_rings: List[FraudRing] = []
    account_to_ring_map: Dict[str, str] = {}
    
    # Index transactions by edge
    tx_by_edge: Dict[Tuple[str, str], List[Transaction]] = defaultdict(list)
    for tx in transactions:
        tx_by_edge[(tx.sender_account, tx.receiver_account)].append(tx)

    ring_idx = 1
    for comp in components:
        # Strictly filter ring members: must be suspicious (score >= 40) and NOT merchant or payroll
        comp_members = [
            m for m in comp
            if m in suspicious_accounts
            and suspicious_accounts[m].suspicion_score >= settings.MIN_SUSPICION_SCORE_TO_REPORT
            and not (account_stats.get(m) and (account_stats[m].is_merchant or account_stats[m].is_payroll))
        ]
        
        # A valid fraud ring must have at least 2 coordinated suspicious accounts
        if len(comp_members) < 2:
            continue
            
        ring_id = f"RING-{ring_idx:03d}"
        ring_idx += 1
        
        # Collect member scores and patterns
        member_scores = [
            suspicious_accounts[m].suspicion_score
            for m in comp_members if m in suspicious_accounts
        ]
        
        max_score = max(member_scores) if member_scores else 50.0
        
        # Determine ring severity
        if max_score >= 80.0:
            severity = RiskLevel.CRITICAL
        elif max_score >= 60.0:
            severity = RiskLevel.HIGH
        elif max_score >= 40.0:
            severity = RiskLevel.MEDIUM
        else:
            severity = RiskLevel.LOW

        # Identify Patterns in this ring
        ring_patterns: Set[str] = set()
        for c in cycles:
            if any(acc in comp_members for acc in c.accounts):
                ring_patterns.add("Circular Routing (Cycle)")
        for sm in smurfing_patterns:
            if sm.hub_account in comp_members or any(sp in comp_members for sp in sm.spoke_accounts):
                ring_patterns.add(f"Smurfing ({sm.pattern_type.value})")
        for sc in shell_chains:
            if any(s in comp_members for s in sc.intermediary_shells):
                ring_patterns.add("Layered Shell Chain")

        # Calculate funds routed within this ring
        internal_funds = 0.0
        internal_tx_count = 0
        comp_set = set(comp_members)
        
        for u in comp_members:
            account_to_ring_map[u] = ring_id
            for v in comp_members:
                if (u, v) in tx_by_edge:
                    edge_txs = tx_by_edge[(u, v)]
                    internal_tx_count += len(edge_txs)
                    internal_funds += sum(t.amount for t in edge_txs)

        # Identify orchestrator: member with highest betweenness centrality or total outbound volume
        orchestrator = None
        best_orchestrator_score = -1.0
        for m in comp_members:
            m_stat = account_stats.get(m)
            if m_stat:
                m_score = (m_stat.betweenness_centrality * 100.0) + (m_stat.total_sent / 1000.0)
                if m_score > best_orchestrator_score:
                    best_orchestrator_score = m_score
                    orchestrator = m

        primary_pattern = next(iter(ring_patterns)) if ring_patterns else "Suspicious Connected Flow"

        ring_obj = FraudRing(
            ring_id=ring_id,
            risk_score=round(max_score, 1),
            severity=severity,
            primary_pattern=primary_pattern,
            patterns_detected=list(ring_patterns),
            member_count=len(comp_members),
            member_accounts=comp_members,
            orchestrator=orchestrator,
            total_funds_routed=round(internal_funds, 2),
            transaction_count=internal_tx_count,
            description=f"Coordinated ring of {len(comp_members)} accounts exhibiting {', '.join(ring_patterns)} with ${internal_funds:,.2f} routed."
        )
        fraud_rings.append(ring_obj)

    # 3. Update SuspiciousAccounts with associated ring IDs
    for acc_id, s_acc in suspicious_accounts.items():
        if acc_id in account_to_ring_map:
            s_acc.associated_rings.append(account_to_ring_map[acc_id])

    # 4. Construct Cytoscape Graph Visualization Data
    cyto_nodes: List[CytoscapeNode] = []
    cyto_edges: List[CytoscapeEdge] = []
    
    # Render all nodes, or prioritize suspicious nodes and their 1-hop neighbors
    all_graph_nodes = list(G.nodes())
    
    for n in all_graph_nodes:
        stat = account_stats.get(n)
        s_acc = suspicious_accounts.get(n)
        
        score = s_acc.suspicion_score if s_acc else 0.0
        risk = s_acc.risk_level if s_acc else RiskLevel.LOW
        is_susp = score >= settings.MIN_SUSPICION_SCORE_TO_REPORT
        role = s_acc.role.value if s_acc else "NORMAL"
        r_id = account_to_ring_map.get(n)

        # Build evidence points for fast interactive inspection
        ev_pts = []
        if stat:
            if stat.turnover_ratio >= 0.7:
                ev_pts.append(f"{stat.turnover_ratio * 100:.1f}% pass-through ratio")
            tx_tot = stat.tx_in_count + stat.tx_out_count
            if tx_tot > 0:
                ev_pts.append(f"{tx_tot} transactions")
            if stat.active_span_hours > 0:
                if stat.active_span_hours <= 24.0:
                    ev_pts.append(f"Funds forwarded within {stat.active_span_hours:.1f}h")
                else:
                    ev_pts.append(f"Active window: {stat.active_span_hours:.1f}h")
        if r_id:
            ev_pts.append(f"Participates in {r_id}")
        elif s_acc and s_acc.associated_rings:
            ev_pts.append(f"Participates in {', '.join(s_acc.associated_rings)}")
        if s_acc and s_acc.flags:
            for f in s_acc.flags:
                if len(ev_pts) < 5 and f not in ev_pts:
                    ev_pts.append(f)
        
        node_data = CytoscapeNodeData(
            id=n,
            label=n,
            suspicion_score=score,
            risk_level=risk,
            is_suspicious=is_susp,
            role=role,
            ring_id=r_id,
            total_received=stat.total_received if stat else 0.0,
            total_sent=stat.total_sent if stat else 0.0,
            tx_count=(stat.tx_in_count + stat.tx_out_count) if stat else 0,
            in_degree=stat.in_degree if stat else 0,
            out_degree=stat.out_degree if stat else 0,
            flags=s_acc.flags if s_acc else [],
            score_breakdown=s_acc.score_breakdown if s_acc else {},
            evidence_points=ev_pts
        )
        cyto_nodes.append(CytoscapeNode(data=node_data))

    edge_counter = 1
    for u, v, data in G.edges(data=True):
        weight = data.get("weight", 0.0)
        tx_list = data.get("transactions", [])
        ts = tx_list[0].timestamp if tx_list else ""
        
        u_ring = account_to_ring_map.get(u)
        v_ring = account_to_ring_map.get(v)
        shared_ring = u_ring if (u_ring and u_ring == v_ring) else None
        
        is_edge_susp = bool(shared_ring) or (
            u in suspicious_accounts and suspicious_accounts[u].suspicion_score >= 50 and
            v in suspicious_accounts and suspicious_accounts[v].suspicion_score >= 50
        )
        
        edge_data = CytoscapeEdgeData(
            id=f"e{edge_counter}",
            source=u,
            target=v,
            amount=round(weight, 2),
            timestamp=ts,
            is_suspicious=is_edge_susp,
            ring_id=shared_ring
        )
        cyto_edges.append(CytoscapeEdge(data=edge_data))
        edge_counter += 1

    graph_viz = GraphVisualizationData(nodes=cyto_nodes, edges=cyto_edges)
    return fraud_rings, suspicious_accounts, graph_viz
