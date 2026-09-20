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

import Link from "next/link";
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
    <header className="border-b border-[#DCE1E7] bg-white sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand & Hamburger Menu */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] hover:border-[#CBD5E1] text-[#64748B] hover:text-[#172033] transition cursor-pointer flex items-center justify-center group"
          title="Toggle Navigation Menu (Alt+M)"
        >
          <Menu size={16} className="text-[#64748B] group-hover:text-[#2563EB] transition-colors" />
        </button>

        <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition" title="MuleNet Landing Page">
          <div className="w-7 h-7 rounded-[4px] bg-[#F1F5F9] border border-[#DCE1E7] flex items-center justify-center text-[#2563EB]">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#172033] leading-none">
              MuleNet
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
              Financial Forensics
            </div>
          </div>
        </Link>

        {/* Active Module Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#DCE1E7] text-xs font-mono">
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
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] hover:border-[#CBD5E1] text-xs text-[#64748B] hover:text-[#172033] transition cursor-pointer group"
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
          className="md:hidden p-1.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] text-[#64748B] hover:text-[#172033]"
          title="Search"
        >
          <Search size={14} />
        </button>

        {/* Backend Status Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[#DCE1E7] bg-[#F8FAFC] text-[11px] font-mono text-[#475569]"
          title={
            backendOnline
              ? "FastAPI Python backend connected on port 8000"
              : "Backend offline - running in client-side mode"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
          />
          <span className="hidden sm:inline">
            {backendOnline ? "ENGINE ONLINE" : "LOCAL MODE"}
          </span>
        </div>

        {/* Quick Demo Data trigger if no report is loaded */}
        {!hasReport && (
          <button
            onClick={() => onLoadDemoData(100)}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-[4px] transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden sm:inline">Sample Dataset</span>
          </button>
        )}

        {/* Quick Case File Trigger */}
        {hasReport && (
          <button
            onClick={onOpenCaseFile}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] border border-[#DCE1E7] hover:border-[#CBD5E1] text-xs font-medium rounded-[4px] transition cursor-pointer"
            title="Generate Case File"
          >
            <FileText size={13} className="text-[#2563EB]" />
            <span className="hidden sm:inline">Case File</span>
          </button>
        )}
      </div>
    </header>
  );
}

