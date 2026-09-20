"use client";

import { useMemo } from "react";
import {
  ShieldAlert,
  Repeat,
  Share2,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Zap
} from "lucide-react";

export default function NetworkOverview({
  report,
  onNavigateTab,
  onSelectRing,
  onSelectAccount,
  transactions = []
}) {
  if (!report || !report.summary) {
    return (
      <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-10 text-center space-y-3 shadow-2xs">
        <div className="w-10 h-10 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] flex items-center justify-center text-[#2563EB] mx-auto">
          <TrendingUp className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#172033]">No Active Transaction Ledger</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
          Upload a financial transaction CSV or load the sample dataset above to initiate graph cycle detection, flow tracing, and network reconstruction.
        </p>
      </div>
    );
  }

  const summary = report.summary;
  const rings = report.fraud_rings || [];
  const accounts = report.suspicious_accounts || [];

  // Determine currency formatting
  const isINR = useMemo(() => {
    if (summary.currency === "INR") return true;
    if (transactions.some((t) => t.currency === "INR" || String(t.sender_account).includes("INR"))) return true;
    if (rings.some((r) => r.primary_pattern?.includes("INR") || r.ring_id?.includes("INR"))) return true;
    if (accounts.some((a) => a.account_id?.includes("INR"))) return true;
    return false;
  }, [summary, transactions, rings, accounts]);

  const curr = isINR ? "₹" : "$";

  // Calculate total network volume analyzed across all transactions
  const totalVolumeAnalyzed = useMemo(() => {
    if (transactions && transactions.length > 0) {
      return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }
    return (summary.total_suspicious_volume || 0) * 8.5; // fallback estimate
  }, [transactions, summary]);

  // Format currency numbers concisely (e.g. ₹185.6M, $5.2M)
  const formatCompactVolume = (val) => {
    if (!val || isNaN(val)) return `${curr}0`;
    if (val >= 10000000) {
      return `${curr}${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 1000000) {
      return `${curr}${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 100000) {
      return `${curr}${(val / 100000).toFixed(1)}L`;
    }
    if (val >= 1000) {
      return `${curr}${(val / 1000).toFixed(0)}K`;
    }
    return `${curr}${Math.round(val).toLocaleString()}`;
  };

  // Typology counts
  const typologies = useMemo(() => {
    let cycles = 0;
    let smurfing = 0;
    let shell = 0;

    rings.forEach((r) => {
      const p = (r.primary_pattern || "").toLowerCase();
      if (p.includes("cycle") || p.includes("circular")) cycles++;
      else if (p.includes("smurf") || p.includes("fan")) smurfing++;
      else if (p.includes("shell") || p.includes("chain")) shell++;
      else shell++;
    });

    return {
      cycles: cycles || report.report_metadata?.total_cycles_detected || 0,
      smurfing: smurfing || report.report_metadata?.total_smurfing_networks || 0,
      shell: shell || report.report_metadata?.total_shell_chains || 0
    };
  }, [rings, report]);

  // Exact percentage calculation with proper denominator
  const totalAccounts = summary.total_accounts || 1;
  const flaggedCount = summary.total_suspicious_accounts || 0;
  const normalCount = Math.max(0, totalAccounts - flaggedCount);
  const flaggedRatio = (flaggedCount / totalAccounts) * 100;
  const flaggedPctDisplay = flaggedRatio < 0.1 && flaggedRatio > 0 ? "<0.1" : flaggedRatio.toFixed(1);
  const normalRatio = (normalCount / totalAccounts) * 100;
  const normalPctDisplay = normalRatio > 99.9 && normalRatio < 100 ? ">99.9" : normalRatio.toFixed(1);

  // Top priority rings (highest risk / volume)
  const priorityRings = useMemo(() => {
    return [...rings]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0) || (b.total_funds_routed || 0) - (a.total_funds_routed || 0))
      .slice(0, 4);
  }, [rings]);

  // Top priority accounts
  const priorityAccounts = useMemo(() => {
    return [...accounts]
      .sort((a, b) => (b.suspicion_score || 0) - (a.suspicion_score || 0))
      .slice(0, 4);
  }, [accounts]);

  return (
    <div className="space-y-4">
      {/* Overview Banner & Quick Actions */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#64748B]">
                Surveillance & Reconstruction
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-xs text-[#475569] font-mono">
                {Number(summary.total_accounts || 0).toLocaleString()} Monitored Entities
              </span>
            </div>
            <h2 className="text-base font-semibold text-[#0F172A] tracking-tight">
              Network Forensic Overview
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Behavioral pattern classification, coordinated ring triage, and topological fund tracing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab("investigate")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-[4px] transition cursor-pointer"
            >
              <Activity size={13} className="text-[#2563EB]" />
              <span>Investigation Room</span>
            </button>
            <button
              onClick={() => onNavigateTab("ring_investigation")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-[4px] transition cursor-pointer"
            >
              <ShieldAlert size={13} className="text-amber-600" />
              <span>Networks ({rings.length})</span>
            </button>
            <button
              onClick={() => onNavigateTab("graph")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-[4px] transition cursor-pointer"
            >
              <Zap size={13} className="text-[#0F172A]" />
              <span>Network Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Active Investigations (2/3) + Risk Distribution (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Investigations (2/3) */}
        <div className="lg:col-span-2 bg-white border border-[#DCE1E7] rounded-[4px] p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE1E7] pb-2.5">
            <div>
              <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Priority Triage</div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033]">
                Active Network Investigations
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("ring_investigation")}
              className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>View All ({rings.length})</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-2">
            {priorityRings.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748B]">No suspicious networks detected in current dataset.</div>
            ) : (
              priorityRings.map((ring) => (
                <div
                  key={ring.ring_id}
                  onClick={() => {
                    onSelectRing?.(ring.ring_id);
                    onNavigateTab("ring_investigation");
                  }}
                  className="p-3 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] hover:border-[#CBD5E1] hover:bg-[#F1F5F9] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-[#172033] group-hover:underline">
                        {ring.ring_id}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-red-50 border border-red-200 text-red-700 font-semibold">
                        RISK {ring.risk_score}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-white border border-[#DCE1E7] text-[#475569]">
                        {ring.member_count} ACCOUNTS
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      {ring.primary_pattern || "Layered Shell Pipeline"} • Pattern consistent with coordinated money movement
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-[#DCE1E7] pt-2 sm:pt-0">
                    <div className="text-xs font-mono font-semibold text-[#172033]">
                      {formatCompactVolume(ring.total_funds_routed)}
                    </div>
                    <span className="text-[10px] text-[#2563EB] group-hover:text-[#1D4ED8] inline-flex items-center gap-1 font-medium">
                      Investigate <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Distribution (1/3) */}
        <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-4 space-y-3 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Entity Verification</div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] border-b border-[#DCE1E7] pb-2.5">
              Risk Distribution
            </h3>

            <div className="space-y-3 mt-3">
              {/* Denominator breakdown */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[#475569]">Flagged Accounts</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-red-600 font-semibold">{flaggedCount.toLocaleString()}</span>
                  <span className="text-[#64748B] text-[10px] ml-1">({flaggedPctDisplay}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[#475569]">Normal Accounts</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[#172033] font-semibold">{normalCount.toLocaleString()}</span>
                  <span className="text-[#64748B] text-[10px] ml-1">({normalPctDisplay}%)</span>
                </div>
              </div>

              {/* Progress Bar with true proportion */}
              <div className="h-2 w-full bg-[#DCE1E7] rounded-[2px] overflow-hidden flex border border-[#CBD5E1]">
                <div
                  style={{ width: `${Math.max(1, Math.min(99, 100 - flaggedRatio))}%` }}
                  className="bg-emerald-600"
                  title={`Normal: ${normalCount.toLocaleString()}`}
                />
                <div
                  style={{ width: `${Math.max(1, Math.min(99, flaggedRatio))}%` }}
                  className="bg-red-600"
                  title={`Flagged: ${flaggedCount.toLocaleString()}`}
                />
              </div>

              <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] text-[11px] text-[#64748B] leading-relaxed">
                Denominator: <span className="font-mono text-[#172033] font-medium">{totalAccounts.toLocaleString()} total monitored accounts</span>. Accounts exceeding behavioral suspicion thresholds are isolated for investigation.
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#DCE1E7] flex items-center justify-between text-[11px]">
            <span className="text-[#64748B]">Detection Engine</span>
            <span className="font-mono text-[#172033] font-medium">{report.report_metadata?.version || "Python Graph Engine"}</span>
          </div>
        </div>
      </div>

      {/* Lower Row: Network Topology & Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Typology Patterns Breakdown */}
        <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE1E7] pb-2.5">
            <div>
              <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Classification</div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#172033]">
                Network Typologies
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7]">
              <div className="flex items-center gap-2">
                <Repeat size={13} className="text-[#64748B]" />
                <div>
                  <div className="text-xs font-medium text-[#172033]">Circular Routing</div>
                  <div className="text-[10px] text-[#64748B]">Closed cycles of length 3-5</div>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-[#172033] px-2 py-0.5 rounded-[3px] bg-white border border-[#DCE1E7]">
                {typologies.cycles}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7]">
              <div className="flex items-center gap-2">
                <Share2 size={13} className="text-[#64748B]" />
                <div>
                  <div className="text-xs font-medium text-[#172033]">Smurfing Clusters</div>
                  <div className="text-[10px] text-[#64748B]">Fan-in / Fan-out aggregators</div>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-[#172033] px-2 py-0.5 rounded-[3px] bg-white border border-[#DCE1E7]">
                {typologies.smurfing}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7]">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-[#64748B]" />
                <div>
                  <div className="text-xs font-medium text-[#172033]">Layered Shell Chains</div>
                  <div className="text-[10px] text-[#64748B]">Rapid forwarding conduits</div>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-[#172033] px-2 py-0.5 rounded-[3px] bg-white border border-[#DCE1E7]">
                {typologies.shell}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Flagged Accounts */}
        <div className="lg:col-span-2 bg-white border border-[#DCE1E7] rounded-[4px] p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#DCE1E7] pb-2.5">
            <div>
              <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Entity Triage</div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033]">
                High-Risk Flagged Accounts
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("table")}
              className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>View Accounts Directory ({accounts.length})</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {priorityAccounts.map((acc) => (
              <div
                key={acc.account_id}
                onClick={() => {
                  onSelectAccount?.(acc.account_id);
                  onNavigateTab("investigate");
                }}
                className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#DCE1E7] hover:border-[#CBD5E1] hover:bg-[#F1F5F9] transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#172033] group-hover:underline">
                      {acc.account_id}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-red-50 border border-red-200 text-red-700 font-semibold">
                      {acc.suspicion_score}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    Role: {acc.role} • {acc.transaction_count || 2} Hops
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-[#172033]">
                    {formatCompactVolume(acc.total_turnover || acc.total_received)}
                  </div>
                  <span className="text-[10px] text-[#2563EB] group-hover:text-[#1D4ED8] inline-flex items-center gap-1 font-medium">
                    Audit <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
