import networkx as nx
from typing import List, Dict, Set, Tuple, Optional
from app.models import DetectedShellChain, AccountStats
from app.core.config import settings
from datetime import datetime, timezone


def detect_shell_networks(
    G: nx.DiGraph,
    account_stats: Dict[str, AccountStats],
    min_hops: int = settings.SHELL_MIN_CHAIN_HOPS,
    cycle_accounts: Optional[Set[str]] = None
) -> List[DetectedShellChain]:
    """
    Detects layered shell-account networks:
    Chains of 3+ hops (>= 2 intermediaries) where each intermediary account exhibits
    shell-company behavior: low transaction count (2-4 total), high pass-through ratio (>80%),
    and rapid forwarding.
    
    Filters out legitimate merchants, corporate payrolls, and cycle loops to avoid false positives.
    Deduplicates subpaths so that only maximal non-redundant shell chains are reported.
    """
    cycle_set = cycle_accounts or set()
    shell_candidates: Set[str] = set()
    
    # 1. Identify shell candidate accounts
    for acc_id, stats in account_stats.items():
        # Merchants, payrolls, and cycle participants are not disposable shell intermediaries
        if stats.is_merchant or stats.is_payroll or acc_id in cycle_set:
            continue
            
        total_tx = stats.tx_in_count + stats.tx_out_count
        # Shells have very few transactions (2 to 4)
        if 2 <= total_tx <= settings.SHELL_MAX_TOTAL_TX:
            if stats.in_degree >= 1 and stats.out_degree >= 1:
                # Pass-through check: retains little to no funds, significant volume, rapid turnover
                is_pass_through = stats.turnover_ratio >= settings.SHELL_MIN_PASS_THROUGH_RATIO
                has_shell_volume = min(stats.total_received, stats.total_sent) >= 2500.0
                is_rapid = stats.active_span_hours <= settings.SHELL_MAX_DWELL_HOURS
                
                if is_pass_through and has_shell_volume and is_rapid:
                    shell_candidates.add(acc_id)

    if not shell_candidates:
        return []

    candidate_chains: List[DetectedShellChain] = []
    seen_chain_tuples: Set[Tuple[str, ...]] = set()

    # 2. Search for directed paths passing through 2 to 3 shell accounts
    # Path: Origin -> Shell_1 -> Shell_2 (-> Shell_3) -> Destination
    for shell_start in shell_candidates:
        # Predecessors of shell_start could be the origin (exclude merchants/payrolls/cycles)
        origins = [
            u for u in G.predecessors(shell_start)
            if not (account_stats.get(u) and (account_stats[u].is_merchant or account_stats[u].is_payroll or u in cycle_set))
        ]
        
        # DFS to find forward chains through shell candidates
        # Stack: (current_node, [shell_nodes_in_chain])
        stack = [(shell_start, [shell_start])]
        
        while stack:
            curr_shell, chain_shells = stack.pop()
            
            # If we reached 2 or 3 shell intermediaries, look at their successors
            if len(chain_shells) >= 2:
                for dest in G.successors(curr_shell):
                    if dest not in chain_shells:
                        # Exclude merchants, payrolls, and cycle accounts from being shell endpoints
                        if account_stats.get(dest) and (account_stats[dest].is_merchant or account_stats[dest].is_payroll or dest in cycle_set):
                            continue
                            
                        for origin in origins:
                            if origin != dest and origin not in chain_shells:
                                full_path = tuple([origin] + chain_shells + [dest])
                                if full_path not in seen_chain_tuples:
                                    seen_chain_tuples.add(full_path)
                                    
                                    # Collect chain metrics
                                    tx_ids = []
                                    amounts = []
                                    timestamps = []
                                    
                                    for i in range(len(full_path) - 1):
                                        u = full_path[i]
                                        v = full_path[i + 1]
                                        edge_data = G.get_edge_data(u, v, default={})
                                        amounts.append(edge_data.get("weight", 0.0))
                                        for tx in edge_data.get("transactions", []):
                                            tx_ids.append(tx.transaction_id)
                                            try:
                                                dt = datetime.fromisoformat(tx.timestamp.replace("Z", "+00:00"))
                                                timestamps.append(dt)
                                            except Exception:
                                                pass
                                                
                                    span_h = 0.0
                                    if timestamps:
                                        span_h = round((max(timestamps) - min(timestamps)).total_seconds() / 3600.0, 2)
                                        
                                    avg_ratio = round(
                                        sum(account_stats[s].turnover_ratio for s in chain_shells) / len(chain_shells),
                                        4
                                    )
                                    
                                    chain_obj = DetectedShellChain(
                                        chain_id="",
                                        source_account=origin,
                                        destination_account=dest,
                                        intermediary_shells=list(chain_shells),
                                        hop_count=len(full_path) - 1,
                                        total_amount=round(min(amounts), 2) if amounts else 0.0,
                                        avg_pass_through_ratio=avg_ratio,
                                        span_hours=span_h,
                                        transactions=list(set(tx_ids))
                                    )
                                    candidate_chains.append(chain_obj)

            # Continue extending chain if we have fewer than max intermediaries
            if len(chain_shells) < settings.SHELL_MAX_INTERMEDIARIES:
                for next_node in G.successors(curr_shell):
                    if next_node in shell_candidates and next_node not in chain_shells:
                        stack.append((next_node, chain_shells + [next_node]))

    # 3. Maximal Path Deduplication: Prune overlapping subpaths of longer detected chains
    candidate_chains.sort(key=lambda c: (c.hop_count, c.total_amount), reverse=True)
    detected_chains: List[DetectedShellChain] = []

    for cand in candidate_chains:
        cand_interms = set(cand.intermediary_shells)
        cand_path = [cand.source_account] + cand.intermediary_shells + [cand.destination_account]
        cand_tuple = tuple(cand_path)
        
        is_redundant = False
        for accepted in detected_chains:
            acc_interms = set(accepted.intermediary_shells)
            acc_path = [accepted.source_account] + accepted.intermediary_shells + [accepted.destination_account]
            acc_tuple = tuple(acc_path)
            
            # If candidate's intermediaries are completely contained in an accepted longer chain
            if cand_interms.issubset(acc_interms):
                is_redundant = True
                break
                
            # If candidate's full path is a contiguous subsegment of an accepted chain
            if len(cand_tuple) < len(acc_tuple):
                for i in range(len(acc_tuple) - len(cand_tuple) + 1):
                    if acc_tuple[i:i + len(cand_tuple)] == cand_tuple:
                        is_redundant = True
                        break
            if is_redundant:
                break
                
        if not is_redundant:
            cand.chain_id = f"SHELL-{len(detected_chains) + 1:04d}"
            detected_chains.append(cand)

    return detected_chains
