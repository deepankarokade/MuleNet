import pytest
from app.engine.pipeline import run_forensics_pipeline
from app.generator.test_data_generator import generate_synthetic_transactions


def test_end_to_end_pipeline():
    csv_text, ground_truth = generate_synthetic_transactions(target_count=300)
    report = run_forensics_pipeline(csv_text)
    
    assert report.report_metadata["system_status"] == "SUCCESS"
    assert report.summary["total_transactions"] >= 300
    assert report.summary["total_cycles_detected"] >= 2
    assert report.summary["total_smurfing_patterns"] >= 1
    assert report.summary["total_shell_chains"] >= 1
    assert len(report.fraud_rings) >= 1
    
    # Check cytoscape graph formatting
    assert report.graph_data is not None
    assert len(report.graph_data.nodes) > 0
    assert len(report.graph_data.edges) > 0
    
    first_node = report.graph_data.nodes[0].data
    assert hasattr(first_node, "id")
    assert hasattr(first_node, "suspicion_score")
    assert hasattr(first_node, "risk_level")
    
    first_edge = report.graph_data.edges[0].data
    assert hasattr(first_edge, "source")
    assert hasattr(first_edge, "target")
    assert hasattr(first_edge, "amount")
