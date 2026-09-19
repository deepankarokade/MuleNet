"use client";

import { useMemo } from "react";
import {
  ShieldAlert,
  Layers,
  Repeat,
  Share2,
  Clock,
  Network,
  CheckCircle2,
  Info,
  ArrowRight
} from "lucide-react";

export default function WhyFlaggedPanel({
  score = 0,
  riskLevel = "LOW",
  scoreBreakdown = {},
  evidencePoints = [],
  role = "NORMAL",
  compact = false
}) {
  // Normalize breakdown keys
  const breakdown = useMemo(() => {
    return {
      shell: Number(scoreBreakdown?.shell_score || scoreBreakdown?.shell || 0),
      cycle: Number(scoreBreakdown?.cycle_score || scoreBreakdown?.cycle || 0),
      smurfing: Number(scoreBreakdown?.smurfing_score || scoreBreakdown?.smurfing || 0),
      temporal: Number(scoreBreakdown?.temporal_burst_score || scoreBreakdown?.temporal || 0),
      centrality: Number(scoreBreakdown?.centrality_score || scoreBreakdown?.centrality || 0)
    };
  }, [scoreBreakdown]);

  const categories = [
    {
      id: "shell",
      label: "SHELL NETWORK",
      score: breakdown.shell,
      max: 60,
      icon: Layers,
      barColor: "bg-red-500",
      textColor: "text-red-400"
    },
    {
      id: "cycle",
      label: "CIRCULAR ROUTING",
      score: breakdown.cycle,
      max: 70,
      icon: Repeat,
      barColor: "bg-rose-500",
      textColor: "text-rose-400"
    },
    {
      id: "smurfing",
      label: "SMURFING / FAN-IN / FAN-OUT",
      score: breakdown.smurfing,
      max: 65,
      icon: Share2,
      barColor: "bg-amber-500",
      textColor: "text-amber-400"
    },
    {
      id: "temporal",
      label: "TEMPORAL BURST & VELOCITY",
      score: breakdown.temporal,
      max: 15,
      icon: Clock,
      barColor: "bg-blue-500",
      textColor: "text-blue-400"
    },
    {
      id: "centrality",
      label: "NETWORK CENTRALITY & BRIDGE",
      score: breakdown.centrality,
      max: 15,
      icon: Network,
      barColor: "bg-purple-500",
      textColor: "text-purple-400"
    }
  ];

  return (
    <div className={`bg-white border border-[#E2E8F0] rounded-[4px] ${compact ? "p-3 space-y-3" : "p-4 space-y-3"}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert size={compact ? 13 : 14} className="text-[#2563EB]" />
          <span className={`${compact ? "text-[11px]" : "text-xs"} font-semibold tracking-wider uppercase text-[#0F172A]`}>
            Why Flagged Evidence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
            SCORE: {score} / 100
          </span>
        </div>
      </div>

      {/* Arithmetic Score Calculation Ledger */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-2.5 text-[11px] font-mono text-[#0F172A]">
        <div className="text-[10px] uppercase text-[#64748B] tracking-wider mb-2 flex items-center justify-between">
          <span>Mathematical Risk Decomposition</span>
          <span className="text-[#64748B]">BASE 100</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[#475569]">Shell behavior</span>
            <span className={breakdown.shell > 0 ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}>
              +{breakdown.shell}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Temporal behavior</span>
            <span className={breakdown.temporal > 0 ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}>
              +{breakdown.temporal}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Cycle behavior</span>
            <span className={breakdown.cycle > 0 ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}>
              +{breakdown.cycle}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Smurfing aggregation</span>
            <span className={breakdown.smurfing > 0 ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}>
              +{breakdown.smurfing}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#475569]">Centrality bridge</span>
            <span className={breakdown.centrality > 0 ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}>
              +{breakdown.centrality}
            </span>
          </div>
          <div className="border-t border-[#E2E8F0] my-1.5" />
          <div className="flex justify-between font-semibold text-[#0F172A]">
            <span className="text-[#475569] uppercase tracking-wider text-[10px]">Calculated Risk Score</span>
            <span className="text-[#0F172A] text-xs">
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Score Decomposition Bars */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-[#64748B] block">
          Relative Weight Meter:
        </span>
        <div className="space-y-2">
          {categories.map((cat) => {
            const pct = Math.min(100, Math.round((cat.score / cat.max) * 100));
            const hasScore = cat.score > 0;
            const Icon = cat.icon;

            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Icon size={11} className="text-[#94A3B8]" />
                    <span className={hasScore ? "text-[#0F172A] font-medium" : "text-[#94A3B8]"}>
                      {cat.label}
                    </span>
                  </div>
                  <span className={`font-mono ${hasScore ? "text-[#0F172A] font-semibold" : "text-[#94A3B8]"}`}>
                    {cat.score}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-[2px] overflow-hidden border border-[#E2E8F0]">
                  <div
                    className={`h-full ${hasScore ? "bg-[#64748B]" : "bg-transparent"}`}
                    style={{ width: `${hasScore ? Math.max(8, pct) : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0]" />

      {/* Concrete Forensic Evidence Bullet Points */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-[#64748B] block">
          Documented Forensic Evidence:
        </span>
        {evidencePoints && evidencePoints.length > 0 ? (
          <ul className="space-y-1.5">
            {evidencePoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[11px] text-[#334155] leading-relaxed">
                <span className="text-[#2563EB] select-none mt-0.5">•</span>
                <span className="font-mono">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[11px] text-[#94A3B8] italic">
            Standard transacting profile; no specific heuristic indicators triggered.
          </div>
        )}
      </div>
    </div>
  );
}
