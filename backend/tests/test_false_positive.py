import pytest
from datetime import datetime, timezone, timedelta
from app.models import Transaction, AccountStats
from app.engine.graph_builder import build_transaction_graph
from app.engine.cycle_detector import detect_cycles
from app.engine.shell_detector import detect_shell_networks
from app.engine.false_positive_filter import classify_false_positives
from app.engine.scoring_engine import compute_suspicion_scores


def test_merchant_dampening():
    base_time = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    merchant = "SUPER_STORE_ONLINE"
    txs = []
    
    # 25 customer purchases of varying amounts across 20 days
    for i in range(25):
        t = base_time + timedelta(days=i * 0.8)
        txs.append(
            Transaction(
                transaction_id=f"TX_SHOP_{i}",
                sender_account=f"SHOPPER_{i}",
                receiver_account=merchant,
                amount=50.0 + (i * 12.5),
                timestamp=t.isoformat()
            )
        )
    # Merchant pays wholesale vendor
    txs.append(
        Transaction(
            transaction_id="TX_VENDOR",
            sender_account=merchant,
            receiver_account="WHOLESALE_INC",
            amount=800.0,
            timestamp=(base_time + timedelta(days=22)).isoformat()
        )
    )
    
    G, stats = build_transaction_graph(txs)
    cycles = detect_cycles(G)
    shells = detect_shell_networks(G, stats)
    stats = classify_false_positives(stats, txs, cycles, shells)
    
    assert stats[merchant].is_merchant is True
    
    suspicious = compute_suspicion_scores(stats, cycles, [], shells)
    if merchant in suspicious:
        # Score must be dampened heavily (under 30)
        assert suspicious[merchant].suspicion_score < 30.0


def test_payroll_dampening():
    base_time = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    payroll = "ACME_PAYROLL_DEPT"
    txs = []
    
    # Treasury funding
    txs.append(
        Transaction(
            transaction_id="TX_TREASURY",
            sender_account="ACME_TREASURY",
            receiver_account=payroll,
            amount=100000.0,
            timestamp=base_time.isoformat()
        )
    )
    
    # Pay 15 employees
    for i in range(15):
        txs.append(
            Transaction(
                transaction_id=f"TX_SAL_{i}",
                sender_account=payroll,
                receiver_account=f"EMP_{i}",
                amount=5000.0,
                timestamp=(base_time + timedelta(hours=2, minutes=i)).isoformat()
            )
        )
        
    G, stats = build_transaction_graph(txs)
    cycles = detect_cycles(G)
    shells = detect_shell_networks(G, stats)
    stats = classify_false_positives(stats, txs, cycles, shells)
    
    assert stats[payroll].is_payroll is True
