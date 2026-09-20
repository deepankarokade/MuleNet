"use client";

import { useEffect, useState } from "react";
import { Shield, FileSpreadsheet, Search, FileText, Menu } from "lucide-react";

const tabNames = {
  overview: "Overview",
  investigate: "Investigation",
  ring_investigation: "Networks",
  graph: "Graph",
  table: "Accounts"
};

import { API_BASE_URL } from "@/lib/apiConfig";

export default function Header({
  onLoadDemoData,
  isAnalyzing,
  onOpenSearch,
  onOpenCaseFile,
  hasReport = false,
  onToggleSidebar,
  activeTab = "overview"
}) {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { mode: "cors" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "healthy") setBackendOnline(true);
        }
      } catch (err) {
        setBackendOnline(false);
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand & Hamburger Menu */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] transition cursor-pointer flex items-center justify-center group"
          title="Toggle Navigation Menu (Alt+M)"
        >
          <Menu size={16} className="text-[#64748B] group-hover:text-[#2563EB] transition-colors" />
        </button>

        <div className="w-7 h-7 rounded-[4px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#2563EB]">
          <Shield className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-[#0F172A] leading-none">
            MuleNet
          </div>
          <div className="text-[9px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
            Financial Forensics
          </div>
        </div>

        {/* Active Module Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#E2E8F0] text-xs font-mono">
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#2563EB] uppercase font-semibold text-[11px] tracking-wider">
            {tabNames[activeTab] || "Overview"}
          </span>
        </div>
      </div>

      {/* Center Global Search Trigger (Ctrl+K) */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs text-[#64748B] hover:text-[#0F172A] transition cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-[#94A3B8] group-hover:text-[#2563EB]" />
            <span className="truncate">Search account, ring, amount...</span>
          </div>
        </button>
      </div>

      {/* Engine Status & Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
          title="Search"
        >
          <Search size={14} />
        </button>

        {/* Backend Status Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-mono text-[#475569]"
          title={
            backendOnline
              ? "FastAPI Python backend connected on port 8000"
              : "Backend offline - running in client-side mode"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
          />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            {backendOnline ? "Engine Online" : "Engine Local"}
          </span>
        </div>

        {/* Case File Trigger */}
        {hasReport && (
          <button
            onClick={onOpenCaseFile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] text-xs font-medium transition cursor-pointer"
            title="Generate Case File"
          >
            <FileText size={13} className="text-[#2563EB]" />
            <span className="hidden sm:inline">Case File</span>
          </button>
        )}

        {/* Demo Button */}
        <button
          onClick={() => onLoadDemoData(100)}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet size={13} className="text-[#64748B]" />
          <span>Demo CSV</span>
        </button>
      </div>
    </header>
  );
}

