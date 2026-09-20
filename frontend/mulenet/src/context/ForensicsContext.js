"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseCSV, runInBrowserForensics } from "@/lib/forensicsEngine";
import { SAMPLE_100_CSV } from "@/lib/sampleData";
import { API_BASE_URL } from "@/lib/apiConfig";

const ForensicsContext = createContext(null);

export function ForensicsProvider({ children }) {
  const [report, setReport] = useState(null);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [activeRingFilter, setActiveRingFilter] = useState("ALL");
  const [hideCleanNodes, setHideCleanNodes] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeCaseRing, setActiveCaseRing] = useState(null);
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

  // Auto-load demo dataset on initial launch or restore from sessionStorage
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mulenet_report_cache");
      const cachedName = sessionStorage.getItem("mulenet_filename_cache");
      const cachedCsv = sessionStorage.getItem("mulenet_rawcsv_cache");
      if (cached && cachedCsv) {
        const parsedReport = JSON.parse(cached);
        const parsedTxs = parseCSV(cachedCsv);
        setReport(parsedReport);
        setParsedTransactions(parsedTxs);
        setFileName(cachedName || "cached_dataset.csv");
        return;
      }
    } catch (e) {
      // Storage unavailable or invalid, fallback to demo
    }

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
      let finalReport = null;

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
          finalReport = data;
          setReport(data);
          backendSuccess = true;
        } else {
          const errData = await res.json().catch(() => null);
          const detail = errData?.detail || `API error (${res.status}): Incompatible dataset.`;
          throw new Error(detail);
        }
      } catch (beErr) {
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
        finalReport = forensicsReport;
        setReport(forensicsReport);
      } else {
        try {
          const parsedTxs = parseCSV(rawCsv);
          setParsedTransactions(parsedTxs);
        } catch (pErr) {
          console.warn("Client CSV indexing note:", pErr);
        }
      }

      // Cache session so page reloads across subroutes persist data
      try {
        if (finalReport && rawCsv.length < 5000000) {
          sessionStorage.setItem("mulenet_report_cache", JSON.stringify(finalReport));
          sessionStorage.setItem("mulenet_filename_cache", name);
          sessionStorage.setItem("mulenet_rawcsv_cache", rawCsv);
        }
      } catch (storageErr) {
        // Quota exceeded for huge files, in-memory state remains active
      }

      setAnalysisStep("Analysis complete.");
      setActiveRingFilter("ALL");
      setHideCleanNodes(true);
      setSelectedAccountId(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze transaction file.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleLoadDemo = (count = 100) => {
    handleAnalyzeData(SAMPLE_100_CSV, `demo_planted_fraud_${count}_tx.csv`);
  };

  return (
    <ForensicsContext.Provider
      value={{
        report,
        setReport,
        parsedTransactions,
        setParsedTransactions,
        fileName,
        setFileName,
        isAnalyzing,
        analysisStep,
        errorMsg,
        setErrorMsg,
        selectedAccountId,
        setSelectedAccountId,
        activeRingFilter,
        setActiveRingFilter,
        hideCleanNodes,
        setHideCleanNodes,
        isSidebarOpen,
        setIsSidebarOpen,
        isSearchOpen,
        setIsSearchOpen,
        isCaseModalOpen,
        setIsCaseModalOpen,
        isReportModalOpen,
        setIsReportModalOpen,
        activeCaseRing,
        setActiveCaseRing,
        fileInputRef,
        handleFileUpload,
        handleAnalyzeData,
        handleLoadDemo
      }}
    >
      {children}
    </ForensicsContext.Provider>
  );
}

export function useForensics() {
  const context = useContext(ForensicsContext);
  if (!context) {
    throw new Error("useForensics must be used within a ForensicsProvider");
  }
  return context;
}
