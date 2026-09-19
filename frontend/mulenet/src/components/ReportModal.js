"use client";

import { useState } from "react";
import { Download, Copy, Check, X, FileJson } from "lucide-react";

export default function ReportModal({ report, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const jsonString = JSON.stringify(report, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mulenet_forensics_report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <FileJson className="w-4 h-4 text-[#2563EB]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Forensic Intelligence Export</h3>
              <p className="text-xs text-[#64748B]">Standardized JSON audit record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-medium rounded-[4px] border border-[#E2E8F0] transition cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#64748B]" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-[4px] transition cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#64748B] hover:text-[#0F172A] rounded hover:bg-[#F1F5F9] transition ml-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-[#334155] bg-[#F8FAFC]">
          <pre className="whitespace-pre-wrap leading-relaxed">{jsonString}</pre>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-xs text-[#64748B] font-mono">
          <span>Suspicious Entities: {report.summary?.total_suspicious_accounts || 0}</span>
          <span>Duration: {report.report_metadata?.analysis_duration_ms || 0} ms</span>
        </div>
      </div>
    </div>
  );
}
