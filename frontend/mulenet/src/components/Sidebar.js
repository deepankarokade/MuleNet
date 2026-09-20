"use client";

import { useEffect } from "react";
import {
  TrendingUp,
  Activity,
  ShieldAlert,
  Network,
  Users,
  X,
  Shield,
  FileText,
  Search,
  Upload,
  FileSpreadsheet,
  CheckCircle2
} from "lucide-react";

import Link from "next/link";

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  report,
  selectedAccountId,
  onOpenCaseFile,
  onOpenSearch,
  onUploadClick,
  onLoadDemoData
}) {
  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    {
      id: "overview",
      href: "/overview",
      label: "Overview",
      badge: null,
      icon: TrendingUp,
      desc: "Executive Health & Triage"
    },
    {
      id: "investigate",
      href: "/investigate",
      label: "Investigation",
      badge: selectedAccountId ? selectedAccountId : null,
      badgeType: "account",
      icon: Activity,
      desc: "Entity Flow Tracer"
    },
    {
      id: "ring_investigation",
      href: "/networks",
      label: "Networks",
      badge: report?.fraud_rings?.length || 0,
      badgeType: "count",
      icon: ShieldAlert,
      desc: "Mule & Shell Networks"
    },
    {
      id: "graph",
      href: "/graph",
      label: "Graph",
      badge: null,
      icon: Network,
      desc: "Interactive Cytoscape"
    },
    {
      id: "table",
      href: "/accounts",
      label: "Accounts",
      badge: report?.suspicious_accounts?.length || 0,
      badgeType: "count",
      icon: Users,
      desc: "Flagged Account Registry"
    }
  ];

  return (
    <aside
      className={`${isOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        } shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col font-sans sticky top-[57px] h-[calc(100vh-57px)] transition-all duration-200 ease-in-out select-none z-20 shadow-2xs`}
      aria-label="Workstation Navigation"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white min-w-[256px]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[4px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#2563EB]">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-tight text-[#0F172A] leading-none">
              MuleNet
            </div>
            <div className="text-[8px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
              Financial Forensics
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-[4px] hover:bg-[#F1F5F9] transition cursor-pointer"
          title="Close Navigation Menu (Esc)"
        >
          <X size={15} />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4 min-w-[256px]">
        <div>
          <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
            Workstation Modules
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onSelectTab && onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium transition text-left cursor-pointer border ${isActive
                      ? "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0] border-l-2 border-l-[#2563EB] shadow-2xs"
                      : "border-transparent text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={14}
                      className={isActive ? "text-[#2563EB]" : "text-[#94A3B8]"}
                    />
                    <div className="truncate">
                      <div className="leading-tight font-medium uppercase tracking-wider text-[11px]">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[#64748B] font-normal truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] shrink-0 ml-2 ${item.badgeType === "account"
                          ? "bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] max-w-[80px] truncate"
                          : isActive
                            ? "bg-white text-[#0F172A] border border-[#E2E8F0] shadow-2xs font-semibold"
                            : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
            Workstation Actions
          </div>

          <div className="space-y-1">
            <button
              onClick={() => onOpenSearch()}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-[4px] text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer border border-transparent hover:border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2.5">
                <Search size={13} className="text-[#94A3B8]" />
                <span>Global Search</span>
              </div>
            </button>

            {report && (
              <button
                onClick={() => onOpenCaseFile()}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer border border-transparent hover:border-[#E2E8F0]"
              >
                <FileText size={13} className="text-[#2563EB]" />
                <span>Generate SAR File</span>
              </button>
            )}

            {onUploadClick && (
              <button
                onClick={() => onUploadClick()}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer border border-transparent hover:border-[#E2E8F0]"
              >
                <Upload size={13} className="text-[#94A3B8]" />
                <span>Upload Dataset</span>
              </button>
            )}

            <button
              onClick={() => onLoadDemoData(100)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[4px] text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer border border-transparent hover:border-[#E2E8F0]"
            >
              <FileSpreadsheet size={13} className="text-[#94A3B8]" />
              <span>Sample Dataset</span>
            </button>
          </div>
        </div>

        {/* Active Dataset Ledger */}
        {report?.summary && (
          <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono space-y-1.5">
            <div className="text-[10px] text-[#64748B] uppercase flex items-center justify-between">
              <span>Active Ledger</span>
              <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                <CheckCircle2 size={10} />
                <span>Ingested</span>
              </span>
            </div>
            <div className="text-[11px] text-[#0F172A] flex justify-between pt-1">
              <span className="text-[#64748B]">Entities:</span>
              <span className="font-semibold">{Number(report.summary.total_accounts || 0).toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-[#0F172A] flex justify-between">
              <span className="text-[#64748B]">Txs Audited:</span>
              <span className="font-semibold">{Number(report.summary.total_transactions || 0).toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-[#0F172A] flex justify-between">
              <span className="text-[#64748B]">Flagged Rings:</span>
              <span className="text-amber-700 font-bold">{report.summary.total_fraud_rings || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[10px] font-mono text-[#64748B] flex items-center justify-between min-w-[256px]">
        <span>Forensics Workstation</span>
        <span>v1.0</span>
      </div>
    </aside>
  );
}
