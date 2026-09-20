# MuleNet — Financial Forensics & AML Detection Engine

<div align="center">

![MuleNet Banner](https://img.shields.io/badge/MuleNet-Financial%20Forensics-2563EB?style=for-the-badge&logo=shield&logoColor=white)
<br/>

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Cytoscape.js](https://img.shields.io/badge/Graph-Cytoscape.js%20Directed%20Visualizer-EA580C?style=flat-square)](https://js.cytoscape.org)
[![Tests](https://img.shields.io/badge/Tests-29%2F29%20Passing-10B981?style=flat-square&logo=pytest&logoColor=white)](https://pytest.org)
[![Deployment](https://img.shields.io/badge/Deploy-Render%20%7C%20Vercel-6366F1?style=flat-square&logo=render&logoColor=white)](https://render.com)

<p align="center">
  <b>High-throughput graph forensics engine and Bloomberg/Palantir-inspired light workstation for detecting complex money muling networks, smurfing structures, and circular fund routing.</b>
</p>

</div>

---

## ⚡ Executive Summary & Benchmarks

MuleNet is an institutional-grade anti-money laundering (AML) intelligence system. It combines graph algorithms (elementary cycle detection, Fan-In/Fan-Out structuring heuristics, and topological centrality) with interactive network visualization to detect, cluster, and reconstruct sophisticated money-muling rings within seconds.

| Metric | Regulatory / Target Baseline | MuleNet Achieved | Verdict |
| :--- | :--- | :--- | :--- |
| **Throughput (10,000 tx)** | $< 30.0$ seconds | **1.14 – 1.61 seconds** | ⚡ **20x faster than target** |
| **Throughput (50,000 tx)** | $< 120.0$ seconds | **7.84 seconds** | ⚡ **15x faster than target** |
| **Precision** | $\ge 70.0\%$ | **100.0%** | 🎯 **Zero false accusations** |
| **Recall** | $\ge 60.0\%$ | **71.1%** | 🎯 **Exceeded regulatory floor** |
| **Merchant False Positives** | $\le 2$ | **0** | 🛡️ **Zero legitimate merchants flagged** |
| **Corporate Payroll False Positives** | $\le 2$ | **0** | 🛡️ **Zero legitimate payrolls flagged** |

---

## 🔍 Core Detection Capabilities

### 1. Circular Fund Routing (Directed Graph Cycles)
- Identifies closed-loop circuits where funds pass through $k$ intermediary accounts and return to the originator to fabricate synthetic turnover.
- Detects elementary cycles of lengths **3, 4, and 5** with rolling temporal window constraints.

### 2. Smurfing & Structuring Hubs
- **Fan-In (Aggregation)**: Detects 10+ distinct feeder accounts routing structured payments into a central hub within rolling 72-hour windows.
- **Fan-Out (Dispersion)**: Detects rapid fund splintering from a single source to 10+ mule accounts.
- **Threshold Structuring**: Flags micro-transfers clustered just below regulatory cash transaction thresholds ($10,000 / ₹5,00,000).

### 3. Layered Shell Conduit Chains
- Identifies multi-hop linear chains ($\ge 3$ hops) through disposable intermediary accounts.
- Evaluates **pass-through ratio ($>85\%$)**, low transaction lifespan, and high capital velocity ($<48$h dwell time).

### 4. False-Positive Filtering (Merchant & Payroll Dampening)
- Distinguishes high-inflow commercial merchants (e-commerce, utilities, retail) by analyzing counterparty diversity and historical net retention.
- Distinguishes periodic 1-to-N corporate salary disbursements from smurfing dispersers.

### 5. Multi-Signal Suspicion Scoring (0–100) & Role Classification
- Assigns mathematically explainable risk scores broken down into:
  - `Shell Score` (0–60)
  - `Cycle Score` (0–70)
  - `Smurfing Score` (0–65)
  - `Temporal Velocity Score` (0–40)
  - `Network Centrality` (0–30)
- Classifies entities into actionable roles: `ORCHESTRATOR`, `MULE`, `AGGREGATOR`, `DISPERSER`, `SHELL`, or `NORMAL`.

---

## 🖥️ Workstation Interface Features

- **Institutional Light Theme**: Clean slate-and-cobalt workstation styling (inspired by Palantir Gotham & Bloomberg Terminals).
- **Interactive Cytoscape.js Directed Graph**:
  - Color-coded risk nodes (`CRITICAL` Red, `HIGH` Orange, `ELEVATED` Amber, `NORMAL` Slate).
  - Graph Traversal Toolbar: **Trace In** (source feeders), **Trace Out** (fund sinks), and **Full Money Trail**.
  - One-click zoom, pan, fit, and noise filter toggle.
- **Sequential Money Flow Replay Simulator**:
  - Scrub bar animating chronological fund movements hop-by-hop with real timestamps and fee retention.
- **Deep Investigation Room (`/investigate`)**:
  - Comprehensive account dossier with upstream/downstream fund reconstruction.
  - "Why Flagged?" mathematical breakdown and chronological transaction timeline.
- **Regulatory Case File Export**:
  - Generates downloadable FinCEN / FIU-IND compliant Suspicious Activity Report (SAR) JSON exhibits.
- **Global Search (`Ctrl + K`)**:
  - Instant hotkey search across accounts, rings, transaction IDs, and amounts.
- **Fail-Safe Schema Validation**:
  - Automatic detection and friendly error reporting for non-financial datasets (e.g., hospital, student, or demographic files).

---

## 📂 Repository Structure (Monorepo)

```text
devengers/
├── .gitignore                    <- Excludes local venv/ and node_modules/
├── README.md                     <- Monorepo documentation
├── dataset.csv                   <- Benchmark dataset (7.6 MB)
├── dataset_10000.csv             <- 10,000 transaction USD benchmark dataset
├── dataset_10000_inr.csv         <- 10,000 transaction INR benchmark dataset
├── start_backend.bat             <- 1-click native Windows backend launcher
├── start_frontend.bat            <- 1-click native Windows frontend launcher
│
├── backend/                      <- FastAPI Forensics Engine
│   ├── Procfile                  <- Production PaaS process definition
│   ├── Dockerfile                <- Optional container config
│   ├── requirements.txt          <- Python dependencies
│   ├── run.py                    <- Dynamic ASGI server entrypoint
│   ├── app/
│   │   ├── main.py               <- REST API endpoints & CORS setup
│   │   ├── models.py             <- Pydantic schemas & data models
│   │   ├── core/config.py        <- Engine constants & thresholds
│   │   ├── engine/               <- Core AML Graph Algorithms
│   │   │   ├── graph_builder.py  <- NetworkX DiGraph ingestion
│   │   │   ├── cycle_detector.py <- 3, 4, 5-hop cycle detection
│   │   │   ├── smurfing_detector.py <- Fan-in/out structuring
│   │   │   ├── shell_detector.py <- Layered conduit chains
│   │   │   ├── false_positive_filter.py <- Merchant & payroll filters
│   │   │   ├── scoring_engine.py <- 0-100 composite risk scoring
│   │   │   ├── ring_aggregator.py <- Connected components clustering
│   │   │   └── csv_validator.py  <- Schema & row-level validator
│   │   └── generator/            <- Synthetic AML benchmark data generators
│   └── tests/                    <- 29 automated Pytest validation suites
│
└── frontend/mulenet/             <- Next.js 16 Light Workstation UI
    ├── package.json              <- Dependencies (React 19, Cytoscape, Lucide)
    ├── next.config.mjs           <- Next.js configuration
    └── src/
        ├── app/                  <- App Router layout, styling, and main dashboard
        ├── components/           <- Graph visualizer, modals, dossiers, replay HUD
        └── lib/                  <- Client-side fallback engine & API connector
```

---

## 🚀 Quick Start Guide (Local Development)

MuleNet runs **100% natively without requiring Docker or WSL**.

### Method 1: One-Click Windows Launchers
Simply double-click the included batch scripts:
1. Double-click `start_backend.bat` (launches FastAPI on `http://127.0.0.1:8000`).
2. Double-click `start_frontend.bat` (launches Next.js on `http://localhost:3000`).
3. Open `http://localhost:3000` in your browser.

---

### Method 2: Manual Terminal Execution

#### 1. Start Backend (Python 3.11+)
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*API is live at `http://127.0.0.1:8000` (Swagger docs at `/docs`).*

#### 2. Start Frontend (Node.js 18+)
```bash
cd frontend/mulenet
npm install
npm run dev
```
*UI is live at `http://localhost:3000`.*

---

## ☁️ Cloud Deployment Guide (Zero Docker)

Because MuleNet is organized as a clean monorepo, it deploys directly to free PaaS platforms from raw source code:

### 1. Deploy Backend on Railway (or Render)
1. Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. In **Settings**:
   - **Root Directory**: `backend`
   - (Railway reads `Procfile` / `requirements.txt` and automatically binds to dynamic `$PORT`).
4. In **Networking**, click **Generate Domain** (e.g. `https://mulenet-backend.up.railway.app`).
5. Verify health check: `https://<YOUR_URL>/health` returns `{"status": "healthy"}`.

### 2. Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Select your repository.
2. In configuration:
   - **Root Directory**: `frontend/mulenet`
   - **Framework Preset**: Auto-detected as `Next.js`.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://<YOUR_RAILWAY_BACKEND_URL>`
4. Click **Deploy**.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check and engine readiness. |
| `/api/analyze` | `POST` | Ingests multipart CSV file (up to 100k rows) and outputs full AML report. |
| `/api/analyze/raw` | `POST` | Ingests raw CSV text string via JSON payload for programmatic testing. |
| `/api/investigate` | `POST` | Generates a multi-hop upstream/downstream trace dossier for a specific account. |
| `/api/sample-data/{count}` | `GET` | Generates and downloads a synthetic CSV with planted fraud patterns. |
| `/api/benchmark` | `GET` | Executes automated accuracy, recall, and throughput benchmarks. |

---

## 🧪 Testing & Validation

MuleNet includes a comprehensive test suite covering cycle detection, smurfing heuristics, shell pipeline isolation, and false-positive dampening:

```bash
cd backend
python -m pytest tests/ -v
```

```text
tests/test_api_endpoints.py ......              [ 20%]
tests/test_csv_validator.py ......               [ 41%]
tests/test_cycle_detector.py ....                [ 55%]
tests/test_false_positive.py ...                 [ 65%]
tests/test_investigation.py ...                  [ 75%]
tests/test_performance.py ..                     [ 82%]
tests/test_pipeline.py ..                        [ 89%]
tests/test_shell_detector.py ..                  [ 96%]
tests/test_smurfing_detector.py .                [100%]

======================== 29 passed in 3.88s ========================
RESULTS MAY VARY SINCE THESE ARE THE BENCHMARKS OF LOCAL OUTPUT AND NOT CLOUD OUTPUT.
```

---

## 👥 Authors & Team
Built with ❤️ by **Deepankar Rokade** for high-precision financial crime intelligence.
