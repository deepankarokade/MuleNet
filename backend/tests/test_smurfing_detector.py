import pytest
from datetime import datetime, timezone, timedelta
from app.models import Transaction, PatternType
from app.engine.graph_builder import build_transaction_graph
from app.engine.smurfing_detector import detect_smurfing


def test_fan_in_detection():
    base_time = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    hub = "AGGREGATOR_ACC"
    txs = []
    
    # 12 unique senders sending within 24 hours
    for i in range(1, 13):
        t = base_time + timedelta(hours=i)
        txs.append(
            Transaction(
                transaction_id=f"TX_IN_{i}",
                sender_account=f"SENDER_{i}",
                receiver_account=hub,
                amount=9500.0,
                timestamp=t.isoformat()
            )
        )
        
    G, _ = build_transaction_graph(txs)
    patterns = detect_smurfing(G, txs, min_spokes=10, window_hours=72.0)
    
    assert len(patterns) >= 1
    fan_ins = [p for p in patterns if p.pattern_type == PatternType.SMURFING_FAN_IN]
    assert len(fan_ins) == 1
    assert fan_ins[0].hub_account == hub
    assert fan_ins[0].spoke_count == 12


def test_fan_out_detection():
    base_time = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    hub = "DISPERSER_ACC"
    txs = []
    
    # Hub sending to 11 unique recipients within 18 hours
    for i in range(1, 12):
        t = base_time + timedelta(hours=i)
        txs.append(
            Transaction(
                transaction_id=f"TX_OUT_{i}",
                sender_account=hub,
                receiver_account=f"RECIPIENT_{i}",
                amount=4500.0,
                timestamp=t.isoformat()
            )
        )
        
    G, _ = build_transaction_graph(txs)
    patterns = detect_smurfing(G, txs, min_spokes=10, window_hours=72.0)
    
    assert len(patterns) >= 1
    fan_outs = [p for p in patterns if p.pattern_type == PatternType.SMURFING_FAN_OUT]
    assert len(fan_outs) == 1
    assert fan_outs[0].hub_account == hub
    assert fan_outs[0].spoke_count == 11


def test_no_smurfing_if_outside_72h_window():
    base_time = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    hub = "NORMAL_SLOW_ACC"
    txs = []
    
    # 12 transactions spread over 30 days (1 transaction every 2.5 days)
    for i in range(1, 13):
        t = base_time + timedelta(days=i * 2.5)
        txs.append(
            Transaction(
                transaction_id=f"TX_SLOW_{i}",
                sender_account=f"SLOW_SENDER_{i}",
                receiver_account=hub,
                amount=100.0,
                timestamp=t.isoformat()
            )
        )
        
    G, _ = build_transaction_graph(txs)
    patterns = detect_smurfing(G, txs, min_spokes=10, window_hours=72.0)
    
    assert len(patterns) == 0
