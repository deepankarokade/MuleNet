"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import CytoscapeGraph from "@/components/CytoscapeGraph";
import RingCards from "@/components/RingCards";
import SuspiciousTable from "@/components/SuspiciousTable";
import ReportModal from "@/components/ReportModal";
import ForensicStoryboard from "@/components/ForensicStoryboard";
import InvestigationRoom from "@/components/InvestigationRoom";
import NetworkOverview from "@/components/NetworkOverview";
import RingInvestigation from "@/components/RingInvestigation";
import CaseFileModal from "@/components/CaseFileModal";
import GlobalSearch from "@/components/GlobalSearch";
import { parseCSV, runInBrowserForensics } from "@/lib/forensicsEngine";
import { SAMPLE_100_CSV } from "@/lib/sampleData";
import { API_BASE_URL } from "@/lib/apiConfig";
import {
  Upload,
  FileText,
  ShieldAlert,
  Layers,
  Users,
  DollarSign,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle2,
  Network,
  Activity,
  TrendingUp
} from "lucide-react";

export default function Home() {
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [report, setReport] = useState(null);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "investigate", "ring_investigation", "graph", "table"
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [activeRingFilter, setActiveRingFilter] = useState("ALL");
  const [hideCleanNodes, setHideCleanNodes] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [activeCaseRing, setActiveCaseRing] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);

  // Global hotkey to toggle navigation sidebar (Alt+M or 'm' when not typing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }
      if ((e.altKey && (e.key === "m" || e.key === "M")) || e.key === "m") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-load demo dataset on first launch
  useEffect(() => {
    handleAnalyzeData(SAMPLE_100_CSV, "planted_fraud_test_dataset.csv");
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".txt")) {
      setErrorMsg(`Unsupported file format "${file.name}". MuleNet accepts .csv or .txt files containing banking transaction logs.`);
      return;
    }

    setErrorMsg("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvContent(text);
      handleAnalyzeData(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleAnalyzeData = async (rawCsv, name = "uploaded_transactions.csv") => {
    if (!rawCsv || !rawCsv.trim()) {
      setErrorMsg("Uploaded file is empty. Please provide a CSV file with transaction records.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg("");
    setFileName(name);
    setAnalysisStep("Validating transaction records...");

    try {
      // 1. Try hitting the running FastAPI backend first
      let backendSuccess = false;
      try {
        setAnalysisStep("Executing graph analytics engine...");
        const formData = new FormData();
        const blob = new Blob([rawCsv], { type: "text/csv" });
        formData.append("file", blob, name);

        const res = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: "POST",
          body: formData,
          mode: "cors"
        });

        if (res.ok) {
          const data = await res.json();
          setReport(data);
          backendSuccess = true;
        } else {
          const errData = await res.json().catch(() => null);
          const detail = errData?.detail || `API error (${res.status}): Incompatible dataset.`;
          throw new Error(detail);
        }
      } catch (beErr) {
        // If it's a backend validation error (HTTP 400), surface it directly without falling back
        if (beErr.message && !beErr.message.includes("Failed to fetch") && !beErr.message.includes("NetworkError")) {
          throw beErr;
        }
        backendSuccess = false;
      }

      // 2. Fallback to client-side forensics engine if backend is offline
      if (!backendSuccess) {
        setAnalysisStep("Running client-side AML graph heuristics...");
        await new Promise((r) => setTimeout(r, 100));

        const parsedTxs = parseCSV(rawCsv);
        setParsedTransactions(parsedTxs);
        setAnalysisStep(`Evaluating network topology across ${parsedTxs.length} transactions...`);
        await new Promise((r) => setTimeout(r, 60));

        const forensicsReport = runInBrowserForensics(parsedTxs);
        setReport(forensicsReport);
      } else {
        try {
          const parsedTxs = parseCSV(rawCsv);
          setParsedTransactions(parsedTxs);
        } catch (pErr) {
          console.warn("Client CSV indexing note:", pErr);
        }
      }

      setAnalysisStep("Analysis complete.");
      setActiveRingFilter("ALL");
      setHideCleanNodes(true);
      setSelectedAccountId(null);
      setActiveTab("overview");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze transaction file.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const isINR = useMemo(() => {
    if (report?.summary?.currency === "INR") return true;
    if (parsedTransactions.some((t) => t.currency === "INR" || String(t.sender_account).includes("INR"))) return true;
    if (report?.fraud_rings?.some((r) => r.primary_pattern?.includes("INR") || r.ring_id?.includes("INR"))) return true;
    return false;
  }, [report, parsedTransactions]);

  const curr = isINR ? "₹" : "$";

  const handleLoadDemo = (count = 100) => {
    handleAnalyzeData(SAMPLE_100_CSV, `demo_planted_fraud_${count}_tx.csv`);
  };

  const handleSelectRing = (ringId) => {
    setActiveRingFilter(ringId);
    setSelectedAccountId(null);
    setActiveTab("ring_investigation");
  };

  const handleInspectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setActiveTab("investigate");
  };

  const handleInvestigateAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setActiveTab("investigate");
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-[#0F172A] flex flex-col font-sans">
      <Header
        onLoadDemoData={handleLoadDemo}
        isAnalyzing={isAnalyzing}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCaseFile={() => {
          setActiveCaseRing(report?.fraud_rings?.[0] || null);
          setIsCaseModalOpen(true);
        }}
        hasReport={!!report}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        activeTab={activeTab}
      />

      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          report={report}
          selectedAccountId={selectedAccountId}
          onOpenCaseFile={() => {
            setActiveCaseRing(report?.fraud_rings?.[0] || null);
            setIsCaseModalOpen(true);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onUploadClick={() => fileInputRef.current?.click()}
          onLoadDemoData={handleLoadDemo}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
          {/* Upload & Dataset Ingestion Card */}
          <section className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                  <FileText className="text-[#2563EB] w-4 h-4" />
                  <span>Transaction Dataset Ingestion</span>
                </h2>
                <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                  Ingest structured transaction files to detect smurfing rings, circular fund routing, and multi-hop shell networks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {/* File Upload Button */}
                <label className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-medium text-xs rounded-[4px] border border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer transition">
                  <Upload size={13} className="text-[#2563EB]" />
                  <span>Upload CSV</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Sample Dataset Button */}
                <button
                  onClick={() => handleLoadDemo(100)}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] font-medium text-xs rounded-[4px] border border-[#E2E8F0] transition cursor-pointer disabled:opacity-50"
                >
                  <span>Sample Data</span>
                </button>

                {/* View JSON Report Button */}
                {report && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] font-medium text-xs rounded-[4px] border border-[#E2E8F0] transition cursor-pointer"
                  >
                    <Download size={13} className="text-[#64748B]" />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current File & Duration Bar */}
            {fileName && (
              <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#64748B]">
                <span className="truncate">
                  Auditing: <span className="text-[#0F172A] font-medium">{fileName}</span>
                </span>
                {report?.report_metadata?.analysis_duration_ms !== undefined && (
                  <span className="text-[#475569] font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Execution time: {report.report_metadata.analysis_duration_ms} ms</span>
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-[4px] text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Analyzing Progress */}
            {isAnalyzing && (
              <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] text-[#475569] text-xs flex items-center gap-3">
                <div className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">{analysisStep}</span>
              </div>
            )}
          </section>

          {/* Forensic KPI Summary Stats Strip */}
          {report && report.summary && (
            <section className="bg-white border border-[#E2E8F0] rounded-[4px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex flex-wrap items-center gap-5 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Accounts</span>
                  <span className="font-mono font-medium text-[#0F172A]">
                    {Number(report.summary.total_accounts || 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-[#CBD5E1]">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Transactions</span>
                  <span className="font-mono font-medium text-[#0F172A]">
                    {Number(report.summary.total_transactions || 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-[#CBD5E1]">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Flagged</span>
                  <span className="font-mono font-medium text-red-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {report.summary.total_suspicious_accounts || 0}
                  </span>
                </div>
                <span className="text-[#CBD5E1]">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Networks</span>
                  <span className="font-mono font-medium text-amber-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {report.summary.total_fraud_rings || 0}
                  </span>
                </div>
                <span className="text-[#CBD5E1]">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748B] uppercase tracking-wider text-[10px]">Suspicious Flow</span>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {curr}{Number(report.summary.total_suspicious_volume || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-[#64748B] font-mono text-[11px] flex items-center gap-1.5">
                <span>Latency:</span>
                <span className="text-[#475569] font-medium">{report.report_metadata?.analysis_duration_ms || 0} ms</span>
              </div>
            </section>
          )}

        {/* Main Work Area Views (Navigated via Hamburger Sidebar) */}
        {report && (
          <section className="space-y-4">
            {/* Tab 0: Network Overview */}
            {activeTab === "overview" && (
              <NetworkOverview
                report={report}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectRing={handleSelectRing}
                onSelectAccount={handleInspectAccount}
                transactions={parsedTransactions}
              />
            )}

            {/* Tab 1: Investigation Room */}
            {activeTab === "investigate" && (
              <InvestigationRoom
                report={report}
                selectedAccountId={selectedAccountId}
                onSelectAccount={(accId) => setSelectedAccountId(accId)}
                transactions={parsedTransactions}
              />
            )}

            {/* Tab 2: Dedicated Ring Investigation View */}
            {activeTab === "ring_investigation" && (
              <RingInvestigation
                report={report}
                activeRingId={activeRingFilter}
                onSelectRing={handleSelectRing}
                onSelectAccount={handleInspectAccount}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCaseFile={(r) => {
                  setActiveCaseRing(r);
                  setIsCaseModalOpen(true);
                }}
                transactions={parsedTransactions}
              />
            )}

            {/* Tab 3: Directed Cytoscape Graph & Forensic Storyboard */}
            {activeTab === "graph" && (
              <div className="space-y-4">
                <ForensicStoryboard
                  report={report}
                  activeRingId={activeRingFilter}
                  onSelectRing={handleSelectRing}
                  onSelectAccount={handleInspectAccount}
                  hideCleanNodes={hideCleanNodes}
                  onToggleHideClean={() => setHideCleanNodes((prev) => !prev)}
                  transactions={parsedTransactions}
                />

                <div className="h-[600px] w-full">
                  <CytoscapeGraph
                    graphData={report.graph_data}
                    fraudRings={report.fraud_rings}
                    onSelectAccount={setSelectedAccountId}
                    onInvestigateAccount={handleInvestigateAccount}
                    selectedAccountId={selectedAccountId}
                    activeRingFilter={activeRingFilter}
                    hideCleanNodes={hideCleanNodes}
                    onToggleHideClean={() => setHideCleanNodes((prev) => !prev)}
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Suspicious Accounts Table */}
            {activeTab === "table" && (
              <SuspiciousTable
                accounts={report.suspicious_accounts}
                onInspectAccount={handleInspectAccount}
                onInvestigateAccount={handleInvestigateAccount}
                selectedAccountId={selectedAccountId}
              />
            )}
          </section>
        )}
      </main>
    </div>

      {/* Global Omnibar Search (Ctrl+K) */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        report={report}
        transactions={parsedTransactions}
        onSelectAccount={(accId) => {
          setSelectedAccountId(accId);
          setActiveTab("investigate");
        }}
        onSelectRing={(rId) => {
          setActiveRingFilter(rId);
          setActiveTab("ring_investigation");
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Official Forensic Case File Generator Modal */}
      <CaseFileModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        ring={activeCaseRing || report?.fraud_rings?.[0]}
        account={report?.suspicious_accounts?.find((a) => a.account_id === selectedAccountId)}
        report={report}
        transactions={parsedTransactions}
      />

      {/* JSON Forensics Report Modal */}
      <ReportModal
        report={report}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-2.5 text-center text-[11px] text-[#64748B] font-mono">
        MuleNet Financial Forensics Platform &copy; 2026
      </footer>
    </div>
  );
}
