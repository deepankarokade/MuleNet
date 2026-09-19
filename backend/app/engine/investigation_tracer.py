import networkx as nx
from typing import Dict, List, Set, Tuple, Optional, Any
from datetime import datetime, timezone
from collections import defaultdict

from app.models import (
    Transaction,
    AccountStats,
    SuspiciousAccount,
    FraudRing,
    RiskLevel,
    AccountRole,
    HopDetail,
    FundTracePath,
    AccountDossier
)


def parse_iso_dt(ts_str: str) -> datetime:
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def format_delta_time(hours: float) -> str:
    if hours <= 0.0:
        return "Immediate"
    if hours < 1.0:
        mins = max(1, int(hours * 60))
        return f"{mins} min{'s' if mins > 1 else ''}"
    if hours < 48.0:
        return f"{hours:.1f} hrs"
    days = hours / 24.0
    return f"{days:.1f} days"


def get_account_meta(
    acc_id: str,
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount]
) -> Tuple[str, float, str]:
    """Returns (risk_level_str, suspicion_score, role_str)"""
    if acc_id in suspicious_accounts:
        s = suspicious_accounts[acc_id]
        return s.risk_level.value, s.suspicion_score, s.role.value
    stat = account_stats.get(acc_id)
    if stat:
        if stat.is_merchant:
            return "LOW", 10.0, "MERCHANT"
        if stat.is_payroll:
            return "LOW", 10.0, "PAYROLL"
    return "LOW", 0.0, "NORMAL"


def build_hop_detail(
    hop_num: int,
    u: str,
    v: str,
    tx: Transaction,
    prev_tx: Optional[Transaction],
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount]
) -> HopDetail:
    time_delta_h = 0.0
    if prev_tx:
        t_curr = parse_iso_dt(tx.timestamp)
        t_prev = parse_iso_dt(prev_tx.timestamp)
        diff_sec = (t_curr - t_prev).total_seconds()
        time_delta_h = max(0.0, round(diff_sec / 3600.0, 2))

    prev_amt = prev_tx.amount if prev_tx else tx.amount
    retained_amt = max(0.0, round(prev_amt - tx.amount, 2))
    retained_pct = round((retained_amt / prev_amt) * 100.0, 2) if prev_amt > 0 else 0.0

    u_risk, u_score, u_role = get_account_meta(u, account_stats, suspicious_accounts)
    v_risk, v_score, v_role = get_account_meta(v, account_stats, suspicious_accounts)

    return HopDetail(
        hop_number=hop_num,
        from_account=u,
        to_account=v,
        amount=round(tx.amount, 2),
        timestamp=tx.timestamp,
        time_delta_hours=time_delta_h,
        time_delta_display=format_delta_time(time_delta_h),
        retained_amount=retained_amt,
        retained_percent=retained_pct,
        currency=tx.currency or "INR",
        description=tx.description or "",
        from_account_risk=u_risk,
        from_account_score=u_score,
        from_account_role=u_role,
        to_account_risk=v_risk,
        to_account_score=v_score,
        to_account_role=v_role
    )


def trace_downstream_paths(
    start_acc: str,
    G: nx.DiGraph,
    tx_by_edge: Dict[Tuple[str, str], List[Transaction]],
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount],
    max_depth: int = 4
) -> List[FundTracePath]:
    """Traces outward money flows from start_acc forward into cashout/destinations."""
    paths: List[FundTracePath] = []
    if start_acc not in G:
        return paths
    
    # Priority queue / stack: (curr_node, [visited_nodes], [tx_list])
    stack = [(start_acc, [start_acc], [])]
    explored_tuples: Set[Tuple[str, ...]] = set()

    while stack and len(paths) < 5:
        curr, node_path, tx_path = stack.pop(0)

        if len(node_path) > 1:
            explored_tuples.add(tuple(node_path))
            
        successors = list(G.successors(curr))
        # Prioritize suspicious nodes, then high weight edges
        successors.sort(
            key=lambda n: (
                1 if n in suspicious_accounts else 0,
                G.get_edge_data(curr, n, default={}).get("weight", 0.0)
            ),
            reverse=True
        )

        valid_succs = [
            s for s in successors
            if s not in node_path or (s == start_acc and len(node_path) >= 3)  # allow closing cycle
        ]

        if (not valid_succs or len(node_path) - 1 >= max_depth) and len(node_path) > 1:
            # Reached endpoint of this trace
            hops: List[HopDetail] = []
            prev_tx = None
            for i, tx in enumerate(tx_path, start=1):
                u = node_path[i - 1]
                v = node_path[i]
                hop = build_hop_detail(i, u, v, tx, prev_tx, account_stats, suspicious_accounts)
                hops.append(hop)
                prev_tx = tx

            if hops:
                init_amt = hops[0].amount
                final_amt = hops[-1].amount
                tot_retained = sum(h.retained_amount for h in hops[1:])
                tot_span = sum(h.time_delta_hours for h in hops[1:])
                
                paths.append(FundTracePath(
                    path_id=f"DOWN-{len(paths) + 1:02d}",
                    direction="DOWNSTREAM",
                    source_node=start_acc,
                    target_node=node_path[-1],
                    total_hops=len(hops),
                    initial_amount=init_amt,
                    final_amount=final_amt,
                    total_retained=tot_retained,
                    total_span_hours=tot_span,
                    hops=hops
                ))
            continue

        for succ in valid_succs[:3]:  # branch top 3
            edge_txs = tx_by_edge.get((curr, succ), [])
            if not edge_txs:
                continue
            # Pick the most significant chronologically sensible tx
            best_tx = max(edge_txs, key=lambda t: t.amount)
            new_node_path = node_path + [succ]
            new_tx_path = tx_path + [best_tx]
            
            if tuple(new_node_path) not in explored_tuples:
                stack.append((succ, new_node_path, new_tx_path))
                if succ == start_acc:  # cycle closed, finish this branch
                    break

    return paths


def trace_upstream_paths(
    target_acc: str,
    G: nx.DiGraph,
    tx_by_edge: Dict[Tuple[str, str], List[Transaction]],
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount],
    max_depth: int = 4
) -> List[FundTracePath]:
    """Traces backwards from target_acc to locate original funding sources."""
    paths: List[FundTracePath] = []
    if target_acc not in G:
        return paths
    stack = [(target_acc, [target_acc], [])]
    explored_tuples: Set[Tuple[str, ...]] = set()

    while stack and len(paths) < 5:
        curr, node_path, tx_path = stack.pop(0)

        if len(node_path) > 1:
            explored_tuples.add(tuple(node_path))

        predecessors = list(G.predecessors(curr))
        predecessors.sort(
            key=lambda n: (
                1 if n in suspicious_accounts else 0,
                G.get_edge_data(n, curr, default={}).get("weight", 0.0)
            ),
            reverse=True
        )

        valid_preds = [
            p for p in predecessors
            if p not in node_path or (p == target_acc and len(node_path) >= 3)
        ]

        if (not valid_preds or len(node_path) - 1 >= max_depth) and len(node_path) > 1:
            # Invert path to read chronologically: Origin -> ... -> target_acc
            rev_nodes = list(reversed(node_path))
            rev_txs = list(reversed(tx_path))

            hops: List[HopDetail] = []
            prev_tx = None
            for i, tx in enumerate(rev_txs, start=1):
                u = rev_nodes[i - 1]
                v = rev_nodes[i]
                hop = build_hop_detail(i, u, v, tx, prev_tx, account_stats, suspicious_accounts)
                hops.append(hop)
                prev_tx = tx

            if hops:
                init_amt = hops[0].amount
                final_amt = hops[-1].amount
                tot_retained = sum(h.retained_amount for h in hops[1:])
                tot_span = sum(h.time_delta_hours for h in hops[1:])

                paths.append(FundTracePath(
                    path_id=f"UP-{len(paths) + 1:02d}",
                    direction="UPSTREAM",
                    source_node=rev_nodes[0],
                    target_node=target_acc,
                    total_hops=len(hops),
                    initial_amount=init_amt,
                    final_amount=final_amt,
                    total_retained=tot_retained,
                    total_span_hours=tot_span,
                    hops=hops
                ))
            continue

        for pred in valid_preds[:3]:
            edge_txs = tx_by_edge.get((pred, curr), [])
            if not edge_txs:
                continue
            best_tx = max(edge_txs, key=lambda t: t.amount)
            new_node_path = node_path + [pred]
            new_tx_path = tx_path + [best_tx]
            if tuple(new_node_path) not in explored_tuples:
                stack.append((pred, new_node_path, new_tx_path))
                if pred == target_acc:
                    break

    return paths


def generate_case_narrative(
    acc_id: str,
    suspicion_score: float,
    risk_level: str,
    role: str,
    rings: List[str],
    flags: List[str],
    stats: Optional[AccountStats],
    downstream: List[FundTracePath],
    upstream: List[FundTracePath]
) -> str:
    """Generates an official Suspicious Activity Report (SAR) forensic case narrative."""
    received = stats.total_received if stats else 0.0
    sent = stats.total_sent if stats else 0.0
    turnover = stats.turnover_ratio if stats else 0.0
    span_h = stats.active_span_hours if stats else 0.0

    ring_str = f"assigned to coordinated {', '.join(rings)}" if rings else "not part of a clustered ring"
    flag_bullet_list = "\n".join([f"  - {f}" for f in flags]) if flags else "  - No specific heuristic triggers tripped"

    downstream_summary = "No outgoing laundering trails detected."
    if downstream:
        best_down = downstream[0]
        downstream_summary = (
            f"Funds routed across {best_down.total_hops} downstream hop(s) terminating at {best_down.target_node}. "
            f"Initial outflow of {best_down.initial_amount:,.2f} experienced {best_down.total_retained:,.2f} in pass-through "
            f"retention over a {best_down.total_span_hours:.1f}-hour span."
        )

    upstream_summary = "Origin account with no upstream funding hops detected."
    if upstream:
        best_up = upstream[0]
        upstream_summary = (
            f"Inflow originated from {best_up.source_node} traversing {best_up.total_hops} intermediate hop(s) "
            f"before settling at subject account {acc_id}."
        )

    narrative = f"""### FORENSIC DOSSIER & SAR INVESTIGATION SUMMARY
**Subject Entity**: `{acc_id}`
**Classification**: Risk Level **{risk_level}** (Score: **{suspicion_score}/100** • Role: **{role}**)
**Network Affiliation**: {ring_str}

#### 1. Financial Activity Summary
- Total Cumulative Inflow : **{received:,.2f}**
- Total Cumulative Outflow: **{sent:,.2f}**
- Turnover Velocity Ratio : **{turnover * 100:.1f}%**
- Active Transacting Window: **{span_h:.1f} hours**

#### 2. Key Forensic Indicators
{flag_bullet_list}

#### 3. Money Trail Reconstruction
- **Inflow Origin Analysis**: {upstream_summary}
- **Outflow Disbursement Trail**: {downstream_summary}

#### 4. Investigator Recommendation
Subject account demonstrates significant indicators of synthetic turnover and structured movement. Recommended regulatory filing: Submit formal Suspicious Activity Report (SAR) under AML/CFT guidelines and place an administrative hold on remaining balances.
"""
    return narrative.strip()


def build_account_dossier(
    account_id: str,
    G: nx.DiGraph,
    transactions: List[Transaction],
    account_stats: Dict[str, AccountStats],
    suspicious_accounts: Dict[str, SuspiciousAccount],
    fraud_rings: List[FraudRing]
) -> AccountDossier:
    """Computes the full investigation dossier including multi-hop upstream & downstream fund tracing."""
    stat = account_stats.get(account_id)
    s_acc = suspicious_accounts.get(account_id)

    score = s_acc.suspicion_score if s_acc else 0.0
    risk = s_acc.risk_level if s_acc else RiskLevel.LOW
    role = s_acc.role.value if s_acc else (
        "MERCHANT" if stat and stat.is_merchant else "PAYROLL" if stat and stat.is_payroll else "NORMAL"
    )
    rings = s_acc.associated_rings if s_acc else []
    flags = s_acc.flags if s_acc else []

    # Map transactions by directed edge
    tx_by_edge: Dict[Tuple[str, str], List[Transaction]] = defaultdict(list)
    for tx in transactions:
        tx_by_edge[(tx.sender_account, tx.receiver_account)].append(tx)

    # Perform multi-hop fund flow tracing
    downstream = trace_downstream_paths(account_id, G, tx_by_edge, account_stats, suspicious_accounts)
    upstream = trace_upstream_paths(account_id, G, tx_by_edge, account_stats, suspicious_accounts)

    case_narrative = generate_case_narrative(
        account_id, score, risk.value, role, rings, flags, stat, downstream, upstream
    )

    score_breakdown = s_acc.score_breakdown if s_acc else {}
    evidence_points: List[str] = []

    if stat:
        if stat.turnover_ratio >= 0.7:
            evidence_points.append(f"{stat.turnover_ratio * 100:.1f}% pass-through ratio")
        tx_total = stat.tx_in_count + stat.tx_out_count
        if tx_total > 0:
            evidence_points.append(f"{tx_total} transaction{'s' if tx_total > 1 else ''}")
        if stat.active_span_hours > 0:
            if stat.active_span_hours <= 24.0:
                evidence_points.append(f"Funds forwarded within {stat.active_span_hours:.1f}h")
            else:
                evidence_points.append(f"Active window: {stat.active_span_hours:.1f}h")

    if rings:
        evidence_points.append(f"Participates in {', '.join(rings)}")

    if downstream:
        best_down = downstream[0]
        evidence_points.append(f"Part of a {best_down.total_hops + 1}-account layered chain")
    elif upstream:
        best_up = upstream[0]
        evidence_points.append(f"Receives funds from a {best_up.total_hops + 1}-account upstream trail")

    for f in flags:
        if len(evidence_points) < 6 and f not in evidence_points:
            evidence_points.append(f)

    return AccountDossier(
        account_id=account_id,
        suspicion_score=score,
        risk_level=risk,
        role=role,
        associated_rings=rings,
        flags=flags,
        total_received=stat.total_received if stat else 0.0,
        total_sent=stat.total_sent if stat else 0.0,
        turnover_ratio=stat.turnover_ratio if stat else 0.0,
        active_span_hours=stat.active_span_hours if stat else 0.0,
        upstream_traces=upstream,
        downstream_traces=downstream,
        case_narrative=case_narrative,
        score_breakdown=score_breakdown,
        evidence_points=evidence_points
    )
