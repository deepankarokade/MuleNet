import networkx as nx
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Any
from app.models import Transaction, AccountStats


def build_transaction_graph(transactions: List[Transaction]) -> Tuple[nx.DiGraph, Dict[str, AccountStats]]:
    """
    Constructs a directed graph and computes comprehensive account statistics.
    Nodes: Accounts
    Edges: Directed transactions (sender -> receiver) with aggregated amounts and tx lists.
    """
    G = nx.DiGraph()
    raw_stats: Dict[str, Dict[str, Any]] = {}
    
    def get_or_create_node_stat(acc_id: str) -> Dict[str, Any]:
        if acc_id not in raw_stats:
            raw_stats[acc_id] = {
                "in_counterparts": set(),
                "out_counterparts": set(),
                "tx_in_count": 0,
                "tx_out_count": 0,
                "total_received": 0.0,
                "total_sent": 0.0,
                "first_seen_dt": None,
                "last_seen_dt": None,
                "tx_incoming": [],
                "tx_outgoing": []
            }
        return raw_stats[acc_id]

    for tx in transactions:
        u = tx.sender_account
        v = tx.receiver_account
        amt = tx.amount
        
        try:
            dt = datetime.fromisoformat(tx.timestamp.replace("Z", "+00:00"))
        except Exception:
            dt = datetime.now(timezone.utc)
            
        u_stat = get_or_create_node_stat(u)
        v_stat = get_or_create_node_stat(v)
        
        u_stat["out_counterparts"].add(v)
        u_stat["tx_out_count"] += 1
        u_stat["total_sent"] += amt
        u_stat["tx_outgoing"].append(tx)
        if u_stat["first_seen_dt"] is None or dt < u_stat["first_seen_dt"]:
            u_stat["first_seen_dt"] = dt
        if u_stat["last_seen_dt"] is None or dt > u_stat["last_seen_dt"]:
            u_stat["last_seen_dt"] = dt

        v_stat["in_counterparts"].add(u)
        v_stat["tx_in_count"] += 1
        v_stat["total_received"] += amt
        v_stat["tx_incoming"].append(tx)
        if v_stat["first_seen_dt"] is None or dt < v_stat["first_seen_dt"]:
            v_stat["first_seen_dt"] = dt
        if v_stat["last_seen_dt"] is None or dt > v_stat["last_seen_dt"]:
            v_stat["last_seen_dt"] = dt

        # Graph edge
        if G.has_edge(u, v):
            edge_data = G[u][v]
            edge_data["weight"] += amt
            edge_data["tx_count"] += 1
            edge_data["transactions"].append(tx)
        else:
            G.add_edge(u, v, weight=amt, tx_count=1, transactions=[tx])

    # Compute Centrality measures
    num_nodes = G.number_of_nodes()
    pagerank_scores = {}
    betweenness_scores = {}
    
    if num_nodes > 0:
        try:
            pagerank_scores = nx.pagerank(G, alpha=0.85, max_iter=100)
        except Exception:
            pagerank_scores = {n: 1.0 / num_nodes for n in G.nodes()}

        # For large graphs (>1000 nodes), approximate betweenness using sampling for speed
        try:
            if num_nodes > 500:
                k = min(100, num_nodes)
                betweenness_scores = nx.betweenness_centrality(G, k=k, normalized=True, weight="weight")
            else:
                betweenness_scores = nx.betweenness_centrality(G, normalized=True, weight="weight")
        except Exception:
            betweenness_scores = {n: 0.0 for n in G.nodes()}

    # Assemble structured AccountStats
    account_stats: Dict[str, AccountStats] = {}
    for acc_id, s in raw_stats.items():
        rec = round(s["total_received"], 2)
        sent = round(s["total_sent"], 2)
        max_flow = max(rec, sent)
        min_flow = min(rec, sent)
        turnover = round(min_flow / max_flow, 4) if max_flow > 0 else 0.0
        
        span_hrs = 0.0
        if s["first_seen_dt"] and s["last_seen_dt"]:
            delta = s["last_seen_dt"] - s["first_seen_dt"]
            span_hrs = round(delta.total_seconds() / 3600.0, 2)
            
        stats_obj = AccountStats(
            account_id=acc_id,
            in_degree=len(s["in_counterparts"]),
            out_degree=len(s["out_counterparts"]),
            tx_in_count=s["tx_in_count"],
            tx_out_count=s["tx_out_count"],
            total_received=rec,
            total_sent=sent,
            net_flow=round(rec - sent, 2),
            turnover_ratio=turnover,
            first_seen=s["first_seen_dt"].isoformat() if s["first_seen_dt"] else None,
            last_seen=s["last_seen_dt"].isoformat() if s["last_seen_dt"] else None,
            active_span_hours=span_hrs,
            betweenness_centrality=round(betweenness_scores.get(acc_id, 0.0), 6),
            pagerank=round(pagerank_scores.get(acc_id, 0.0), 6)
        )
        account_stats[acc_id] = stats_obj
        
        # Attach stats to NetworkX node attributes for convenient traversal
        G.nodes[acc_id]["stats"] = stats_obj

    return G, account_stats
