import csv
import io
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any
from app.models import Transaction
from app.core.config import settings


COLUMN_ALIASES = {
    "transaction_id": ["transaction_id", "txn_id", "tx_id", "id", "trans_id", "txid"],
    "sender_account": ["sender_account", "sender_id", "sender", "source_account", "source", "from_account", "from_acc", "from", "src", "account"],
    "receiver_account": ["receiver_account", "receiver_id", "receiver", "destination_account", "destination", "to_account", "to_acc", "to", "dst", "target", "account.1", "account_1"],
    "amount": ["amount", "txn_amount", "tx_amount", "value", "amt", "sum", "amount_paid", "amount_received"],
    "timestamp": ["timestamp", "tx_timestamp", "txn_timestamp", "date", "datetime", "time", "date_time", "created_at"]
}

REQUIRED_COLUMNS = ["sender_account", "receiver_account", "amount", "timestamp"]

OPTIONAL_ALIASES = {
    "currency": ["currency", "curr", "ccy", "payment_currency", "receiving_currency"],
    "sender_name": ["sender_name", "sender_owner", "source_name"],
    "receiver_name": ["receiver_name", "receiver_owner", "destination_name"],
    "description": ["description", "memo", "note", "narrative", "remark", "payment_format"]
}


def parse_timestamp(ts_val: Any) -> Tuple[datetime, str]:
    if isinstance(ts_val, (int, float)):
        # Epoch timestamp
        if ts_val > 1e11:  # Milliseconds
            dt = datetime.fromtimestamp(ts_val / 1000.0, tz=timezone.utc)
        else:
            dt = datetime.fromtimestamp(ts_val, tz=timezone.utc)
        return dt, dt.isoformat()
    
    ts_str = str(ts_val).strip()
    # Try numeric string (epoch)
    try:
        val_float = float(ts_str)
        if val_float > 1e11:
            dt = datetime.fromtimestamp(val_float / 1000.0, tz=timezone.utc)
        elif val_float > 1e8:
            dt = datetime.fromtimestamp(val_float, tz=timezone.utc)
        else:
            dt = None
        if dt:
            return dt, dt.isoformat()
    except ValueError:
        pass

    # Clean string
    clean_str = ts_str.replace("Z", "+00:00")
    
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(clean_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt, dt.isoformat()
        except ValueError:
            continue
            
    # Fallback to current time if unparseable
    now = datetime.now(timezone.utc)
    return now, now.isoformat()


def resolve_header_mapping(headers: List[str]) -> Dict[str, str]:
    normalized_headers = {h.lower().strip().replace(" ", "_").replace("-", "_"): h for h in headers}
    mapping = {}
    
    for canon_name, aliases in COLUMN_ALIASES.items():
        found = None
        for alias in aliases:
            if alias in normalized_headers:
                found = normalized_headers[alias]
                break
        if not found:
            if canon_name in REQUIRED_COLUMNS:
                detected_cols = ", ".join(f"'{h}'" for h in headers[:6])
                if len(headers) > 6:
                    detected_cols += f", ... ({len(headers) - 6} more)"
                raise ValueError(
                    f"Incompatible dataset schema: Missing required CSV column for '{canon_name}'. "
                    f"MuleNet expects financial transaction records with sender, receiver, amount, and timestamp. "
                    f"Detected columns in file: [{detected_cols}]. "
                    f"Accepted header aliases for '{canon_name}': {', '.join(aliases[:5])}."
                )
        else:
            mapping[canon_name] = found
        
    for canon_name, aliases in OPTIONAL_ALIASES.items():
        for alias in aliases:
            if alias in normalized_headers:
                mapping[canon_name] = normalized_headers[alias]
                break
                
    return mapping


def parse_and_validate_csv(csv_content: str) -> List[Transaction]:
    """
    Parses and validates CSV content string.
    Enforces maximum transaction limit (100,000), checks column headers and data types.
    """
    f = io.StringIO(csv_content.strip())
    reader = csv.reader(f)
    
    try:
        raw_headers = next(reader)
    except StopIteration:
        raise ValueError("The uploaded CSV file is empty.")
        
    mapping = resolve_header_mapping(raw_headers)
    
    # Map header names to column index
    header_to_idx = {h: idx for idx, h in enumerate(raw_headers)}
    tx_id_col = mapping.get("transaction_id")
    tx_id_idx = header_to_idx[tx_id_col] if tx_id_col else None
    sender_idx = header_to_idx[mapping["sender_account"]]
    receiver_idx = header_to_idx[mapping["receiver_account"]]
    amount_idx = header_to_idx[mapping["amount"]]
    timestamp_idx = header_to_idx[mapping["timestamp"]]
    
    curr_idx = header_to_idx.get(mapping.get("currency"))
    sname_idx = header_to_idx.get(mapping.get("sender_name"))
    rname_idx = header_to_idx.get(mapping.get("receiver_name"))
    desc_idx = header_to_idx.get(mapping.get("description"))

    transactions: List[Transaction] = []
    seen_tx_ids = set()
    row_count = 0

    for row_idx, row in enumerate(reader, start=2):
        if not row or all(c.strip() == "" for c in row):
            continue
            
        row_count += 1
        if row_count > settings.MAX_TRANSACTIONS:
            raise ValueError(
                f"Transaction limit exceeded: Dataset contains more than {settings.MAX_TRANSACTIONS} transactions. "
                f"Please limit the file to {settings.MAX_TRANSACTIONS} transactions."
            )
            
        try:
            raw_tx_id = row[tx_id_idx].strip() if tx_id_idx is not None and tx_id_idx < len(row) else ""
            sender = row[sender_idx].strip()
            receiver = row[receiver_idx].strip()
            amount_str = row[amount_idx].strip().replace("$", "").replace(",", "")
            raw_ts = row[timestamp_idx].strip()
        except IndexError:
            raise ValueError(f"Malformed row at line {row_idx}: incomplete columns.")
            
        if not raw_tx_id:
            raw_tx_id = f"TXN-{row_count:06d}"
        if raw_tx_id in seen_tx_ids:
            raw_tx_id = f"{raw_tx_id}_dup_{row_count}"
        seen_tx_ids.add(raw_tx_id)
        
        if not sender or not receiver:
            raise ValueError(f"Line {row_idx}: Sender and Receiver accounts cannot be empty.")
            
        try:
            amount = float(amount_str)
        except ValueError:
            raise ValueError(f"Line {row_idx}: Invalid numeric amount '{amount_str}'.")

        if amount <= 0:
            raise ValueError(f"Line {row_idx}: Amount must be strictly greater than 0, got {amount}.")
            
        _, iso_ts = parse_timestamp(raw_ts)
        
        tx = Transaction(
            transaction_id=raw_tx_id,
            sender_account=sender,
            receiver_account=receiver,
            amount=round(amount, 2),
            timestamp=iso_ts,
            raw_timestamp=raw_ts,
            currency=row[curr_idx].strip() if curr_idx is not None and curr_idx < len(row) else "USD",
            sender_name=row[sname_idx].strip() if sname_idx is not None and sname_idx < len(row) else None,
            receiver_name=row[rname_idx].strip() if rname_idx is not None and rname_idx < len(row) else None,
            description=row[desc_idx].strip() if desc_idx is not None and desc_idx < len(row) else None
        )
        transactions.append(tx)

    if not transactions:
        raise ValueError("No valid transactions found in the CSV.")

    return transactions
