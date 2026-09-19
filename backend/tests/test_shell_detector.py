import pytest
from datetime import datetime, timezone, timedelta
from app.models import Transaction
from app.engine.graph_builder import build_transaction_graph
from app.engine.shell_detector import detect_shell_networks


def test_detect_shell_network_chain():
    base_time = datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc)
    
    # Path: Origin -> Shell_1 -> Shell_2 -> Shell_3 -> Destination
    txs = [
        Transaction(
            transaction_id="TX_S1",
            sender_account="ORIGIN_ACC",
            receiver_account="SHELL_1",
            amount=50000.0,
            timestamp=base_time.isoformat()
        ),
        Transaction(
            transaction_id="TX_S2",
            sender_account="SHELL_1",
            receiver_account="SHELL_2",
            amount=49800.0,
            timestamp=(base_time + timedelta(hours=3)).isoformat()
        ),
        Transaction(
            transaction_id="TX_S3",
            sender_account="SHELL_2",
            receiver_account="SHELL_3",
            amount=49500.0,
            timestamp=(base_time + timedelta(hours=6)).isoformat()
        ),
        Transaction(
            transaction_id="TX_S4",
            sender_account="SHELL_3",
            receiver_account="DEST_ACC",
            amount=49200.0,
            timestamp=(base_time + timedelta(hours=9)).isoformat()
        ),
    ]
    
    G, stats = build_transaction_graph(txs)
    chains = detect_shell_networks(G, stats, min_hops=3)
    
    assert len(chains) >= 1
    # Check that shell intermediaries are detected
    matching = [c for c in chains if "SHELL_1" in c.intermediary_shells and "SHELL_2" in c.intermediary_shells]
    assert len(matching) >= 1
    assert matching[0].hop_count >= 3


def test_high_activity_path_not_flagged_as_shell():
    # If intermediaries have 50 transactions, they are not disposable shells
    txs = []
    base_time = datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc)
    
    txs.append(Transaction(transaction_id="TX1", sender_account="A", receiver_account="BUSY_1", amount=1000.0, timestamp=base_time.isoformat()))
    # Add 15 miscellaneous transactions to BUSY_1
    for i in range(15):
        txs.append(Transaction(transaction_id=f"TX_BUSY_{i}", sender_account="BUSY_1", receiver_account=f"OTHER_{i}", amount=10.0, timestamp=base_time.isoformat()))
    
    txs.append(Transaction(transaction_id="TX2", sender_account="BUSY_1", receiver_account="BUSY_2", amount=1000.0, timestamp=base_time.isoformat()))
    txs.append(Transaction(transaction_id="TX3", sender_account="BUSY_2", receiver_account="C", amount=1000.0, timestamp=base_time.isoformat()))
    
    G, stats = build_transaction_graph(txs)
    chains = detect_shell_networks(G, stats, min_hops=3)
    
    # BUSY_1 has > 4 transactions so it's not a shell candidate
    shell_interms = [c for c in chains if "BUSY_1" in c.intermediary_shells]
    assert len(shell_interms) == 0
