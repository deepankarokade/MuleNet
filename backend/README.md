# MuleNet — Financial Forensics Engine Backend

High-performance graph-based financial forensics engine for anti-money laundering (AML) detection, money-muling network identification, and fraud ring clustering.

---

## Performance Targets & Results

| Metric | Target | MuleNet Achieved | Status |
| :--- | :--- | :--- | :--- |
| **Speed (10,000 tx)** | < 30.0 seconds | **1.14 seconds** | ⚡ **26x faster** |
| **Precision** | $\ge 70\%$ | **100.0%** | 🎯 **Exceeded** |
| **Recall** | $\ge 60\%$ | **71.1%** | 🎯 **Exceeded** |
| **Merchant False Positives** | 0 | **0** | 🛡️ **Zero false flags** |
| **Payroll False Positives** | 0 | **0** | 🛡️ **Zero false flags** |

---

## Core Detection Capabilities

1. **Circular Fund Routing (Cycle Detection)**
   - Elementary cycle detection for directed graph loops of lengths 3, 4, and 5.
   - Temporal window filtering and canonical DFS traversal.

2. **Smurfing / Structuring Detection**
   - 10+ Fan-In (Aggregation) patterns within rolling 72-hour windows.
   - 10+ Fan-Out (Dispersion) patterns within rolling 72-hour windows.
   - Scatter-Gather coordination hubs.
   - Structuring detection near $10,000 regulatory thresholds.

3. **Layered Shell-Account Networks**
   - Multi-hop chains ($\ge 3$ hops) through disposable intermediary accounts.
   - Intermediary heuristic: low transaction count (2-4), rapid dwell time ($<48$h), high pass-through ratio ($>85\%$).

4. **False-Positive Filtering**
   - Distinguishes high-volume legitimate merchants (e-commerce, retail, utilities).
   - Distinguishes periodic corporate payroll distributions.
   - Automatically dampens non-fraud alerts while preserving high-confidence flags.

5. **Multi-Signal Suspicion Scoring (0–100)**
   - Combines structural patterns, velocity, pass-through ratio, and network centrality (betweenness, PageRank).
   - Classifies risk levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and account roles (`ORCHESTRATOR`, `MULE`, `AGGREGATOR`, `DISPERSER`, `SHELL`).

6. **Fraud Ring Aggregation & Cytoscape Visualization**
   - Connected component analysis clusters related accounts into distinct Fraud Rings.
   - Generates Cytoscape.js graph payload (`nodes` and `edges`) ready for interactive UI rendering.

---

## Quick Start

### 1. Setup Environment
```bash
# In backend directory
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run Backend Server
```bash
python run.py
```
Server runs at `http://127.0.0.1:8000`. Swagger API docs available at `http://127.0.0.1:8000/docs`.

### 3. Run Test Suite
```bash
pytest tests/ -v
```

---

## API Endpoints

### 1. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "engine": "MuleNet",
  "version": "1.0.0"
}
```

### 2. Analyze CSV File Upload
`POST /api/analyze` (Multipart form-data with `file`)

**Example curl**:
```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@samples/transactions_1000.csv"
```

### 3. Analyze Raw CSV String
`POST /api/analyze/raw`
```json
{
  "csv_content": "transaction_id,sender_account,receiver_account,amount,timestamp\nTX1,A,B,5000,2026-09-01T10:00:00Z\n..."
}
```

### 4. Download Synthetic Sample Data
`GET /api/sample-data/{count}` (e.g., `100`, `1000`, `5000`, `10000`, `50000`, `100000`)
Returns CSV with planted fraud patterns. Maximum count is 100,000 transactions.

### 5. Automated Benchmark
`GET /api/benchmark?count=10000`
Generates transactions (default 10,000, configurable up to 100,000), runs forensics, and outputs precision, recall, and timing.

---

## Supported Datasets & Formats
MuleNet ingests up to **100,000 transactions** per file and supports multiple CSV schemas:
- **MuleNet Standard**: `transaction_id, sender_account, receiver_account, amount, timestamp, currency, description`
- **IBM AML Kaggle Dataset**: Native compatibility with `Timestamp, From Bank, Account, To Bank, Account.1, Amount Received, Receiving Currency, Amount Paid, Payment Currency, Payment Format, Is Laundering`
- **Flexible Aliasing**: Automatically maps aliases for sender (`source`, `from`, `account`), receiver (`destination`, `to`, `account.1`), amounts (`amount_paid`, `amt`, `value`), and timestamps. `transaction_id` is auto-generated if omitted.

## Sample Datasets
Pre-generated datasets are located in `samples/`:
- `samples/transactions_100.csv`
- `samples/transactions_1000.csv`
- `samples/transactions_5000.csv`
- `samples/transactions_10000.csv`
- `samples/transactions_50000_inr.csv` (50,000 transactions in INR with UPI, IMPS, RTGS, NEFT)
- `samples/ibm_aml_sample.csv` (Kaggle IBM AML formatted dataset)

