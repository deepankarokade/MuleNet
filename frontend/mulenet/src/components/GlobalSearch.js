"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Users,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  X,
  CornerDownLeft,
  DollarSign
} from "lucide-react";

export default function GlobalSearch({
  isOpen,
  onClose,
  report,
  transactions = [],
  onSelectAccount,
  onSelectRing,
  onNavigateTab
}) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIdx(0);
    }
  }, [isOpen]);

  // Global hotkey Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Parent triggers open
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Search results indexing
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default quick suggestions (top rings & accounts)
      const topRings = (report?.fraud_rings || []).slice(0, 3).map((r) => ({
        type: "ring",
        id: r.ring_id,
        title: r.ring_id,
        subtitle: `${r.primary_pattern || "Laundering Network"} • Risk ${r.risk_score}`,
        badge: "NETWORK",
        badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
        raw: r
      }));

      const topAccounts = (report?.suspicious_accounts || []).slice(0, 3).map((a) => ({
        type: "account",
        id: a.account_id,
        title: a.account_id,
        subtitle: `Role: ${a.role} • Score ${a.suspicion_score}`,
        badge: "ACCOUNT",
        badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
        raw: a
      }));

      return [...topRings, ...topAccounts];
    }

    const hits = [];

    // 1. Search Rings
    (report?.fraud_rings || []).forEach((r) => {
      if (
        r.ring_id.toLowerCase().includes(q) ||
        (r.primary_pattern && r.primary_pattern.toLowerCase().includes(q))
      ) {
        hits.push({
          type: "ring",
          id: r.ring_id,
          title: r.ring_id,
          subtitle: `${r.primary_pattern || "Laundering Network"} • Risk ${r.risk_score} • ${r.member_count || 0} Accounts`,
          badge: "NETWORK",
          badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
          raw: r
        });
      }
    });

    // 2. Search Suspicious Accounts
    (report?.suspicious_accounts || []).forEach((a) => {
      if (
        a.account_id.toLowerCase().includes(q) ||
        (a.role && a.role.toLowerCase().includes(q))
      ) {
        hits.push({
          type: "account",
          id: a.account_id,
          title: a.account_id,
          subtitle: `Role: ${a.role} • Score ${a.suspicion_score} / 100`,
          badge: "ACCOUNT",
          badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
          raw: a
        });
      }
    });

    // 3. Search All Graph Nodes if account not in suspicious list
    if (report?.graph_data?.nodes) {
      report.graph_data.nodes.forEach((n) => {
        const id = n.data?.id || "";
        if (
          id.toLowerCase().includes(q) &&
          !hits.some((h) => h.type === "account" && h.id === id)
        ) {
          hits.push({
            type: "account",
            id: id,
            title: id,
            subtitle: `Graph Entity • Score ${n.data?.suspicion_score || 0}`,
            badge: "ENTITY",
            badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
            raw: n.data
          });
        }
      });
    }

    // 4. Search by Amount / Transactions
    const numericQuery = parseFloat(q.replace(/[^0-9.]/g, ""));
    if (!isNaN(numericQuery) && numericQuery > 0 && transactions.length > 0) {
      const matchingTxs = transactions
        .filter((tx) => {
          const amt = Number(tx.amount);
          return amt >= numericQuery * 0.9 && amt <= numericQuery * 1.1;
        })
        .slice(0, 3);

      matchingTxs.forEach((tx, idx) => {
        hits.push({
          type: "transaction",
          id: tx.transaction_id || `tx-${idx}`,
          title: `${tx.currency === "INR" ? "₹" : "$"}${Number(tx.amount).toLocaleString()}`,
          subtitle: `${tx.sender_account} ──► ${tx.receiver_account}`,
          badge: "TRANSACTION",
          badgeColor: "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]",
          raw: tx
        });
      });
    }

    return hits.slice(0, 8);
  }, [query, report, transactions]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      handleSelectResult(results[selectedIdx]);
    }
  };

  const handleSelectResult = (item) => {
    if (!item) return;

    if (item.type === "ring") {
      onSelectRing?.(item.id);
      onNavigateTab?.("ring_investigation");
    } else if (item.type === "account" || item.type === "entity") {
      onSelectAccount?.(item.id);
      onNavigateTab?.("investigate");
    } else if (item.type === "transaction") {
      onSelectAccount?.(item.raw.sender_account);
      onNavigateTab?.("investigate");
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] w-full max-w-xl font-mono shadow-2xl overflow-hidden animate-in fade-in duration-100">
        {/* Search Input Bar */}
        <div className="p-3.5 bg-white border-b border-[#E2E8F0] flex items-center gap-3">
          <Search size={16} className="text-[#94A3B8]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search account (USER_INR_...), network (RING-003), amount (₹500000)..."
            className="w-full bg-transparent border-none outline-none text-xs text-[#0F172A] placeholder-[#94A3B8] font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0] select-none">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-[340px] overflow-y-auto space-y-1">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#64748B]">
              No accounts, rings, or matching transactions found for &quot;{query}&quot;.
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <div
                  key={`${res.type}-${res.id}-${idx}`}
                  onClick={() => handleSelectResult(res)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-[4px] text-xs transition cursor-pointer border ${
                    isSelected
                      ? "bg-[#EFF6FF] border-[#2563EB] text-[#0F172A]"
                      : "bg-transparent border-transparent text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] border bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]"
                    >
                      {res.badge}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-[#0F172A] truncate">
                        {res.title}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        {res.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[#2563EB]">
                        <span>Select</span>
                        <CornerDownLeft size={11} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-3.5 py-2 flex items-center justify-between text-[10px] text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-[#0F172A]">↑↓</strong> to navigate
            </span>
            <span>
              <strong className="text-[#0F172A]">↵</strong> to select
            </span>
            <span>
              <strong className="text-[#0F172A]">Esc</strong> to exit
            </span>
          </div>
          <div>Global Forensics Omnibar</div>
        </div>
      </div>
    </div>
  );
}
