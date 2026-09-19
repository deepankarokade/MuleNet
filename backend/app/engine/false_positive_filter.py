import networkx as nx
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone
from collections import defaultdict
from app.models import AccountStats, Transaction, DetectedCycle, DetectedShellChain
from app.core.config import settings


def parse_dt(ts_str: str) -> datetime:
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def classify_false_positives(
    account_stats: Dict[str, AccountStats],
    transactions: List[Transaction],
    cycles: List[DetectedCycle],
    shell_chains: Optional[List[DetectedShellChain]] = None
) -> Dict[str, AccountStats]:
    """
    Identifies legitimate business patterns (merchants and payroll accounts)
    to prevent false positives from naive fan-in/fan-out alerts.
    """
    # Find accounts involved in cycles or shell chains (fraud ground truth)
    accounts_in_cycles: Set[str] = set()
    for c in cycles:
        accounts_in_cycles.update(c.accounts)
        
    accounts_in_shells: Set[str] = set()
    if shell_chains:
        for s in shell_chains:
            accounts_in_shells.update(s.intermediary_shells)

    # Group transactions by sender and receiver
    outgoing_by_acc: Dict[str, List[Transaction]] = defaultdict(list)
    incoming_by_acc: Dict[str, List[Transaction]] = defaultdict(list)
    
    for tx in transactions:
        outgoing_by_acc[tx.sender_account].append(tx)
        incoming_by_acc[tx.receiver_account].append(tx)

    for acc_id, stats in account_stats.items():
        # High-confidence fraud indicators override false-positive dampening
        if acc_id in accounts_in_cycles or acc_id in accounts_in_shells:
            stats.is_merchant = False
            stats.is_payroll = False
            continue

        in_txs = incoming_by_acc[acc_id]
        out_txs = outgoing_by_acc[acc_id]
        span_days = stats.active_span_hours / 24.0
        has_payroll_desc = any(
            "salary" in (t.description or "").lower() or "payroll" in (t.description or "").lower()
            for t in out_txs
        )
        
        # 1. Merchant Detection: High fan-in from diverse customers, steady business inflow
        if len(in_txs) >= settings.MERCHANT_MIN_INCOMING_TX:
            unique_senders = len({tx.sender_account for tx in in_txs})
            unique_receivers = max(1, len({tx.receiver_account for tx in out_txs}))
            
            # Merchant ratio: incoming connections far exceed outgoing disbursements
            ratio = unique_senders / unique_receivers
            
            # Check amount diversity (merchants have varying basket sizes)
            amounts = [tx.amount for tx in in_txs]
            avg_amt = sum(amounts) / len(amounts)
            std_dev = (sum((x - avg_amt) ** 2 for x in amounts) / len(amounts)) ** 0.5
            coef_variation = std_dev / avg_amt if avg_amt > 0 else 0.0
            
            if (ratio >= 2.5 and 
                (span_days >= settings.MERCHANT_MIN_ACTIVE_DAYS or stats.tx_in_count >= 25) and
                coef_variation > 0.15):
                stats.is_merchant = True

        # 2. Payroll Detection: Disperses to multiple employees periodically
        if len(out_txs) >= settings.PAYROLL_MIN_RECIPIENTS:
            unique_receivers = len({tx.receiver_account for tx in out_txs})
            unique_senders = max(1, len({tx.sender_account for tx in in_txs}))
            
            out_in_ratio = unique_receivers / unique_senders
            # Calculate amount variance (payroll salaries cluster into brackets or identical amounts)
            out_amounts = [tx.amount for tx in out_txs]
            avg_out = sum(out_amounts) / len(out_amounts) if out_amounts else 1.0
            std_dev = (sum((x - avg_out) ** 2 for x in out_amounts) / len(out_amounts)) ** 0.5
            coef_variation = std_dev / avg_out if avg_out > 0 else 0.0
            
            # Real payroll has either multi-day span, payroll keywords, or uniform salary distribution (low CoV)
            is_uniform_salary = (coef_variation <= 0.25 and len(out_txs) >= 8)
            
            if out_in_ratio >= 3.0 and (span_days >= 7.0 or has_payroll_desc or is_uniform_salary) and not stats.is_merchant:
                # Payroll usually has significant balance or receives from corporate accounts
                if stats.total_sent > 0:
                    stats.is_payroll = True

    return account_stats
