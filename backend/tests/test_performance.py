import pytest
import time
from app.engine.pipeline import run_forensics_pipeline
from app.generator.test_data_generator import generate_synthetic_transactions


def test_10k_transactions_performance_and_accuracy():
    """
    Validates performance and accuracy against hackathon requirements:
    1. Runtime < 30 seconds for 10,000 transactions
    2. Precision >= 70%
    3. Recall >= 60%
    4. Zero false-positive flags on legitimate merchants & payroll accounts
    """
    print("\n--- Generating 10,000 synthetic transactions with planted patterns ---")
    gen_start = time.perf_counter()
    csv_text, ground_truth = generate_synthetic_transactions(target_count=10000)
    gen_time = time.perf_counter() - gen_start
    print(f"Dataset generated in {gen_time:.2f}s")
    
    print("--- Running MuleNet Forensics Analysis Pipeline ---")
    start = time.perf_counter()
    report = run_forensics_pipeline(csv_text)
    duration = time.perf_counter() - start
    print(f"Analysis completed in {duration:.2f}s")
    
    # Check 1: Runtime < 30s
    assert duration < 30.0, f"Analysis took {duration:.2f}s, exceeding the 30s limit!"
    
    # Evaluate Precision & Recall
    detected_accounts = {
        acc.account_id for acc in report.suspicious_accounts
        if acc.suspicion_score >= 40.0
    }
    actual_fraud = ground_truth["all_fraud_accounts"]
    
    true_positives = len(detected_accounts.intersection(actual_fraud))
    precision = (true_positives / len(detected_accounts)) if detected_accounts else 0.0
    recall = (true_positives / len(actual_fraud)) if actual_fraud else 0.0
    
    print(f"True Positives: {true_positives}")
    print(f"Total Detected: {len(detected_accounts)}")
    print(f"Actual Fraud Accounts: {len(actual_fraud)}")
    print(f"Precision: {precision * 100:.1f}% (Target: >= 70%)")
    print(f"Recall: {recall * 100:.1f}% (Target: >= 60%)")
    
    # Check 2: Precision >= 70%
    assert precision >= 0.70, f"Precision was {precision * 100:.1f}%, below 70% requirement!"
    
    # Check 3: Recall >= 60%
    assert recall >= 0.60, f"Recall was {recall * 100:.1f}%, below 60% requirement!"
    
    # Check 4: False Positive Filtering on Merchants and Payroll
    merchants_flagged = [m for m in ground_truth["legitimate_merchants"] if m in detected_accounts]
    payrolls_flagged = [p for p in ground_truth["legitimate_payrolls"] if p in detected_accounts]
    
    print(f"Merchants falsely flagged: {len(merchants_flagged)}")
    print(f"Payrolls falsely flagged: {len(payrolls_flagged)}")
    
    assert len(merchants_flagged) == 0, f"Legitimate merchants were flagged: {merchants_flagged}"
    assert len(payrolls_flagged) == 0, f"Legitimate payroll accounts were flagged: {payrolls_flagged}"
