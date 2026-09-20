"use client";

import {
  AlertTriangle,
  ArrowRight,
  SlidersHorizontal,
  Layers
} from "lucide-react";
import TransactionTimeline from "@/components/TransactionTimeline";

export default function ForensicStoryboard({
  report,
  activeRingId,
  onSelectRing,
  onSelectAccount,
  hideCleanNodes,
  onToggleHideClean,
  transactions = []
}) {
  if (!report || !report.fraud_rings || report.fraud_rings.length === 0) {
    return null;
  }

  const rings = report.fraud_rings;
  const activeRing = rings.find((r) => r.ring_id === activeRingId);

  const isINR = report?.summary?.currency === "INR" || 
    transactions.some((t) => t.currency === "INR" || String(t.sender_account).includes("INR"));

  // Helper to generate chronological narrative & flow for each ring
  const getRingStory = (ring) => {
    if (!ring) return null;

    const pattern = ring.primary_pattern || "";
    let schemeType = "Coordinated Laundering Network";
    let explanation = ring.description;
    let recommendation = "Suggested action: Evaluate for potential SAR filing and review conduit accounts.";
    let flowSteps = [];

    if (pattern.includes("Cycle") || pattern.includes("Circular")) {
      const count = ring.member_count;
      schemeType = `${count}-Hop Circular Fund Routing (Closed Loop)`;
      explanation = `A coordinated ring of ${count} accounts routed $${Number(
        ring.total_funds_routed
      ).toLocaleString()} sequentially in a closed circuit, returning 100% of capital to the originator to fabricate turnover.`;
      recommendation = `SUGGESTED ACTION: Evaluate accounts for potential SAR filing regarding circular turnover; review conduit activity.`;

      if (ring.member_accounts && ring.member_accounts.length > 0) {
        flowSteps = ring.member_accounts.map((acc, idx) => ({
          account: acc,
          nextAccount: ring.member_accounts[(idx + 1) % ring.member_accounts.length],
          amount: Math.round(ring.total_funds_routed / count),
          isOrigin: acc === ring.orchestrator
        }));
      }
    } else if (pattern.includes("Shell") || pattern.includes("Chain")) {
      const members = ring.member_accounts || [];
      const origin = ring.orchestrator || members[0] || "Origin Entity";
      const dest = members.length > 1 ? members[members.length - 1] : "Settlement Account";
      const intermediaryCount = Math.max(0, members.length - 2);
      const hopAmt = members.length > 1 ? Math.round(ring.total_funds_routed / (members.length - 1)) : ring.total_funds_routed;

      schemeType = "Layered Multi-Hop Shell Pipeline";
      explanation = `Capital from ${origin} was funneled through ${intermediaryCount} intermediary conduit account(s) before settling at ${dest} (${ring.total_funds_routed > 0 ? (isINR ? '₹' : '$') + Number(ring.total_funds_routed).toLocaleString() : 'high velocity'}).`;
      recommendation = `SUGGESTED ACTION: Trace ultimate beneficial ownership (UBO) of intermediary entities; evaluate provisional debit-review.`;

      if (members.length > 1) {
        flowSteps = members.slice(0, members.length - 1).map((acc, idx) => ({
          account: acc,
          nextAccount: members[idx + 1],
          amount: hopAmt,
          isOrigin: idx === 0
        }));
      }
    } else if (pattern.includes("Smurf") || pattern.includes("Fan")) {
      const hub = ring.orchestrator || (ring.member_accounts && ring.member_accounts[0]) || "Aggregator Hub";
      const mules = (ring.member_accounts || []).filter((a) => a !== hub);
      const muleCount = mules.length || 1;
      const smurfAmt = Math.round((ring.total_funds_routed || 0) / Math.max(1, muleCount));

      schemeType = "Structuring & Smurfing Aggregator Hub";
      explanation = `${muleCount} feeder entity accounts coordinated structured transfers totaling ${isINR ? '₹' : '$'}${Number(ring.total_funds_routed || 0).toLocaleString()} into central aggregator hub ${hub}.`;
      recommendation = `SUGGESTED ACTION: Review structured fund flows for potential regulatory SAR; flag aggregator account for priority compliance triage.`;

      flowSteps = mules.slice(0, 8).map((mule) => ({
        account: mule,
        nextAccount: hub,
        amount: smurfAmt > 0 ? smurfAmt : 9500,
        isOrigin: false
      }));
    }

    return { schemeType, explanation, recommendation, flowSteps };
  };

  const story = getRingStory(activeRing);

  return (
    <div className="space-y-3">
      {/* 1. Ring Filter & Controls Strip */}
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full lg:w-auto">
          <span className="text-xs font-mono text-[#64748B] uppercase tracking-wider shrink-0 px-2">
            Scope:
          </span>

          {/* All Rings Button */}
          <button
            onClick={() => onSelectRing("ALL")}
            className={`px-3 py-1 rounded-[4px] text-xs font-medium font-mono transition cursor-pointer shrink-0 border ${
              activeRingId === "ALL"
                ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]"
                : "bg-transparent text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0] hover:border-[#CBD5E1]"
            }`}
          >
            All Rings ({rings.length})
          </button>

          {/* Individual Ring Buttons */}
          {rings.map((ring) => {
            const isSelected = activeRingId === ring.ring_id;
            const isCritical = ring.severity === "CRITICAL";
            const isHigh = ring.severity === "HIGH";

            return (
              <button
                key={ring.ring_id}
                onClick={() => onSelectRing(ring.ring_id)}
                className={`px-3 py-1 rounded-[4px] text-xs font-mono font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]"
                    : "bg-transparent text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0] hover:border-[#CBD5E1]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCritical ? "bg-red-500" : isHigh ? "bg-amber-500" : "bg-yellow-500"
                  }`}
                />
                <span>{ring.ring_id}</span>
                <span className="text-[#94A3B8] text-[10px]">
                  ${Math.round(ring.total_funds_routed / 1000)}k
                </span>
              </button>
            );
          })}
        </div>

        {/* Noise Filter Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onToggleHideClean}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] font-mono text-xs font-medium cursor-pointer border transition ${
              hideCleanNodes
                ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]"
                : "bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]"
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>{hideCleanNodes ? "Noise Filter: Active" : "Noise Filter: Off"}</span>
          </button>
        </div>
      </div>

      {/* 2. Ring Narrative Card */}
      {activeRing && story ? (
        <div
          className={`bg-white border border-[#E2E8F0] rounded-[4px] p-4 sm:p-5 relative ${
            activeRing.severity === "CRITICAL"
              ? "border-l-2 border-l-red-500"
              : activeRing.severity === "HIGH"
              ? "border-l-2 border-l-amber-500"
              : "border-l-2 border-l-[#94A3B8]"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            {/* Left: Scheme Name & Forensic Narrative */}
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-[3px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]">
                  {activeRing.ring_id}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-[3px] uppercase border bg-amber-50 text-amber-800 border-amber-200">
                  {activeRing.severity} • RISK SCORE {activeRing.risk_score}
                </span>
                <span className="text-[#64748B] text-xs font-mono">
                  {activeRing.member_count} Accounts Involved
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <Layers className="text-[#2563EB] w-4 h-4 shrink-0" />
                <span>{story.schemeType}</span>
              </h3>

              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {story.explanation}
              </p>

              {/* Actionable Forensics Recommendation */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-[4px] p-2.5 flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span><strong className="text-amber-900">Action:</strong> {story.recommendation}</span>
              </div>
            </div>

            {/* Right: Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 shrink-0 font-mono text-xs w-full lg:w-52">
              <div className="bg-[#F8FAFC] p-2.5 rounded-[3px] border border-[#E2E8F0]">
                <span className="text-[#64748B] text-[10px] block">Routed Capital</span>
                <span className="text-[#0F172A] font-semibold text-sm">
                  ${Number(activeRing.total_funds_routed).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-[3px] border border-[#E2E8F0]">
                <span className="text-[#64748B] text-[10px] block">Primary Entity</span>
                <button
                  onClick={() => onSelectAccount && onSelectAccount(activeRing.orchestrator)}
                  className="text-[#2563EB] font-semibold hover:underline cursor-pointer truncate block text-left"
                  title="Click to locate in graph"
                >
                  {activeRing.orchestrator}
                </button>
              </div>
            </div>
          </div>

          {/* 3. Chronological Transaction Timeline */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
            <TransactionTimeline
              ring={activeRing}
              transactions={transactions}
              onSelectAccount={onSelectAccount}
            />
          </div>
        </div>
      ) : (
        /* Overview Banner when ALL is selected */
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <span>Summary: {rings.length} Detected Fraud Typologies</span>
              </h3>
              <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
                MuleNet flagged {report.summary?.total_suspicious_accounts || 0} suspicious accounts routing{" "}
                <span className="text-[#0F172A] font-medium">
                  ${Number(report.summary.total_suspicious_volume).toLocaleString()}
                </span>{" "}
                across circular loops, layered shells, and smurfing hubs. Legitimate commercial and payroll counterparties have been isolated.
              </p>
            </div>

            <div className="bg-[#F8FAFC] px-3 py-2 rounded-[3px] border border-[#E2E8F0] text-xs font-mono shrink-0">
              <span className="text-[#64748B] text-[10px] block">Active View</span>
              <span className="text-[#0F172A] font-medium">
                {hideCleanNodes ? "Fraud Nodes Only" : "Entire Topology"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
