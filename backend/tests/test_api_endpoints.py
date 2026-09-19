from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "MuleNet"


def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ONLINE"


def test_sample_data_download():
    res = client.get("/api/sample-data/100")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "transaction_id,sender_account" in res.text


def test_analyze_raw_endpoint():
    csv_data = """transaction_id,sender_account,receiver_account,amount,timestamp
TX01,ACC_1,ACC_2,1000.0,2026-09-01T10:00:00Z
TX02,ACC_2,ACC_3,1000.0,2026-09-01T12:00:00Z
TX03,ACC_3,ACC_1,1000.0,2026-09-01T14:00:00Z
"""
    res = client.post("/api/analyze/raw", json={"csv_content": csv_data})
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_transactions"] == 3
    assert data["summary"]["total_cycles_detected"] == 1
    assert len(data["fraud_rings"]) == 1
    assert data["fraud_rings"][0]["primary_pattern"] == "Circular Routing (Cycle)"
    assert data["graph_data"] is not None
    assert len(data["graph_data"]["nodes"]) == 3
    assert len(data["graph_data"]["edges"]) == 3


def test_analyze_file_upload_endpoint():
    csv_bytes = b"""transaction_id,sender_account,receiver_account,amount,timestamp
TX1,ACC_X,ACC_Y,500.0,2026-09-01T08:00:00Z
TX2,ACC_Y,ACC_Z,500.0,2026-09-01T09:00:00Z
TX3,ACC_Z,ACC_X,500.0,2026-09-01T10:00:00Z
"""
    files = {"file": ("transactions.csv", csv_bytes, "text/csv")}
    res = client.post("/api/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_transactions"] == 3
    assert data["summary"]["total_cycles_detected"] == 1


def test_benchmark_endpoint():
    res = client.get("/api/benchmark?count=500")
    assert res.status_code == 200
    data = res.json()
    assert data["benchmark_summary"]["transactions_analyzed"] == 500
    assert data["benchmark_summary"]["speed_target_met (<30s)"] is True
    assert data["benchmark_summary"]["precision_target_met (>=70%)"] is True
