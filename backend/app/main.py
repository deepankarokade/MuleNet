from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from typing import Optional
from pydantic import BaseModel

from app.models import AnalysisReport, InvestigationRequest, AccountDossier
from app.engine.pipeline import run_forensics_pipeline, run_pipeline_with_context
from app.engine.investigation_tracer import build_account_dossier
from app.generator.test_data_generator import generate_synthetic_transactions


app = FastAPI(
    title="MuleNet — Financial Forensics Engine API",
    description="High-performance graph forensics engine for detecting money-muling networks, cycles, smurfing, and shell companies.",
    version="1.0.0"
)

# Global cache of the latest pipeline execution for instant sub-millisecond investigations
_latest_context = None

# Enable CORS for Next.js frontend and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RawCsvRequest(BaseModel):
    csv_content: str


@app.get("/")
def root():
    return {
        "engine": "MuleNet Forensics API",
        "status": "ONLINE",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "analyze_csv_upload": "POST /api/analyze",
            "analyze_csv_raw": "POST /api/analyze/raw",
            "investigate_account": "POST /api/investigate",
            "download_sample_csv": "GET /api/sample-data/{count}",
            "benchmark": "GET /api/benchmark"
        }
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "engine": "MuleNet",
        "version": "1.0.0"
    }


@app.post("/api/analyze", response_model=AnalysisReport)
async def analyze_csv_file(file: UploadFile = File(...)):
    """
    Accepts CSV file upload via multipart/form-data.
    Executes end-to-end money muling detection and returns complete analysis report.
    """
    if not file.filename.endswith(".csv") and not file.filename.endswith(".txt"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a .csv file."
        )

    try:
        contents = await file.read()
        csv_text = contents.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")

    try:
        global _latest_context
        report, ctx = run_pipeline_with_context(csv_text)
        _latest_context = ctx
        return report
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensics engine error: {str(e)}")


@app.post("/api/analyze/raw", response_model=AnalysisReport)
def analyze_csv_raw(payload: RawCsvRequest):
    """
    Accepts raw CSV string in JSON payload.
    Useful for testing, curl, or programmatic integrations.
    """
    if not payload.csv_content.strip():
        raise HTTPException(status_code=400, detail="CSV content cannot be empty.")

    try:
        global _latest_context
        report, ctx = run_pipeline_with_context(payload.csv_content)
        _latest_context = ctx
        return report
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensics engine error: {str(e)}")


@app.post("/api/investigate", response_model=AccountDossier)
def investigate_account(payload: InvestigationRequest):
    """
    Computes a forensic account dossier and multi-hop upstream/downstream fund trace
    for a specific account from CSV transaction records or the latest pipeline execution.
    """
    if not payload.account_id:
        raise HTTPException(status_code=400, detail="account_id is required.")

    global _latest_context
    ctx = None

    if payload.csv_content and payload.csv_content.strip():
        try:
            _, ctx = run_pipeline_with_context(payload.csv_content)
            _latest_context = ctx
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
    elif _latest_context:
        ctx = _latest_context
    else:
        # If no previous analysis, generate lightweight baseline or error
        raise HTTPException(
            status_code=400,
            detail="CSV content is required or an analysis must be run first."
        )

    try:
        dossier = build_account_dossier(
            payload.account_id,
            ctx["G"],
            ctx["transactions"],
            ctx["account_stats"],
            ctx["suspicious_accounts"],
            ctx["fraud_rings"]
        )
        return dossier
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation tracer error: {str(e)}")


@app.get("/api/sample-data/{count}")
def download_sample_data(count: int = 1000):
    """
    Generates and returns synthetic transaction data with planted fraud patterns.
    Allowed counts: 10 to 100,000 transactions.
    """
    if count < 10 or count > 100000:
        raise HTTPException(status_code=400, detail="Count must be between 10 and 100,000.")

    csv_text, _ = generate_synthetic_transactions(target_count=count)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=mulenet_sample_{count}_tx.csv"
        }
    )


@app.get("/api/benchmark")
def run_benchmark(count: int = 10000):
    """
    Benchmarks the forensics engine with configurable transactions (default 10,000, up to 100,000).
    Measures speed (<30s requirement), precision (>=70% requirement), and recall (>=60% requirement).
    """
    if count > 100000:
        count = 100000

    # 1. Generate synthetic data with ground truth
    csv_text, ground_truth = generate_synthetic_transactions(target_count=count)
    
    # 2. Run analysis
    report = run_forensics_pipeline(csv_text)
    
    detected_accounts = {acc.account_id for acc in report.suspicious_accounts if acc.suspicion_score >= 40.0}
    actual_fraud = ground_truth["all_fraud_accounts"]
    
    # Metrics
    true_positives = len(detected_accounts.intersection(actual_fraud))
    false_positives = len(detected_accounts - actual_fraud)
    false_negatives = len(actual_fraud - detected_accounts)
    
    precision = (true_positives / len(detected_accounts)) if detected_accounts else 0.0
    recall = (true_positives / len(actual_fraud)) if actual_fraud else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    
    # Check false positives on legitimate merchants & payroll
    merchants_flagged = [m for m in ground_truth["legitimate_merchants"] if m in detected_accounts]
    payrolls_flagged = [p for p in ground_truth["legitimate_payrolls"] if p in detected_accounts]

    return {
        "benchmark_summary": {
            "transactions_analyzed": count,
            "duration_ms": report.report_metadata["analysis_duration_ms"],
            "duration_seconds": report.report_metadata["analysis_duration_seconds"],
            "speed_target_met (<30s)": report.report_metadata["analysis_duration_seconds"] < 30.0,
            "precision": round(precision * 100, 2),
            "precision_target_met (>=70%)": (precision * 100) >= 70.0,
            "recall": round(recall * 100, 2),
            "recall_target_met (>=60%)": (recall * 100) >= 60.0,
            "f1_score": round(f1 * 100, 2),
            "legitimate_merchants_flagged": len(merchants_flagged),
            "legitimate_payrolls_flagged": len(payrolls_flagged),
            "zero_merchant_payroll_false_positives": (len(merchants_flagged) == 0 and len(payrolls_flagged) == 0)
        },
        "forensics_summary": report.summary,
        "rings_detected_count": len(report.fraud_rings)
    }
