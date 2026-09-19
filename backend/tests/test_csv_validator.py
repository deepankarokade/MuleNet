import pytest
from app.engine.csv_validator import parse_and_validate_csv
from app.core.config import settings


def test_valid_csv_parsing():
    csv_data = """transaction_id,sender_account,receiver_account,amount,timestamp
TX001,ACC_A,ACC_B,1500.00,2026-09-01T10:00:00Z
TX002,ACC_B,ACC_C,1400.00,2026-09-01T12:00:00Z
"""
    txs = parse_and_validate_csv(csv_data)
    assert len(txs) == 2
    assert txs[0].transaction_id == "TX001"
    assert txs[0].sender_account == "ACC_A"
    assert txs[0].receiver_account == "ACC_B"
    assert txs[0].amount == 1500.00


def test_column_alias_support():
    csv_data = """id,source,destination,value,date
T100,ACC_1,ACC_2,500.50,2026-09-02 14:30:00
"""
    txs = parse_and_validate_csv(csv_data)
    assert len(txs) == 1
    assert txs[0].transaction_id == "T100"
    assert txs[0].sender_account == "ACC_1"
    assert txs[0].receiver_account == "ACC_2"
    assert txs[0].amount == 500.50


def test_invalid_negative_amount():
    csv_data = """transaction_id,sender_account,receiver_account,amount,timestamp
TX001,ACC_A,ACC_B,-100.00,2026-09-01T10:00:00Z
"""
    with pytest.raises(ValueError, match="Amount must be strictly greater than 0"):
        parse_and_validate_csv(csv_data)


def test_empty_csv_error():
    with pytest.raises(ValueError, match="empty"):
        parse_and_validate_csv("")


def test_missing_column_error():
    csv_data = """transaction_id,sender_account,amount,timestamp
TX001,ACC_A,100.00,2026-09-01T10:00:00Z
"""
    with pytest.raises(ValueError, match="Missing required CSV column for 'receiver_account'"):
        parse_and_validate_csv(csv_data)


def test_exceed_max_transaction_limit():
    header = "transaction_id,sender_account,receiver_account,amount,timestamp\n"
    # Generate rows exceeding MAX_TRANSACTIONS
    rows = [f"TX{i},ACC_A,ACC_B,10.00,2026-09-01T10:00:00Z" for i in range(1, settings.MAX_TRANSACTIONS + 2)]
    large_csv = header + "\n".join(rows)
    with pytest.raises(ValueError, match="Transaction limit exceeded"):
        parse_and_validate_csv(large_csv)


def test_optional_transaction_id():
    csv_data = """sender_account,receiver_account,amount,timestamp
ACC_A,ACC_B,250.00,2026-09-01T10:00:00Z
ACC_B,ACC_C,350.00,2026-09-01T11:00:00Z
"""
    txs = parse_and_validate_csv(csv_data)
    assert len(txs) == 2
    assert txs[0].transaction_id == "TXN-000001"
    assert txs[1].transaction_id == "TXN-000002"
    assert txs[0].sender_account == "ACC_A"
    assert txs[0].receiver_account == "ACC_B"
    assert txs[0].amount == 250.00


def test_ibm_aml_column_compatibility():
    csv_data = """Timestamp, From Bank, Account, To Bank, Account.1, Amount Received, Receiving Currency, Amount Paid, Payment Currency, Payment Format, Is Laundering
2022/09/01 00:20, 10, 8000, 12, 8001, 1000.00, US Dollar, 1000.00, US Dollar, Cheque, 0
2022/09/01 01:15, 12, 8001, 14, 8002, 950.00, US Dollar, 950.00, US Dollar, Credit Card, 1
"""
    txs = parse_and_validate_csv(csv_data)
    assert len(txs) == 2
    assert txs[0].transaction_id == "TXN-000001"
    assert txs[0].sender_account == "8000"
    assert txs[0].receiver_account == "8001"
    assert txs[0].amount == 1000.00
    assert txs[0].currency == "US Dollar"
    assert "2022-09-01" in txs[0].timestamp
    assert txs[1].transaction_id == "TXN-000002"
    assert txs[1].sender_account == "8001"
    assert txs[1].receiver_account == "8002"
    assert txs[1].amount == 950.00

