import networkx as nx
from typing import List, Dict, Set, Tuple
from app.models import DetectedCycle
from app.core.config import settings
from datetime import datetime, timezone


def detect_cycles(G: nx.DiGraph, min_len: int = 3, max_len: int = 5) -> List[DetectedCycle]:
    """
    Detects all elementary directed cycles of length between min_len and max_len (inclusive).
    Uses canonical DFS pruning: only visits nodes strictly greater than the start node,
    ensuring each cycle is found exactly once and running in milliseconds.
    """
    nodes = sorted(list(G.nodes()))
    node_to_idx = {n: i for i, n in enumerate(nodes)}
    
    detected_cycles: List[DetectedCycle] = []
    seen_canonical_cycles: Set[Tuple[str, ...]] = set()

    def get_canonical_cycle(path: List[str]) -> Tuple[str, ...]:
        min_idx = path.index(min(path))
        return tuple(path[min_idx:] + path[:min_idx])

    for start_node in nodes:
        start_idx = node_to_idx[start_node]
        
        # Stack: (current_node, current_path, current_visited_set)
        stack = [(start_node, [start_node], {start_node})]
        
        while stack:
            curr_node, path, visited = stack.pop()
            path_len = len(path)
            
            # Check neighbors
            for neighbor in G.successors(curr_node):
                if neighbor == start_node:
                    # Found a cycle back to start
                    if min_len <= path_len <= max_len:
                        canonical = get_canonical_cycle(path)
                        if canonical not in seen_canonical_cycles:
                            seen_canonical_cycles.add(canonical)
                            
                            # Gather metrics on this cycle
                            cycle_tx_ids = []
                            edge_amounts = []
                            timestamps = []
                            
                            for i in range(len(path)):
                                u = path[i]
                                v = path[(i + 1) % len(path)]
                                edge_data = G.get_edge_data(u, v, default={})
                                edge_amt = edge_data.get("weight", 0.0)
                                edge_amounts.append(edge_amt)
                                
                                for tx in edge_data.get("transactions", []):
                                    cycle_tx_ids.append(tx.transaction_id)
                                    try:
                                        dt = datetime.fromisoformat(tx.timestamp.replace("Z", "+00:00"))
                                        timestamps.append(dt)
                                    except Exception:
                                        pass
                            
                            span_hours = 0.0
                            start_time_iso = None
                            end_time_iso = None
                            if timestamps:
                                min_dt = min(timestamps)
                                max_dt = max(timestamps)
                                start_time_iso = min_dt.isoformat()
                                end_time_iso = max_dt.isoformat()
                                span_hours = round((max_dt - min_dt).total_seconds() / 3600.0, 2)
                                
                            total_amount = round(sum(edge_amounts), 2)
                            
                            # Skip cycles that span unrealistically long periods (> 30 days)
                            if span_hours <= settings.MAX_CYCLE_TIME_WINDOW_HOURS:
                                cycle_obj = DetectedCycle(
                                    cycle_id=f"CYC-{len(detected_cycles) + 1:04d}",
                                    length=path_len,
                                    accounts=list(canonical),
                                    total_amount=total_amount,
                                    start_time=start_time_iso,
                                    end_time=end_time_iso,
                                    span_hours=span_hours,
                                    transactions=list(set(cycle_tx_ids))
                                )
                                detected_cycles.append(cycle_obj)
                                
                elif neighbor not in visited and path_len < max_len:
                    # Pruning rule: only visit nodes with index >= start_idx
                    if node_to_idx.get(neighbor, -1) >= start_idx:
                        new_visited = set(visited)
                        new_visited.add(neighbor)
                        stack.append((neighbor, path + [neighbor], new_visited))

    # Sort detected cycles by total amount descending
    detected_cycles.sort(key=lambda c: c.total_amount, reverse=True)
    return detected_cycles
