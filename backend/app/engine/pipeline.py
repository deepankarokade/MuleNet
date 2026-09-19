import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from app.models import (
    Transaction,
    AnalysisReport,
    RiskLevel
)
from app.engine.csv_validator import parse_and_validate_csv
from app.engine.graph_builder import build_transaction_graph
from app.engine.cycle_detector import detect_cycles
from app.engine.smurfing_detector import detect_smurfing
from app.engine.shell_detector import detect_shell_networks
from app.engine.false_positive_filter import classify_false_positives
from app.engine.scoring_engine import compute_suspicion_scores
from app.engine.ring_aggregator import aggregate_fraud_rings


def run_pipeline_with_context(csv_content: str) -> Tuple[AnalysisReport, Dict[str, Any]]:
    """
    Executes the end-to-end money-muling detection pipeline:
    1. Parse & validate CSV (<= 10,000 transactions)
    2. Build NetworkX directed graph & account stats
    3. Detect circular fund routing (cycles length 3-5)
    4. Detect smurfing patterns (10+ fan-in/fan-out in 72h)
    5. Detect layered shell networks (3+ hop chains)
    6. Filter/dampen legitimate merchants & payroll
    7. Calculate multi-signal 0-100 suspicion scores
    8. Aggregate fraud rings & construct Cytoscape graph data
    9. Produce downloadable JSON report
    """
    start_time = time.perf_counter()

    # Step 1: Parse CSV
    transactions = parse_and_validate_csv(csv_content)

    # Step 2: Build Graph & Metrics
    G, account_stats = build_transaction_graph(transactions)

    # Step 3: Cycle Detection (length 3-5)
    cycles = detect_cycles(G, min_len=3, max_len=5)
    cycle_accounts = {acc for c in cycles for acc in c.accounts}

    # Step 4: False Positive Filtering (Merchants & Payroll)
    account_stats = classify_false_positives(account_stats, transactions, cycles)

    # Step 5: Shell Network Detection (3+ hops with 2-3 intermediaries, excluding merchants/payroll/cycles)
    shell_chains = detect_shell_networks(G, account_stats, cycle_accounts=cycle_accounts)

    # Step 6: Smurfing Detection (10+ spokes in 72h, excluding verified merchants/payroll)
    smurfing_patterns = detect_smurfing(G, transactions, account_stats=account_stats)

    # Step 7: Suspicion Scoring (0-100)
    suspicious_accounts = compute_suspicion_scores(account_stats, cycles, smurfing_patterns, shell_chains)

    # Step 8: Ring Aggregation & Cytoscape Data
    fraud_rings, suspicious_accounts, graph_viz = aggregate_fraud_rings(
        G, transactions, account_stats, suspicious_accounts, cycles, smurfing_patterns, shell_chains
    )

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Risk Distribution Count
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for acc in suspicious_accounts.values():
        if acc.risk_level == RiskLevel.CRITICAL:
            risk_counts["critical"] += 1
        elif acc.risk_level == RiskLevel.HIGH:
            risk_counts["high"] += 1
        elif acc.risk_level == RiskLevel.MEDIUM:
            risk_counts["medium"] += 1
        else:
            risk_counts["low"] += 1

    # Total funds in transactions
    total_volume = round(sum(tx.amount for tx in transactions), 2)
    total_suspicious_funds = round(sum(r.total_funds_routed for r in fraud_rings), 2)

    # Summary section
    summary = {
        "total_transactions": len(transactions),
        "total_accounts": len(account_stats),
        "total_suspicious_accounts": len(suspicious_accounts),
        "total_fraud_rings": len(fraud_rings),
        "total_cycles_detected": len(cycles),
        "total_smurfing_patterns": len(smurfing_patterns),
        "total_shell_chains": len(shell_chains),
        "total_volume_analyzed": total_volume,
        "total_suspicious_volume": total_suspicious_funds,
        "risk_distribution": risk_counts
    }

    report_metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "analysis_duration_ms": duration_ms,
        "analysis_duration_seconds": round(duration_ms / 1000.0, 3),
        "engine_version": "1.0.0",
        "system_status": "SUCCESS"
    }

    detected_patterns = {
        "cycles": [c.model_dump() for c in cycles],
        "smurfing": [s.model_dump() for s in smurfing_patterns],
        "shell_chains": [sc.model_dump() for sc in shell_chains]
    }

    # Sort suspicious accounts by score descending
    sorted_suspicious = sorted(list(suspicious_accounts.values()), key=lambda a: a.suspicion_score, reverse=True)

    report = AnalysisReport(
        report_metadata=report_metadata,
        summary=summary,
        fraud_rings=fraud_rings,
        suspicious_accounts=sorted_suspicious,
        detected_patterns=detected_patterns,
        graph_data=graph_viz
    )

    context = {
        "G": G,
        "transactions": transactions,
        "account_stats": account_stats,
        "suspicious_accounts": suspicious_accounts,
        "fraud_rings": fraud_rings,
        "csv_content": csv_content
    }

    return report, context


def run_forensics_pipeline(csv_content: str) -> AnalysisReport:
    """Executes the end-to-end money-muling detection pipeline and returns the AnalysisReport."""
    report, _ = run_pipeline_with_context(csv_content)
    return report
