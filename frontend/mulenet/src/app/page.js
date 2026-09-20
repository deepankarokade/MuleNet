"use client";

import Link from "next/link";
import { Shield, ArrowRight, Activity, Network, FileSpreadsheet, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#172033] flex flex-col font-sans antialiased">
      {/* Institutional Top Navigation */}
      <header className="border-b border-[#DCE1E7] bg-white/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-[1550px] mx-auto px-6 sm:px-10 lg:px-16 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-[3px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SYSTEM ONLINE</span>
            </div>

            <Link
              href="/workstation"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-2xs group"
            >
              <span>Enter Workstation</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center py-12 lg:py-20">
        <div className="max-w-[1550px] mx-auto px-6 sm:px-10 lg:px-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Hero Column (50–55%) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Small Kicker */}
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-[#2563EB] uppercase">
                  MULENET
                </div>
                <div className="text-[11px] font-mono tracking-[0.2em] text-[#64748B] uppercase">
                  FINANCIAL FORENSICS
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-[#172033] tracking-tight leading-[1.12]">
                RECONSTRUCT THE NETWORK.
                <br />
                TRACE THE MONEY.
                <br />
                EXPLAIN THE EVIDENCE.
              </h1>

              {/* Supporting Text */}
              <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl font-normal">
                Investigate suspicious money movement across transaction networks using graph-based detection, fund-flow tracing, and explainable financial evidence.
              </p>

              {/* Primary CTA */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                <Link
                  href="/workstation"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-[4px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold tracking-wider uppercase transition shadow-xs cursor-pointer group"
                >
                  <span>ENTER WORKSTATION</span>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Small Understated Capability Line */}
              <div className="pt-3 border-t border-[#DCE1E7] flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-mono tracking-wider text-[#64748B] uppercase">
                <span>GRAPH ANALYSIS</span>
                <span className="text-[#CBD5E1]">·</span>
                <span>FUND TRACING</span>
                <span className="text-[#CBD5E1]">·</span>
                <span>EXPLAINABLE INVESTIGATION</span>
                <span className="text-[#CBD5E1]">·</span>
                <span>CASE GENERATION</span>
              </div>
            </div>

            {/* Right Hero Column (45–50%) — Abstract Transaction Network Visualization */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#DCE1E7] rounded-[4px] p-5 sm:p-6 shadow-2xs space-y-4">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-[#DCE1E7] pb-3 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                  <div className="flex items-center gap-1.5">
                    <Network size={13} className="text-[#2563EB]" />
                    <span>TOPOLOGICAL FLOW SCHEMA</span>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[3px]">
                    FLOW MODEL
                  </span>
                </div>

                {/* Abstract Network Graph SVG */}
                <div className="relative w-full aspect-[4/3] bg-[#F8FAFC] rounded-[3px] border border-[#DCE1E7] overflow-hidden p-2 flex items-center justify-center">
                  <svg
                    viewBox="0 0 460 360"
                    className="w-full h-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="18"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 9 5 L 0 9 z" fill="#94A3B8" />
                      </marker>
                      <marker
                        id="arrow-red"
                        viewBox="0 0 10 10"
                        refX="20"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 9 5 L 0 9 z" fill="#EF4444" />
                      </marker>
                      <marker
                        id="arrow-blue"
                        viewBox="0 0 10 10"
                        refX="20"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 9 5 L 0 9 z" fill="#2563EB" />
                      </marker>
                    </defs>

                    {/* Stage Guide Lines & Labels */}
                    <g className="text-[8px] font-mono fill-[#64748B] tracking-wider uppercase select-none">
                      <text x="18" y="44">SOURCE</text>
                      <text x="18" y="114">ACCOUNT</text>
                      <text x="18" y="184">INTERMEDIARY</text>
                      <text x="18" y="254">AGGREGATOR</text>
                      <text x="18" y="324">CASHOUT</text>
                    </g>

                    {/* Subtle Horizontal Tier Guidelines */}
                    <line x1="85" y1="40" x2="440" y2="40" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 3" />
                    <line x1="85" y1="110" x2="440" y2="110" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 3" />
                    <line x1="85" y1="180" x2="440" y2="180" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 3" />
                    <line x1="85" y1="250" x2="440" y2="250" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 3" />
                    <line x1="85" y1="320" x2="440" y2="320" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 3" />

                    {/* Directed Edge Connections */}
                    {/* Layer 1 -> Layer 2 */}
                    <line x1="180" y1="40" x2="150" y2="110" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />
                    <line x1="180" y1="40" x2="270" y2="110" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />
                    <line x1="360" y1="40" x2="270" y2="110" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />
                    <line x1="360" y1="40" x2="390" y2="110" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />

                    {/* Layer 2 -> Layer 3 */}
                    <line x1="150" y1="110" x2="200" y2="180" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />
                    <line x1="270" y1="110" x2="200" y2="180" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrow)" />
                    <line x1="270" y1="110" x2="340" y2="180" stroke="#F59E0B" strokeWidth="1.5" markerEnd="url(#arrow)" />
                    <line x1="390" y1="110" x2="340" y2="180" stroke="#CBD5E1" strokeWidth="1.2" markerEnd="url(#arrow)" />

                    {/* Layer 3 -> Layer 4 (Aggregation) */}
                    <line x1="200" y1="180" x2="270" y2="250" stroke="#F97316" strokeWidth="1.5" markerEnd="url(#arrow-red)" />
                    <line x1="340" y1="180" x2="270" y2="250" stroke="#F97316" strokeWidth="1.5" markerEnd="url(#arrow-red)" />

                    {/* Subtle Circular Routing Arc (Loop back from intermediary to feeder) */}
                    <path
                      d="M 345 175 C 430 140, 410 70, 280 105"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      markerEnd="url(#arrow)"
                    />

                    {/* Layer 4 -> Layer 5 (Cashout) */}
                    <line x1="270" y1="250" x2="270" y2="320" stroke="#2563EB" strokeWidth="2" markerEnd="url(#arrow-blue)" />

                    {/* NODES WITH SEMANTIC RISK COLORING */}

                    {/* 1. SOURCE NODES (Neutral Gray) */}
                    <g>
                      <circle cx="180" cy="40" r="10" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" />
                      <circle cx="360" cy="40" r="10" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" />
                      <text x="180" y="43" textAnchor="middle" fill="#172033" fontSize="7" fontFamily="monospace" fontWeight="bold">S1</text>
                      <text x="360" y="43" textAnchor="middle" fill="#172033" fontSize="7" fontFamily="monospace" fontWeight="bold">S2</text>
                    </g>

                    {/* 2. ACCOUNT NODES (Feeder accounts: neutral gray and elevated amber) */}
                    <g>
                      <circle cx="150" cy="110" r="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
                      <text x="150" y="113" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">A1</text>

                      {/* Elevated Node (Amber) */}
                      <circle cx="270" cy="110" r="11" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
                      <text x="270" y="113" textAnchor="middle" fill="#92400E" fontSize="7" fontFamily="monospace" fontWeight="bold">A2</text>

                      <circle cx="390" cy="110" r="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
                      <text x="390" y="113" textAnchor="middle" fill="#64748B" fontSize="7" fontFamily="monospace">A3</text>
                    </g>

                    {/* 3. MULE / INTERMEDIARY NODES (High Risk: Orange) */}
                    <g>
                      <circle cx="200" cy="180" r="12" fill="#FFEDD5" stroke="#F97316" strokeWidth="2" />
                      <text x="200" y="183" textAnchor="middle" fill="#9A3412" fontSize="7" fontFamily="monospace" fontWeight="bold">M1</text>

                      <circle cx="340" cy="180" r="12" fill="#FFEDD5" stroke="#F97316" strokeWidth="2" />
                      <text x="340" y="183" textAnchor="middle" fill="#9A3412" fontSize="7" fontFamily="monospace" fontWeight="bold">M2</text>
                    </g>

                    {/* 4. AGGREGATOR NODE (Critical: Red) */}
                    <g>
                      <circle cx="270" cy="250" r="14" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2.5" />
                      <text x="270" y="253" textAnchor="middle" fill="#991B1B" fontSize="8" fontFamily="monospace" fontWeight="bold">HUB</text>
                    </g>

                    {/* 5. CASHOUT NODE (Selected / Active: Blue) */}
                    <g>
                      <circle cx="270" cy="320" r="13" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2.5" />
                      <text x="270" y="323" textAnchor="middle" fill="#1E40AF" fontSize="7" fontFamily="monospace" fontWeight="bold">OUT</text>
                    </g>
                  </svg>
                </div>

                {/* Semantic Risk Color Legend */}
                <div className="pt-2 border-t border-[#DCE1E7] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#64748B]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>Elevated</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    <span>Active Target</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Understated Minimal Footer */}
      <footer className="border-t border-[#DCE1E7] bg-white py-6">
        <div className="max-w-[1550px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B] font-mono">
          <div>
            MuleNet · Financial Investigation Workstation
          </div>
          <div>
            No account required · Upload a transaction CSV to begin
          </div>
        </div>
      </footer>
    </div>
  );
}
