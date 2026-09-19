"use client";

import { ShieldAlert, Users, DollarSign, ChevronRight } from "lucide-react";

export default function RingCards({ rings, onSelectRing, activeRingId }) {
  if (!rings || rings.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-6 text-center text-[#64748B]">
        <ShieldAlert className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
        <p className="font-medium text-xs text-[#0F172A]">No Coordinated Fraud Rings Detected</p>
        <p className="text-xs text-[#64748B] mt-1">Upload a transaction dataset to run the forensics engine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rings.map((ring) => {
        const isActive = activeRingId === ring.ring_id;
        const isCritical = ring.severity === "CRITICAL";
        const isHigh = ring.severity === "HIGH";

        return (
          <div
            key={ring.ring_id}
            onClick={() => onSelectRing(ring.ring_id)}
            className={`cursor-pointer rounded-[4px] p-3.5 transition border ${
              isActive
                ? "bg-[#EFF6FF] border-[#2563EB]"
                : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-[4px] border border-[#E2E8F0]">
                  {ring.ring_id}
                </span>
                <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-[4px] border ${
                  isCritical 
                    ? "bg-red-50 text-red-700 border-red-200" 
                    : isHigh 
                    ? "bg-orange-50 text-orange-700 border-orange-200" 
                    : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                }`}>
                  {ring.severity}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#64748B] font-mono">
                <span>Score: <strong className="text-[#0F172A]">{ring.risk_score}</strong></span>
                <ChevronRight size={14} className={isActive ? "rotate-90 transition text-[#2563EB]" : "text-[#94A3B8]"} />
              </div>
            </div>

            <h4 className="text-xs font-semibold text-[#0F172A] mt-2.5">
              {ring.primary_pattern}
            </h4>

            <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
              {ring.description}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#E2E8F0] text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <Users size={12} className="text-[#94A3B8]" />
                <span>{ring.member_count} Accounts</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0F172A] justify-end font-medium">
                <DollarSign size={12} className="text-[#94A3B8]" />
                <span>${Number(ring.total_funds_routed).toLocaleString()}</span>
              </div>
            </div>

            {ring.patterns_detected && ring.patterns_detected.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {ring.patterns_detected.map((pat, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
                  >
                    {pat}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
