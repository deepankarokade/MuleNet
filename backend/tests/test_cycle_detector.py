import pytest
import networkx as nx
from datetime import datetime, timezone
from app.models import Transaction
from app.engine.graph_builder import build_transaction_graph
from app.engine.cycle_detector import detect_cycles


def make_tx(tx_id: str, sender: str, receiver: str, amt: float) -> Transaction:
    return Transaction(
        transaction_id=tx_id,
        sender_account=sender,
        receiver_account=receiver,
        amount=amt,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


def test_detect_length_3_cycle():
    txs = [
        make_tx("T1", "ACC_A", "ACC_B", 1000.0),
        make_tx("T2", "ACC_B", "ACC_C", 1000.0),
        make_tx("T3", "ACC_C", "ACC_A", 1000.0),
    ]
    G, _ = build_transaction_graph(txs)
    cycles = detect_cycles(G, min_len=3, max_len=5)
    
    assert len(cycles) == 1
    assert cycles[0].length == 3
    assert set(cycles[0].accounts) == {"ACC_A", "ACC_B", "ACC_C"}
    assert cycles[0].total_amount == 3000.0


def test_detect_length_4_cycle():
    txs = [
        make_tx("T1", "ACC_A", "ACC_B", 2000.0),
        make_tx("T2", "ACC_B", "ACC_C", 2000.0),
        make_tx("T3", "ACC_C", "ACC_D", 2000.0),
        make_tx("T4", "ACC_D", "ACC_A", 2000.0),
    ]
    G, _ = build_transaction_graph(txs)
    cycles = detect_cycles(G, min_len=3, max_len=5)
    
    assert len(cycles) == 1
    assert cycles[0].length == 4
    assert set(cycles[0].accounts) == {"ACC_A", "ACC_B", "ACC_C", "ACC_D"}


def test_detect_length_5_cycle():
    nodes = ["N1", "N2", "N3", "N4", "N5"]
    txs = [make_tx(f"T{i}", nodes[i], nodes[(i+1)%5], 500.0) for i in range(5)]
    G, _ = build_transaction_graph(txs)
    cycles = detect_cycles(G, min_len=3, max_len=5)
    
    assert len(cycles) == 1
    assert cycles[0].length == 5
    assert set(cycles[0].accounts) == set(nodes)


def test_acyclic_graph_returns_no_cycles():
    txs = [
        make_tx("T1", "ACC_A", "ACC_B", 100.0),
        make_tx("T2", "ACC_B", "ACC_C", 100.0),
        make_tx("T3", "ACC_C", "ACC_D", 100.0),
    ]
    G, _ = build_transaction_graph(txs)
    cycles = detect_cycles(G, min_len=3, max_len=5)
    assert len(cycles) == 0
