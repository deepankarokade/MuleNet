"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRight,
  ArrowDown,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  TrendingDown,
  CornerDownRight,
  ChevronRight,
  Building2,
  ExternalLink,
  DollarSign,
  FileCheck,
  Activity,
  Layers,
  ArrowLeftRight,
  GitCommit
} from "lucide-react";
import { formatCurrency, formatDeltaTime, traceAccountDossier } from "@/lib/investigationEngine";
import { API_BASE_URL } from "@/lib/apiConfig";
import WhyFlaggedPanel from "@/components/WhyFlaggedPanel";
import TransactionTimeline from "@/components/TransactionTimeline";

export default function InvestigationRoom({
  report,
  selectedAccountId,
  onSelectAccount,
  transactions = []
}) {
  const [currentAccountId, setCurrentAccountId] = useState(selectedAccountId || "");
  const [dossier, setDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeDirection, setActiveDirection] = useState("DOWNSTREAM"); // "DOWNSTREAM" | "UPSTREAM"
  const [flowViewMode, setFlowViewMode] = useState("stepper"); // "stepper" | "timeline"
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [copiedNarrative, setCopiedNarrative] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with prop changes
  useEffect(() => {
    if (selectedAccountId && selectedAccountId !== currentAccountId) {
      setCurrentAccountId(selectedAccountId);
    }
  }, [selectedAccountId]);

  // Default to first high-risk account if none selected
  useEffect(() => {
    if (!currentAccountId && report?.suspicious_accounts?.length > 0) {
      setCurrentAccountId(report.suspicious_accounts[0].account_id);
    }
  }, [report, currentAccountId]);

  // Fetch or trace dossier whenever currentAccountId changes
  useEffect(() => {
    if (!currentAccountId || !report) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg("");
    setSelectedPathIndex(0);

    const loadDossier = async () => {
      try {
        // 1. Try hitting backend POST /api/investigate first
        let loaded = null;
        try {
          const res = await fetch(`${API_BASE_URL}/api/investigate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_id: currentAccountId })
          });
          if (res.ok) {
            loaded = await res.json();
          }
        } catch (beErr) {
          // Backend offline or failed, fallback to client-side
        }

        // 2. Fallback to client-side investigation engine
        if (!loaded) {
          loaded = traceAccountDossier(currentAccountId, report, transactions);
        }

        if (isMounted) {
          setDossier(loaded);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Investigation load error:", err);
          setErrorMsg("Could not reconstruct financial trace for this entity.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDossier();

    return () => {
      isMounted = false;
    };
  }, [currentAccountId, report, transactions]);

  // Quick-pick suspicious accounts list
  const quickPickAccounts = useMemo(() => {
    if (!report?.suspicious_accounts) return [];
    return report.suspicious_accounts.slice(0, 8);
  }, [report]);

  // Filtered accounts for search dropdown
  const filteredSearchAccounts = useMemo(() => {
    if (!searchQuery.trim() || !report?.suspicious_accounts) return [];
    const q = searchQuery.toLowerCase();
    return report.suspicious_accounts
      .filter((acc) => acc.account_id.toLowerCase().includes(q))
      .slice(0, 10);
  }, [searchQuery, report]);

  // Currency detection
  const detectedCurrency = useMemo(() => {
    if (dossier?.downstream_traces?.[0]?.hops?.[0]?.currency) {
      return dossier.downstream_traces[0].hops[0].currency;
    }
    if (dossier?.upstream_traces?.[0]?.hops?.[0]?.currency) {
      return dossier.upstream_traces[0].hops[0].currency;
    }
    return "INR";
  }, [dossier]);

  // Current active paths (Downstream vs Upstream)
  const currentPaths = useMemo(() => {
    if (!dossier) return [];
    return activeDirection === "DOWNSTREAM"
      ? dossier.downstream_traces || []
      : dossier.upstream_traces || [];
  }, [dossier, activeDirection]);

  const activePath = currentPaths[selectedPathIndex] || currentPaths[0] || null;

  const handleCopyNarrative = () => {
    if (!dossier?.case_narrative) return;
    navigator.clipboard.writeText(dossier.case_narrative);
    setCopiedNarrative(true);
    setTimeout(() => setCopiedNarrative(false), 2000);
  };

  const handleCopyAccountId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedAccountId(true);
    setTimeout(() => setCopiedAccountId(false), 1500);
  };

  const handlePivotAccount = (accId) => {
    setCurrentAccountId(accId);
    if (onSelectAccount) {
      onSelectAccount(accId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Subject Switcher & Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mb-1.5 block">
              Investigate Target Entity:
            </span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account identifier..."
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] font-mono"
              />

              {/* Autocomplete dropdown if typing */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-[4px] shadow-lg z-30 max-h-48 overflow-y-auto">
                  {filteredSearchAccounts.length > 0 ? (
                    filteredSearchAccounts.map((acc) => (
                      <button
                        key={acc.account_id}
                        onClick={() => handlePivotAccount(acc.account_id)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] text-xs font-mono flex items-center justify-between border-b border-[#E2E8F0] last:border-0 cursor-pointer"
                      >
                        <span className="text-[#0F172A] font-medium">{acc.account_id}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#64748B]">{acc.role}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] font-mono bg-red-50 text-red-700 border border-red-200">
                            {acc.suspicion_score}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-[#64748B] text-center">No matching entities found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Targets Pick Chips */}
          <div className="w-full md:w-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] mb-1.5 block">
              Flagged Priority Subjects:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPickAccounts.map((acc) => {
                const isActive = acc.account_id === currentAccountId;
                return (
                  <button
                    key={acc.account_id}
                    onClick={() => handlePivotAccount(acc.account_id)}
                    className={`text-[11px] font-mono px-2 py-1 rounded-[3px] transition cursor-pointer border ${
                      isActive
                        ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1] font-semibold"
                        : "bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {acc.account_id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-10 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[#64748B]">Reconstructing multi-hop financial trails...</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-[4px] p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {dossier && !isLoading && (
        <>
          {/* Entity Forensic Header Dossier Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
                    Subject Entity Under Audit
                  </span>
                  {dossier.associated_rings?.length > 0 && (
                    <span className="bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] text-[10px] font-mono font-medium px-2 py-0.5 rounded-[3px]">
                      Part of {dossier.associated_rings.join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold font-mono text-[#0F172A] tracking-tight flex items-center gap-2">
                    <span>{dossier.account_id}</span>
                    <button
                      onClick={() => handleCopyAccountId(dossier.account_id)}
                      title="Copy Account Identifier"
                      className="text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                    >
                      {copiedAccountId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </h1>

                  <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] font-medium bg-red-50 text-red-700 border border-red-200">
                    Risk: {dossier.risk_level} ({dossier.suspicion_score}/100)
                  </span>

                  <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    Role: {dossier.role}
                  </span>
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[3px]">
                  <span className="text-[#64748B] text-[10px] block">Total Inflow</span>
                  <span className="text-[#0F172A] font-semibold text-xs">
                    {formatCurrency(dossier.total_received, detectedCurrency)}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[3px]">
                  <span className="text-[#64748B] text-[10px] block">Total Outflow</span>
                  <span className="text-[#0F172A] font-semibold text-xs">
                    {formatCurrency(dossier.total_sent, detectedCurrency)}
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[3px]">
                  <span className="text-[#64748B] text-[10px] block">Turnover Ratio</span>
                  <span className="text-[#0F172A] font-semibold text-xs">
                    {(dossier.turnover_ratio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[3px]">
                  <span className="text-[#64748B] text-[10px] block">Active Span</span>
                  <span className="text-[#475569] font-semibold text-xs">
                    {dossier.active_span_hours?.toFixed(1) || 0} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Heuristic Flags Banner */}
            {dossier.flags?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                  Forensic Red Flags Triggered:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.flags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono px-2 py-0.5 rounded-[3px] flex items-center gap-1.5"
                    >
                      <AlertTriangle size={11} className="text-amber-600" />
                      <span>{flag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* "Why Flagged?" Evidence Panel */}
          <WhyFlaggedPanel
            score={dossier.suspicion_score}
            riskLevel={dossier.risk_level}
            scoreBreakdown={dossier.score_breakdown}
            evidencePoints={dossier.evidence_points}
            role={dossier.role}
          />

          {/* Money Flow Tracer: "Show me how the money moved" */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-5 space-y-4">
            {/* Header with Direction, View Mode & Path Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                  <Activity className="text-[#2563EB] w-4 h-4" />
                  <span>Money Flow Tracer</span>
                  <span className="text-[11px] font-mono font-normal text-[#64748B]">
                    (Reconstructed Hop Chain)
                  </span>
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Step-by-step audit of capital velocity, inter-hop retention leakage, and intermediary routing.
                </p>
              </div>

              {/* View mode switcher & Direction selector */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Flow Stepper vs Layering Timeline toggle */}
                <div className="inline-flex rounded-[3px] border border-[#E2E8F0] p-0.5 bg-[#F1F5F9]">
                  <button
                    onClick={() => setFlowViewMode("stepper")}
                    className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                      flowViewMode === "stepper"
                        ? "bg-white text-[#0F172A] font-medium border border-[#CBD5E1]"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    <Activity size={11} className="text-[#2563EB]" />
                    <span>Hop Stepper</span>
                  </button>
                  <button
                    onClick={() => setFlowViewMode("timeline")}
                    className={`px-2.5 py-1 text-xs font-mono rounded-[2px] transition cursor-pointer flex items-center gap-1.5 ${
                      flowViewMode === "timeline"
                        ? "bg-white text-[#0F172A] font-medium border border-[#CBD5E1]"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    <Clock size={11} className="text-[#64748B]" />
                    <span>Layering Timeline</span>
                  </button>
                </div>

                {/* Direction selector */}
                {flowViewMode === "stepper" && (
                  <div className="inline-flex rounded-[3px] border border-[#E2E8F0] p-0.5 bg-[#F1F5F9]">
                    <button
                      onClick={() => {
                        setActiveDirection("DOWNSTREAM");
                        setSelectedPathIndex(0);
                      }}
                      className={`px-3 py-1 text-xs font-mono rounded-[2px] transition cursor-pointer ${
                        activeDirection === "DOWNSTREAM"
                          ? "bg-white text-[#0F172A] font-medium border border-[#CBD5E1]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Downstream Outflows ({dossier.downstream_traces?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        setActiveDirection("UPSTREAM");
                        setSelectedPathIndex(0);
                      }}
                      className={`px-3 py-1 text-xs font-mono rounded-[2px] transition cursor-pointer ${
                        activeDirection === "UPSTREAM"
                          ? "bg-white text-[#0F172A] font-medium border border-[#CBD5E1]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      Upstream Sources ({dossier.upstream_traces?.length || 0})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* If Timeline mode selected, render TransactionTimeline */}
            {flowViewMode === "timeline" ? (
              <TransactionTimeline
                transactions={transactions}
                selectedAccountId={currentAccountId}
                onSelectAccount={handlePivotAccount}
                currency={detectedCurrency}
              />
            ) : (
              <>
                {/* Path selector tabs if multiple routes found */}
                {currentPaths.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-mono text-[#64748B] uppercase">Discovered Routes:</span>
                    {currentPaths.map((path, idx) => (
                      <button
                        key={path.path_id}
                        onClick={() => setSelectedPathIndex(idx)}
                        className={`text-xs font-mono px-3 py-1 rounded-[3px] transition border cursor-pointer whitespace-nowrap ${
                          selectedPathIndex === idx
                            ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1] font-semibold"
                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]"
                        }`}
                      >
                        {path.path_id} ({path.total_hops} hops • {formatCurrency(path.initial_amount, detectedCurrency)})
                      </button>
                    ))}
                  </div>
                )}

                {/* Path Overview Banner */}
                {activePath && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3 text-[#475569]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B]">Route Topology:</span>
                      <span className="text-[#0F172A] font-medium">{activePath.source_node}</span>
                      <ArrowRight size={13} className="text-[#94A3B8]" />
                      <span className="text-[#475569]">{activePath.total_hops} intermediate hops</span>
                      <ArrowRight size={13} className="text-[#94A3B8]" />
                      <span className="text-[#0F172A] font-medium">{activePath.target_node}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[#64748B]">Initial Volume: </span>
                        <span className="text-[#0F172A] font-semibold">
                          {formatCurrency(activePath.initial_amount, detectedCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Retained Fee: </span>
                        <span className="text-[#0F172A] font-semibold">
                          {formatCurrency(activePath.total_retained, detectedCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Total Span: </span>
                        <span className="text-[#0F172A]">{activePath.total_span_hours.toFixed(1)} hrs</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Step-by-Step Hop Trail */}
                {activePath && activePath.hops?.length > 0 ? (
                  <div className="relative border-l-2 border-[#CBD5E1] ml-4 pl-6 space-y-4 py-2">
                    {activePath.hops.map((hop, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === activePath.hops.length - 1;

                      return (
                        <div key={idx} className="relative group">
                          {/* Hop Circle Node Indicator on Left Line */}
                          <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#94A3B8] flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-[#94A3B8]" />
                          </div>

                          {/* Hop Card */}
                          <div className="bg-[#F8FAFC] border border-[#E2E8F0] group-hover:border-[#CBD5E1] transition rounded-[4px] p-3.5 space-y-3">
                            {/* Top Hop Meta Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2 text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="bg-white text-[#0F172A] px-2 py-0.5 rounded-[3px] font-mono text-[11px] border border-[#E2E8F0]">
                                  HOP #{hop.hop_number}
                                </span>
                                <span className="text-[#64748B] text-[11px]">{hop.timestamp}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Time elapsed between hops */}
                                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                                  <Clock size={12} className="text-[#94A3B8]" />
                                  <span>Inter-Hop Elapsed: </span>
                                  <span className="text-[#0F172A] font-medium">{hop.time_delta_display}</span>
                                </div>

                                {/* Retained Leakage / Fee */}
                                {idx > 0 && (
                                  <div className="flex items-center gap-1 text-[11px]">
                                    <TrendingDown size={12} className="text-[#94A3B8]" />
                                    <span className="text-[#64748B]">Fee Retained: </span>
                                    <span className="text-[#0F172A] font-medium">
                                      {formatCurrency(hop.retained_amount, hop.currency)} ({hop.retained_percent}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* From & To Entities with Risk Badges */}
                            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center font-mono">
                              {/* From Account Box */}
                              <div className="md:col-span-5 bg-white border border-[#E2E8F0] p-3 rounded-[3px] space-y-1.5">
                                <span className="text-[10px] uppercase text-[#64748B] tracking-wider block">
                                  Transfer Origin
                                </span>
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => handlePivotAccount(hop.from_account)}
                                    className="text-xs font-medium text-[#0F172A] hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Investigate this account"
                                  >
                                    <span>{hop.from_account}</span>
                                    <ExternalLink size={11} className="text-[#2563EB]" />
                                  </button>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] font-mono bg-red-50 text-red-700 border border-red-200">
                                    {hop.from_account_risk} ({hop.from_account_score})
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#64748B]">Role: {hop.from_account_role}</div>
                              </div>

                              {/* Transfer Amount Pillar in Center */}
                              <div className="md:col-span-1 text-center py-1">
                                <div className="flex flex-col items-center justify-center">
                                  <ArrowRight className="text-[#94A3B8] w-4 h-4 hidden md:block" />
                                  <ArrowDown className="text-[#94A3B8] w-4 h-4 md:hidden" />
                                </div>
                              </div>

                              {/* To Account Box */}
                              <div className="md:col-span-5 bg-white border border-[#E2E8F0] p-3 rounded-[3px] space-y-1.5">
                                <span className="text-[10px] uppercase text-[#64748B] tracking-wider block">
                                  Transfer Destination
                                </span>
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => handlePivotAccount(hop.to_account)}
                                    className="text-xs font-medium text-[#0F172A] hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Investigate this account"
                                  >
                                    <span>{hop.to_account}</span>
                                    <ExternalLink size={11} className="text-[#2563EB]" />
                                  </button>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] font-mono bg-red-50 text-red-700 border border-red-200">
                                    {hop.to_account_risk} ({hop.to_account_score})
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#64748B]">Role: {hop.to_account_role}</div>
                              </div>
                            </div>

                            {/* Amount & Description Bottom Bar */}
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-[3px] border border-[#E2E8F0] text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-[#64748B]">Transferred Amount:</span>
                                <span className="text-base font-bold text-[#0F172A]">
                                  {formatCurrency(hop.amount, hop.currency)}
                                </span>
                              </div>
                              {hop.description && (
                                <span className="text-[11px] text-[#64748B] italic">
                                  Channel / Memo: {hop.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-8 text-center text-[#64748B] text-xs font-mono">
                    No multi-hop paths found in this direction for entity {currentAccountId}.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Official SAR Forensic Narrative & Compliance Dossier */}
          <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="text-[#2563EB] w-4 h-4" />
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Suspicious Activity Report (SAR) Case File
                </h3>
              </div>

              <button
                onClick={handleCopyNarrative}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] transition cursor-pointer"
              >
                {copiedNarrative ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-[#64748B]" />
                    <span>Copy Case Narrative</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-4 font-mono text-xs text-[#334155] whitespace-pre-wrap leading-relaxed">
              {dossier.case_narrative}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
