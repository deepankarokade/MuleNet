import networkx as nx
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from app.models import (
    AccountStats,
    SuspiciousAccount,
    DetectedCycle,
    DetectedSmurfing,
    DetectedShellChain,
    RiskLevel,
    AccountRole,
    PatternType
)
from app.core.config import settings


def compute_suspicion_scores(
    account_stats: Dict[str, AccountStats],
    cycles: List[DetectedCycle],
    smurfing_patterns: List[DetectedSmurfing],
    shell_chains: List[DetectedShellChain]
) -> Dict[str, SuspiciousAccount]:
    """
    Computes multi-signal suspicion scores (0–100) combining graph topology,
    temporal bursts, and behavioral flags with false-positive dampening.
    """
    # Index patterns by account
    acc_cycles: Dict[str, List[DetectedCycle]] = defaultdict(list)
    for c in cycles:
        for acc in c.accounts:
            acc_cycles[acc].append(c)

    acc_smurfing_hubs: Dict[str, List[DetectedSmurfing]] = defaultdict(list)
    acc_smurfing_spokes: Dict[str, List[DetectedSmurfing]] = defaultdict(list)
    for sm in smurfing_patterns:
        acc_smurfing_hubs[sm.hub_account].append(sm)
        for spoke in sm.spoke_accounts:
            acc_smurfing_spokes[spoke].append(sm)

    acc_shells_interm: Dict[str, List[DetectedShellChain]] = defaultdict(list)
    acc_shells_endpoints: Dict[str, List[DetectedShellChain]] = defaultdict(list)
    for sc in shell_chains:
        for s_acc in sc.intermediary_shells:
            acc_shells_interm[s_acc].append(sc)
        acc_shells_endpoints[sc.source_account].append(sc)
        acc_shells_endpoints[sc.destination_account].append(sc)

    suspicious_accounts: Dict[str, SuspiciousAccount] = {}

    for acc_id, stats in account_stats.items():
        score_breakdown: Dict[str, float] = {
            "cycle_score": 0.0,
            "smurfing_score": 0.0,
            "shell_score": 0.0,
            "temporal_burst_score": 0.0,
            "centrality_score": 0.0
        }
        flags: List[str] = []
        patterns: List[PatternType] = []

        # 1. Cycle Scoring
        cyc_list = acc_cycles.get(acc_id, [])
        if cyc_list:
            patterns.append(PatternType.CYCLE)
            # Confirmed cycle is a critical AML indicator (50 base + 10 for additional)
            cycle_pts = min(70.0, 50.0 + 10.0 * (len(cyc_list) - 1))
            score_breakdown["cycle_score"] = cycle_pts
            flags.append(f"Involved in {len(cyc_list)} circular fund routing cycle(s)")

        # 2. Smurfing Scoring
        smurf_hubs = acc_smurfing_hubs.get(acc_id, [])
        smurf_spokes = acc_smurfing_spokes.get(acc_id, [])
        smurf_pts = 0.0
        has_fan_in = False
        has_fan_out = False
        has_scatter_gather = False

        if smurf_hubs:
            has_fan_in = any(s.pattern_type == PatternType.SMURFING_FAN_IN for s in smurf_hubs)
            has_fan_out = any(s.pattern_type == PatternType.SMURFING_FAN_OUT for s in smurf_hubs)
            has_scatter_gather = any(s.pattern_type == PatternType.SMURFING_SCATTER_GATHER for s in smurf_hubs)

            if has_scatter_gather or (has_fan_in and has_fan_out):
                patterns.append(PatternType.SMURFING_SCATTER_GATHER)
                smurf_pts = 65.0
                flags.append("High-velocity scatter-gather smurfing hub")
            elif has_fan_in:
                patterns.append(PatternType.SMURFING_FAN_IN)
                smurf_pts = 55.0
                flags.append("Rapid fan-in aggregation hub (10+ sources in 72h)")
            elif has_fan_out:
                patterns.append(PatternType.SMURFING_FAN_OUT)
                smurf_pts = 55.0
                flags.append("Rapid fan-out dispersion hub (10+ destinations in 72h)")
        elif smurf_spokes:
            # Spoke (feeder or cashout mule)
            patterns.append(PatternType.SMURFING_FAN_IN if any(s.pattern_type == PatternType.SMURFING_FAN_IN for s in smurf_spokes) else PatternType.SMURFING_FAN_OUT)
            smurf_pts = 45.0
            flags.append("Identified as coordinated smurfing counterpart (feeder/cashout mule)")

        score_breakdown["smurfing_score"] = smurf_pts

        # 3. Shell Account Scoring
        shell_interms = acc_shells_interm.get(acc_id, [])
        shell_endpoints = acc_shells_endpoints.get(acc_id, [])
        shell_pts = 0.0

        if shell_interms:
            patterns.append(PatternType.SHELL_CHAIN)
            shell_pts = 60.0
            flags.append(f"Pass-through intermediary in {len(shell_interms)} shell network chain(s)")
        elif shell_endpoints:
            patterns.append(PatternType.SHELL_CHAIN)
            shell_pts = 45.0
            flags.append("Origin or cashout endpoint of a multi-hop shell network")

        score_breakdown["shell_score"] = shell_pts

        # Only evaluate behavioral & centrality amplifiers IF there is structural pattern evidence
        has_structural_pattern = bool(cyc_list or smurf_hubs or smurf_spokes or shell_interms or shell_endpoints)

        if has_structural_pattern:
            # 4. Temporal Burst & Pass-Through Behavior (Max 15)
            temporal_pts = 0.0
            if stats.turnover_ratio >= 0.85 and stats.active_span_hours <= 72.0:
                temporal_pts += 8.0
                flags.append("Rapid fund forwarding (<72h dwell time)")
            if stats.turnover_ratio >= 0.95 and max(stats.total_received, stats.total_sent) > 4000:
                temporal_pts += 7.0
                flags.append("High pass-through volume ratio (>95%)")
            score_breakdown["temporal_burst_score"] = min(15.0, temporal_pts)

            # 5. Network Centrality (Max 15)
            centrality_pts = 0.0
            if stats.betweenness_centrality > 0.005:
                centrality_pts += min(8.0, stats.betweenness_centrality * 100.0)
                flags.append("High betweenness centrality (critical network bridge)")
            if stats.pagerank > 0.002:
                centrality_pts += min(7.0, stats.pagerank * 200.0)
            score_breakdown["centrality_score"] = round(min(15.0, centrality_pts), 2)

        # Raw Total Score
        raw_score = sum(score_breakdown.values())

        # False-Positive Dampening
        if stats.is_merchant:
            raw_score *= settings.MERCHANT_DAMPENING_FACTOR
            flags.append("Verified legitimate merchant behavior (score dampened)")
        elif stats.is_payroll:
            raw_score *= settings.PAYROLL_DAMPENING_FACTOR
            flags.append("Verified payroll disbursement behavior (score dampened)")

        final_score = round(max(0.0, min(100.0, raw_score)), 1)

        # Determine Risk Level
        if final_score >= 80.0:
            risk = RiskLevel.CRITICAL
        elif final_score >= 60.0:
            risk = RiskLevel.HIGH
        elif final_score >= 40.0:
            risk = RiskLevel.MEDIUM
        else:
            risk = RiskLevel.LOW

        # Assign Role with clear, explainable semantics
        role = AccountRole.NORMAL
        if stats.is_merchant:
            role = AccountRole.MERCHANT
        elif stats.is_payroll:
            role = AccountRole.PAYROLL
        elif cyc_list:
            # Account is part of a circular fund loop
            if stats.betweenness_centrality > 0.05:
                role = AccountRole.ORCHESTRATOR
            else:
                role = AccountRole.CYCLE_PARTICIPANT
        elif has_scatter_gather or has_fan_in:
            role = AccountRole.AGGREGATOR
        elif has_fan_out:
            role = AccountRole.DISPERSER
        elif smurf_spokes:
            role = AccountRole.MULE
        elif shell_interms:
            # Verified pass-through intermediary in a layered shell chain
            role = AccountRole.SUSPICIOUS_INTERMEDIARY
        elif shell_endpoints:
            if stats.out_degree > stats.in_degree:
                role = AccountRole.ORCHESTRATOR
            else:
                role = AccountRole.MULE
        elif final_score >= 40.0:
            role = AccountRole.MULE

        # Filter: only keep accounts that have meaningful suspicion (>= 40)
        if final_score >= settings.MIN_SUSPICION_SCORE_TO_REPORT:
            suspicious_accounts[acc_id] = SuspiciousAccount(
                account_id=acc_id,
                suspicion_score=final_score,
                risk_level=risk,
                role=role,
                flags=flags,
                associated_rings=[],
                patterns=list(set(patterns)),
                total_received=stats.total_received,
                total_sent=stats.total_sent,
                tx_count=stats.tx_in_count + stats.tx_out_count,
                score_breakdown=score_breakdown
            )

    return suspicious_accounts
