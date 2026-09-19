import networkx as nx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict
from app.models import DetectedSmurfing, PatternType, Transaction
from app.core.config import settings


def parse_dt(ts_str: str) -> datetime:
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def detect_smurfing(
    G: nx.DiGraph,
    transactions: List[Transaction],
    account_stats: Optional[Dict[str, Any]] = None,
    min_spokes: int = settings.SMURFING_MIN_SPOKES,
    window_hours: float = settings.SMURFING_WINDOW_HOURS
) -> List[DetectedSmurfing]:
    """
    Detects smurfing (fan-in, fan-out, and scatter-gather) patterns where
    an account transacts with >= min_spokes (10+) unique counterparties
    within a rolling 72-hour window.
    Excludes verified legitimate merchants and payroll accounts.
    """
    # Group transactions by sender and receiver
    outgoing_by_acc: Dict[str, List[Transaction]] = defaultdict(list)
    incoming_by_acc: Dict[str, List[Transaction]] = defaultdict(list)

    for tx in transactions:
        outgoing_by_acc[tx.sender_account].append(tx)
        incoming_by_acc[tx.receiver_account].append(tx)

    detected_patterns: List[DetectedSmurfing] = []
    window_delta = timedelta(hours=window_hours)
    
    # Track accounts with fan-in and fan-out for scatter-gather
    fan_in_accounts: Set[str] = set()
    fan_out_accounts: Set[str] = set()

    # 1. Detect Fan-Out (Scatter): Hub sends to >= min_spokes unique accounts in 72h
    for hub, tx_list in outgoing_by_acc.items():
        if len(tx_list) < min_spokes:
            continue
            
        # Exclude verified payroll disbursement accounts
        if account_stats and hub in account_stats and getattr(account_stats[hub], "is_payroll", False):
            continue
            
        # Sort by timestamp
        sorted_txs = sorted(tx_list, key=lambda t: parse_dt(t.timestamp))
        
        # Sliding window
        best_window_txs = []
        best_spokes = set()
        
        n = len(sorted_txs)
        left = 0
        for right in range(n):
            t_right = parse_dt(sorted_txs[right].timestamp)
            while left <= right and (t_right - parse_dt(sorted_txs[left].timestamp)) > window_delta:
                left += 1
                
            curr_window = sorted_txs[left:right + 1]
            unique_receivers = {tx.receiver_account for tx in curr_window}
            
            if len(unique_receivers) >= min_spokes and len(unique_receivers) > len(best_spokes):
                best_spokes = unique_receivers
                best_window_txs = curr_window

        if len(best_spokes) >= min_spokes:
            fan_out_accounts.add(hub)
            total_amt = round(sum(tx.amount for tx in best_window_txs), 2)
            first_t = parse_dt(best_window_txs[0].timestamp)
            last_t = parse_dt(best_window_txs[-1].timestamp)
            duration_h = round((last_t - first_t).total_seconds() / 3600.0, 2)
            
            detected_patterns.append(
                DetectedSmurfing(
                    pattern_id=f"SMURF-FO-{len(detected_patterns) + 1:04d}",
                    pattern_type=PatternType.SMURFING_FAN_OUT,
                    hub_account=hub,
                    spoke_accounts=list(best_spokes),
                    spoke_count=len(best_spokes),
                    total_amount=total_amt,
                    time_window_hours=duration_h,
                    transactions=[tx.transaction_id for tx in best_window_txs]
                )
            )

    # 2. Detect Fan-In (Gather): Hub receives from >= min_spokes unique accounts in 72h
    for hub, tx_list in incoming_by_acc.items():
        if len(tx_list) < min_spokes:
            continue
            
        # Exclude verified merchants and utility providers
        if account_stats and hub in account_stats and getattr(account_stats[hub], "is_merchant", False):
            continue
            
        sorted_txs = sorted(tx_list, key=lambda t: parse_dt(t.timestamp))
        
        best_window_txs = []
        best_spokes = set()
        
        n = len(sorted_txs)
        left = 0
        for right in range(n):
            t_right = parse_dt(sorted_txs[right].timestamp)
            while left <= right and (t_right - parse_dt(sorted_txs[left].timestamp)) > window_delta:
                left += 1
                
            curr_window = sorted_txs[left:right + 1]
            unique_senders = {tx.sender_account for tx in curr_window}
            
            if len(unique_senders) >= min_spokes and len(unique_senders) > len(best_spokes):
                best_spokes = unique_senders
                best_window_txs = curr_window

        if len(best_spokes) >= min_spokes:
            fan_in_accounts.add(hub)
            total_amt = round(sum(tx.amount for tx in best_window_txs), 2)
            first_t = parse_dt(best_window_txs[0].timestamp)
            last_t = parse_dt(best_window_txs[-1].timestamp)
            duration_h = round((last_t - first_t).total_seconds() / 3600.0, 2)
            
            detected_patterns.append(
                DetectedSmurfing(
                    pattern_id=f"SMURF-FI-{len(detected_patterns) + 1:04d}",
                    pattern_type=PatternType.SMURFING_FAN_IN,
                    hub_account=hub,
                    spoke_accounts=list(best_spokes),
                    spoke_count=len(best_spokes),
                    total_amount=total_amt,
                    time_window_hours=duration_h,
                    transactions=[tx.transaction_id for tx in best_window_txs]
                )
            )

    # 3. Mark Scatter-Gather accounts
    scatter_gather_accounts = fan_in_accounts.intersection(fan_out_accounts)
    for sg_acc in scatter_gather_accounts:
        all_related_txs = outgoing_by_acc[sg_acc] + incoming_by_acc[sg_acc]
        spokes = {tx.sender_account for tx in incoming_by_acc[sg_acc]} | {tx.receiver_account for tx in outgoing_by_acc[sg_acc]}
        spokes.discard(sg_acc)
        total_amt = round(sum(tx.amount for tx in all_related_txs), 2)
        
        detected_patterns.append(
            DetectedSmurfing(
                pattern_id=f"SMURF-SG-{len(detected_patterns) + 1:04d}",
                pattern_type=PatternType.SMURFING_SCATTER_GATHER,
                hub_account=sg_acc,
                spoke_accounts=list(spokes),
                spoke_count=len(spokes),
                total_amount=total_amt,
                time_window_hours=72.0,
                transactions=[tx.transaction_id for tx in all_related_txs]
            )
        )

    return detected_patterns
