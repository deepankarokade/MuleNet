import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_investigate_endpoint():
    # 1. Run analysis on a structured laundering chain
    csv_data = """transaction_id,sender_account,receiver_account,amount,timestamp
TX01,DIRTY_ORIGIN,SHELL_1,100000.0,2026-09-01T10:00:00Z
TX02,SHELL_1,SHELL_2,98000.0,2026-09-01T12:30:00Z
TX03,SHELL_2,SHELL_3,96000.0,2026-09-01T15:00:00Z
TX04,SHELL_3,CASHOUT_VAULT,94500.0,2026-09-01T17:00:00Z
"""
    analyze_res = client.post("/api/analyze/raw", json={"csv_content": csv_data})
    assert analyze_res.status_code == 200
    report = analyze_res.json()
    assert report["summary"]["total_transactions"] == 4

    # 2. Query investigation dossier for intermediary SHELL_1
    inv_res = client.post("/api/investigate", json={"account_id": "SHELL_1"})
    assert inv_res.status_code == 200
    dossier = inv_res.json()

    assert dossier["account_id"] == "SHELL_1"
    assert dossier["suspicion_score"] > 0
    assert dossier["role"] in ["SUSPICIOUS_INTERMEDIARY", "SHELL", "MULE"]

    # Verify downstream trail
    assert len(dossier["downstream_traces"]) >= 1
    down_path = dossier["downstream_traces"][0]
    assert down_path["direction"] == "DOWNSTREAM"
    assert down_path["source_node"] == "SHELL_1"
    assert len(down_path["hops"]) >= 1
    
    first_hop = down_path["hops"][0]
    assert first_hop["from_account"] == "SHELL_1"
    assert first_hop["to_account"] == "SHELL_2"
    assert first_hop["amount"] == 98000.0
    assert first_hop["to_account_score"] >= 0

    # Verify upstream trail
    assert len(dossier["upstream_traces"]) >= 1
    up_path = dossier["upstream_traces"][0]
    assert up_path["direction"] == "UPSTREAM"
    assert up_path["target_node"] == "SHELL_1"
    assert up_path["hops"][0]["from_account"] == "DIRTY_ORIGIN"
    assert up_path["hops"][0]["amount"] == 100000.0

    # Verify SAR compliance narrative
    assert "### FORENSIC DOSSIER & SAR INVESTIGATION SUMMARY" in dossier["case_narrative"]
    assert "SHELL_1" in dossier["case_narrative"]
    assert "Suspicious Activity Report (SAR)" in dossier["case_narrative"]

    # Verify score_breakdown and evidence_points
    assert "score_breakdown" in dossier
    assert "evidence_points" in dossier
    assert isinstance(dossier["score_breakdown"], dict)
    assert isinstance(dossier["evidence_points"], list)
    assert len(dossier["evidence_points"]) > 0

    # Verify Cytoscape graph nodes have score_breakdown and evidence_points
    for node in report["graph_data"]["nodes"]:
        assert "score_breakdown" in node["data"]
        assert "evidence_points" in node["data"]


def test_investigate_unknown_account():
    inv_res = client.post("/api/investigate", json={"account_id": "NON_EXISTENT_ACC"})
    assert inv_res.status_code == 200
    dossier = inv_res.json()
    assert dossier["account_id"] == "NON_EXISTENT_ACC"
    assert dossier["suspicion_score"] == 0.0
    assert dossier["risk_level"] == "LOW"
    assert len(dossier["downstream_traces"]) == 0
    assert len(dossier["upstream_traces"]) == 0
