"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import CaseFileModal from "@/components/CaseFileModal";
import ReportModal from "@/components/ReportModal";
import { useForensics } from "@/context/ForensicsContext";
import {
  FileText,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

export default function WorkstationShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    report,
    parsedTransactions,
    fileName,
    isAnalyzing,
    analysisStep,
    errorMsg,
    selectedAccountId,
    setSelectedAccountId,
    activeRingFilter,
    setActiveRingFilter,
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
    handleLoadDemo
  } = useForensics();

  // Determine active module from current URL pathname
  const activeTab = useMemo(() => {
    if (!pathname || pathname === "/" || pathname === "/overview") return "overview";
    if (pathname.startsWith("/investigate")) return "investigate";
    if (pathname.startsWith("/networks")) return "ring_investigation";
    if (pathname.startsWith("/graph")) return "graph";
    if (pathname.startsWith("/accounts")) return "table";
    return "overview";
  }, [pathname]);

  const handleSelectTab = (tabId) => {
    switch (tabId) {
      case "overview":
        router.push("/overview");
        break;
      case "investigate":
        router.push("/investigate");
        break;
      case "ring_investigation":
        router.push("/networks");
        break;
      case "graph":
        router.push("/graph");
        break;
      case "table":
        router.push("/accounts");
        break;
      default:
        router.push("/overview");
    }
  };

  const isINR = useMemo(() => {
    if (report?.summary?.currency === "INR") return true;
    if (parsedTransactions.some((t) => t.currency === "INR" || String(t.sender_account).includes("INR"))) return true;
    if (report?.fraud_rings?.some((r) => r.primary_pattern?.includes("INR") || r.ring_id?.includes("INR"))) return true;
    return false;
  }, [report, parsedTransactions]);

  const curr = isINR ? "₹" : "$";

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
          onSelectTab={handleSelectTab}
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
          {/* Universal Ingestion Toolbar */}
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

                <button
                  onClick={() => handleLoadDemo(100)}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] font-medium text-xs rounded-[4px] border border-[#E2E8F0] transition cursor-pointer disabled:opacity-50"
                >
                  <span>Sample Data</span>
                </button>

                {report && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] font-medium text-xs rounded-[4px] border border-[#E2E8F0] transition cursor-pointer"
                  >
                    <Download size={13} className="text-[#64748B]" />
                    <span>Export Evidence JSON</span>
                  </button>
                )}
              </div>
            </div>

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

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-[4px] text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isAnalyzing && (
              <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] text-[#475569] text-xs flex items-center gap-3">
                <div className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">{analysisStep}</span>
              </div>
            )}
          </section>

          {/* Quick Metrics Strip */}
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
                    {report.fraud_rings?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[11px] font-mono text-[#64748B]">
                  Suspicious Volume:{" "}
                  <span className="text-red-700 font-semibold font-mono">
                    {curr}
                    {Number(report.summary.total_suspicious_volume || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Active View Content */}
          <section className="space-y-4">
            {children}
          </section>

          {/* Footer */}
          <footer className="pt-6 pb-2 text-center text-xs text-[#64748B] border-t border-[#E2E8F0]">
            <p>MuleNet Financial Intelligence Platform • Compliant with AML / CFT Guidelines</p>
          </footer>
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        report={report}
        transactions={parsedTransactions}
        onSelectAccount={(accId) => {
          setSelectedAccountId(accId);
          router.push(`/investigate?account=${encodeURIComponent(accId)}`);
        }}
        onSelectRing={(rId) => {
          setActiveRingFilter(rId);
          router.push(`/networks?ring=${encodeURIComponent(rId)}`);
        }}
      />

      <CaseFileModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        ring={activeCaseRing}
        account={report?.suspicious_accounts?.find((a) => a.account_id === selectedAccountId)}
        report={report}
        transactions={parsedTransactions}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={report}
      />
    </div>
  );
}
