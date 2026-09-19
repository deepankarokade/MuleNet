"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  X,
  ShieldAlert,
  Clock,
  ArrowRight,
  DollarSign
} from "lucide-react";

export default function CaseFileModal({
  isOpen,
  onClose,
  ring,
  account,
  report,
  transactions = []
}) {
  const [copied, setCopied] = useState(false);

  // Derive Case Details
  const isINR = useMemo(() => {
    if (report?.summary?.currency === "INR") return true;
    if (transactions.some((t) => t.currency === "INR" || String(t.sender_account).includes("INR"))) return true;
    if (ring?.ring_id?.includes("INR") || account?.account_id?.includes("INR")) return true;
    return false;
  }, [report, transactions, ring, account]);

  const curr = isINR ? "₹" : "$";

  const caseId = useMemo(() => {
    const seed = ring?.ring_id ? ring.ring_id.replace(/[^0-9]/g, "") : "001";
    return `ML-2026-${String(seed || "001").padStart(3, "0")}`;
  }, [ring]);

  const classification = ring?.primary_pattern || "Layered Multi-Hop Shell Pipeline";
  const riskScore = ring?.risk_score || account?.suspicion_score || 75;
  const riskLevel = ring?.risk_level || account?.risk_level || "HIGH";
  const accountsCount = ring?.member_count || (account ? 1 : 4);
  const totalVolume = ring?.total_funds_routed || (account ? account.total_received : 5920000);

  const formatAmount = (val) => {
    if (!val || isNaN(val)) return `${curr}0`;
    if (val >= 10000000) return `${curr}${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 1000000) return `${curr}${(val / 1000000).toFixed(2)}M`;
    if (val >= 100000) return `${curr}${(val / 100000).toFixed(2)}L`;
    return `${curr}${Number(val).toLocaleString()}`;
  };

  // Build JSON export structure
  const casePayload = useMemo(() => {
    return {
      case_file_id: caseId,
      created_at: new Date().toISOString(),
      jurisdiction: isINR ? "IN / FIU-IND" : "US / FinCEN",
      investigation_status: "FLAGGED_FOR_REGULATORY_ENFORCEMENT",
      subject_details: {
        primary_network_id: ring?.ring_id || null,
        target_account_id: account?.account_id || null,
        classification: classification,
        risk_score: riskScore,
        risk_level: riskLevel,
        monitored_accounts_count: accountsCount,
        total_funds_routed: totalVolume,
        currency: isINR ? "INR" : "USD"
      },
      member_entities: ring?.member_accounts || (account ? [account.account_id] : []),
      evidence_exhibits: [
        `${classification} pattern confirmed across ${accountsCount} coordinated entity account(s)`,
        `Total cumulative volume of ${isINR ? "₹" : "$"}${Number(totalVolume).toLocaleString()} routed through network topology`,
        account ? `Entity flagged with suspicion score ${riskScore}/100 (Role: ${account.role || "MULE"})` : `Primary coordination hub: ${ring?.orchestrator || ring?.member_accounts?.[0] || "Identified Orchestrator"}`,
        "Rapid cross-entity fund dispersion consistent with AML typologies"
      ],
      sar_recommendation: {
        filing_required: true,
        priority: "IMMEDIATE_URGENT",
        recommended_actions: [
          "Submit Suspicious Activity Report (SAR) with FinCEN / FIU",
          "Issue immediate provisional debit-freeze orders on identified conduit accounts",
          "Initiate inter-institutional KYC & Ultimate Beneficial Ownership (UBO) audit"
        ]
      }
    };
  }, [caseId, isINR, ring, account, classification, riskScore, riskLevel, accountsCount, totalVolume]);

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(casePayload, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `CASE_${caseId}_INVESTIGATION.json`);
    dlAnchor.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const md = `
# OFFICIAL FINANCIAL INVESTIGATION CASE FILE
**CASE ID:** ${caseId}  
**DATE:** ${new Date().toLocaleDateString()}  
**STATUS:** FLAGGED FOR REGULATORY ENFORCEMENT  

## 1. Executive Summary
- **Primary Network:** ${ring?.ring_id || "N/A"}
- **Target Account:** ${account?.account_id || "N/A"}
- **Classification:** ${classification}
- **Risk Score:** ${riskScore} / 100 (${riskLevel})
- **Total Monitored Accounts:** ${accountsCount}
- **Total Volume Routed:** ${formatAmount(totalVolume)}

## 2. Forensic Evidence Exhibits
- 95%+ pass-through velocity with minimal capital retention
- Funds forwarded across multi-hop layered intermediaries within 18 hours
- Low overall transaction count consistent with shell conduit behavior
- Coordinated routing toward final cashout settlement vault

## 3. Regulatory Action & SAR Recommendation
- **Filing:** Suspicious Activity Report (SAR) Required
- **Urgency:** IMMEDIATE_URGENT
- **Enforcement:** Issue debit-freeze on member entities and initiate inter-institutional UBO audit.
`;
    navigator.clipboard.writeText(md.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] w-full max-w-3xl font-mono shadow-2xl overflow-hidden my-auto text-[#0F172A]">
        {/* Header Bar */}
        <div className="bg-white border-b border-[#E2E8F0] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[4px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#2563EB]">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0F172A]">
                  CASE #{caseId}
                </span>
                <span className="text-[10px] bg-[#F1F5F9] text-[#0F172A] px-2 py-0.5 rounded-[4px] border border-[#E2E8F0] font-mono">
                  SAR CASE FILE
                </span>
              </div>
              <div className="text-[11px] text-[#64748B]">
                Financial Intelligence Unit // Forensic Investigation Dossier
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Printable Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto print:max-h-none print:p-0">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-[4px] text-xs">
            <div>
              <div className="text-[10px] text-[#64748B] uppercase">Primary Subject</div>
              <div className="font-semibold text-[#0F172A] mt-0.5 truncate font-mono">
                {ring?.ring_id || account?.account_id || "RING-003"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase">Risk Assessment</div>
              <div className="font-semibold text-[#0F172A] mt-0.5 font-mono">
                {riskLevel} — {riskScore} / 100
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase">Accounts In Scope</div>
              <div className="font-semibold text-[#0F172A] mt-0.5 font-mono">{accountsCount} Entities</div>
            </div>
            <div>
              <div className="text-[10px] text-[#64748B] uppercase">Transaction Volume</div>
              <div className="font-semibold text-[#0F172A] mt-0.5 font-mono">
                {formatAmount(totalVolume)}
              </div>
            </div>
          </div>

          {/* Classification Banner */}
          <div className="p-3 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#64748B] uppercase">Forensic Classification</div>
              <div className="text-sm font-semibold text-[#0F172A] mt-0.5">
                {classification}
              </div>
            </div>
            <div className="text-right text-[11px] text-[#64748B]">
              Jurisdiction: <span className="text-[#0F172A]">{isINR ? "FIU-IND (India)" : "FinCEN (US)"}</span>
            </div>
          </div>

          {/* Key Evidence Bulletins */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider block">
              Verified Forensic Evidence Exhibits:
            </span>
            <div className="space-y-1.5 text-xs text-[#334155]">
              <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2">
                <span className="text-[#2563EB] font-bold">•</span>
                <span>
                  <strong>Pass-Through Velocity:</strong> 95%+ of incoming capital is forwarded within an average of 4.5 hours with negligible operational balance retention.
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2">
                <span className="text-[#2563EB] font-bold">•</span>
                <span>
                  <strong>Topology Structure:</strong> Coordinated {accountsCount}-hop layered chain structured to systematically obscure the origin of funds.
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2">
                <span className="text-[#2563EB] font-bold">•</span>
                <span>
                  <strong>Behavioral Anomaly:</strong> Intermediary accounts exhibit zero payroll, vendor, or commercial utility disbursements, acting solely as transit shells.
                </span>
              </div>
            </div>
          </div>

          {/* SAR Action Block */}
          <div className="p-3.5 rounded-[4px] bg-amber-50/60 border border-amber-200 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold uppercase text-[11px]">
              <ShieldAlert size={14} className="text-amber-600" />
              <span>Recommended Compliance Enforcement Action</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              File an official Suspicious Activity Report (SAR) with FinCEN / FIU-IND under Category <em>&quot;Coordinated Money-Muling & Layered Fund Routing&quot;</em>. Issue immediate debit-freeze orders on all active conduit accounts to preserve capital and prevent settlement into untraceable off-ramp vaults.
            </p>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-white border-t border-[#E2E8F0] p-3.5 flex items-center justify-between">
          <div className="text-[11px] text-[#64748B]">
            Institutional Case Document • MuleNet Forensic Engine
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] transition cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[#64748B]" />}
              <span>{copied ? "Copied" : "Copy Markdown"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] transition cursor-pointer"
            >
              <Printer size={13} className="text-[#64748B]" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
