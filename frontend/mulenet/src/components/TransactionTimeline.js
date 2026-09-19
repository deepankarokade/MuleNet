"use client";

import { useMemo } from "react";
import {
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  Users,
  ShieldAlert,
  Calendar,
  DollarSign
} from "lucide-react";
import { formatCurrency, formatDeltaTime } from "@/lib/investigationEngine";

function formatTimeOnly(ts) {
  if (!ts) return "--:--:--";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).slice(11, 19) || ts;
    return d.toTimeString().slice(0, 8);
  } catch {
    return String(ts);
  }
}

export default function TransactionTimeline({
  ring = null,
  ringId = null,
  transactions = [],
  selectedAccountId = null,
  onSelectAccount = null,
  currency = "INR"
}) {
  // Extract and chronologically sort the relevant transactions
  const timelineData = useMemo(() => {
    let relevantTxs = [];

    if (ring && ring.member_accounts && ring.member_accounts.length > 0) {
      const memberSet = new Set(ring.member_accounts);
      relevantTxs = transactions.filter(
        (tx) => memberSet.has(tx.sender_account) && memberSet.has(tx.receiver_account)
      );

      // If no internal member txs found, look for txs involving any ring member
      if (relevantTxs.length === 0) {
        relevantTxs = transactions.filter(
          (tx) => memberSet.has(tx.sender_account) || memberSet.has(tx.receiver_account)
        );
      }
    } else if (selectedAccountId) {
      relevantTxs = transactions.filter(
        (tx) => tx.sender_account === selectedAccountId || tx.receiver_account === selectedAccountId
      );
    } else {
      relevantTxs = transactions.slice(0, 10);
    }

    // Sort chronologically ascending
    relevantTxs.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime() || 0;
      const tB = new Date(b.timestamp).getTime() || 0;
      return tA - tB;
    });

    if (relevantTxs.length === 0) return null;

    // Calculate metrics
    const firstTx = relevantTxs[0];
    const lastTx = relevantTxs[relevantTxs.length - 1];
    const tFirst = new Date(firstTx.timestamp).getTime() || 0;
    const tLast = new Date(lastTx.timestamp).getTime() || 0;
    const totalSpanHours = Math.max(0, (tLast - tFirst) / (1000 * 3600));

    const uniqueAccounts = new Set();
    for (const tx of relevantTxs) {
      uniqueAccounts.add(tx.sender_account);
      uniqueAccounts.add(tx.receiver_account);
    }

    const initAmt = firstTx.amount || 0;
    const finalAmt = lastTx.amount || initAmt;
    const passThroughPct = initAmt > 0 ? Math.min(100, Math.round((finalAmt / initAmt) * 1000) / 10) : 100;

    // Build timeline step items with inter-hop delta time & retained amount
    const steps = relevantTxs.map((tx, idx) => {
      let deltaTimeHours = 0;
      let retainedAmt = 0;
      let retainedPct = 0;

      if (idx > 0) {
        const prevTx = relevantTxs[idx - 1];
        const prevT = new Date(prevTx.timestamp).getTime() || 0;
        const currT = new Date(tx.timestamp).getTime() || 0;
        deltaTimeHours = Math.max(0, (currT - prevT) / (1000 * 3600));
        retainedAmt = Math.max(0, prevTx.amount - tx.amount);
        retainedPct = prevTx.amount > 0 ? Math.round((retainedAmt / prevTx.amount) * 1000) / 10 : 0;
      }

      return {
        stepNumber: idx + 1,
        tx,
        timeDisplay: formatTimeOnly(tx.timestamp),
        fullDate: String(tx.timestamp).slice(0, 10),
        deltaTimeDisplay: formatDeltaTime(deltaTimeHours),
        retainedAmt,
        retainedPct
      };
    });

    return {
      steps,
      totalSpanDisplay: formatDeltaTime(totalSpanHours),
      passThroughPct,
      accountCount: uniqueAccounts.size,
      totalVolume: initAmt,
      currency: firstTx.currency || currency
    };
  }, [ring, ringId, transactions, selectedAccountId, currency]);

  if (!timelineData || timelineData.steps.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-6 text-center text-[#64748B] text-xs font-mono">
        No chronological transaction sequence available for this selection.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-4 space-y-4 font-mono">
      {/* Header with Title and Metrics Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <Clock size={14} className="text-[#2563EB]" />
            <span>Transaction Layering Timeline</span>
            {ring?.ring_id && (
              <span className="text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-[4px] border border-[#E2E8F0] text-[10px]">
                {ring.ring_id}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Chronological audit of pass-through hops demonstrating structured capital layering.
          </p>
        </div>

        {/* Metrics Banner */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-[4px]">
            <span className="text-[#64748B] text-[10px] block">Total Elapsed</span>
            <span className="text-[#0F172A] font-semibold font-mono">{timelineData.totalSpanDisplay}</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-[4px]">
            <span className="text-[#64748B] text-[10px] block">Pass-Through</span>
            <span className="text-[#0F172A] font-semibold font-mono">{timelineData.passThroughPct}%</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-[4px]">
            <span className="text-[#64748B] text-[10px] block">Entities</span>
            <span className="text-[#0F172A] font-semibold font-mono">{timelineData.accountCount}</span>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-[4px]">
            <span className="text-[#64748B] text-[10px] block">Initial Flow</span>
            <span className="text-[#0F172A] font-semibold font-mono">
              {formatCurrency(timelineData.totalVolume, timelineData.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Chronological Flow List */}
      <div className="space-y-3 pt-1">
        {timelineData.steps.map((item, idx) => {
          const isFirst = idx === 0;

          return (
            <div key={item.tx.transaction_id || idx} className="relative">
              {/* Inter-hop connector delta indicator */}
              {!isFirst && (
                <div className="flex items-center gap-2 pl-4 py-1 text-[10px] text-[#64748B]">
                  <div className="w-px h-4 bg-[#CBD5E1] ml-1.5" />
                  <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-[10px]">
                    <Clock size={10} className="text-[#2563EB]" />
                    <span>Elapsed: <span className="text-[#0F172A] font-semibold">{item.deltaTimeDisplay}</span></span>
                    {item.retainedAmt > 0 && (
                      <span className="text-[#475569] flex items-center gap-1 border-l border-[#CBD5E1] pl-1.5 ml-1">
                        <TrendingDown size={10} className="text-[#2563EB]" />
                        <span>Fee Retained: {formatCurrency(item.retainedAmt, timelineData.currency)} ({item.retainedPct}%)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Hop Card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition rounded-[4px] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                {/* Time badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-white border border-[#E2E8F0] text-[#0F172A] font-mono px-2 py-1 rounded-[4px] text-[11px]">
                    {item.timeDisplay}
                  </span>
                  <span className="text-[#64748B] text-[10px]">{item.fullDate}</span>
                </div>

                {/* Transfer Pipeline: A ── ₹X ──► B */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {/* Sender */}
                  <button
                    onClick={() => onSelectAccount && onSelectAccount(item.tx.sender_account)}
                    className="truncate font-medium text-[#0F172A] hover:underline max-w-[140px] md:max-w-[180px] text-left cursor-pointer font-mono"
                    title={`Inspect ${item.tx.sender_account}`}
                  >
                    {item.tx.sender_account}
                  </button>

                  {/* Flow Arrow with Amount */}
                  <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-[4px]">
                    <span className="w-2 h-px bg-[#CBD5E1]" />
                    <span className="font-semibold text-[#0F172A] text-xs font-mono">
                      {formatCurrency(item.tx.amount, timelineData.currency)}
                    </span>
                    <ArrowRight size={12} className="text-[#2563EB]" />
                  </div>

                  {/* Receiver */}
                  <button
                    onClick={() => onSelectAccount && onSelectAccount(item.tx.receiver_account)}
                    className="truncate font-medium text-[#0F172A] hover:underline max-w-[140px] md:max-w-[180px] text-left cursor-pointer font-mono"
                    title={`Inspect ${item.tx.receiver_account}`}
                  >
                    {item.tx.receiver_account}
                  </button>
                </div>

                {/* Transaction Memo / Channel if present */}
                {item.tx.description && (
                  <div className="text-[10px] text-[#64748B] italic truncate max-w-[140px]">
                    {item.tx.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
