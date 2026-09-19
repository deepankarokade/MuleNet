"use client";

import { useState } from "react";
import { Search, Filter, ArrowUpDown, Eye, ShieldAlert, Activity } from "lucide-react";

export default function SuspiciousTable({ accounts, onInspectAccount, onInvestigateAccount, selectedAccountId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [sortField, setSortField] = useState("suspicion_score");
  const [sortAsc, setSortAsc] = useState(false);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center text-[#64748B]">
        <ShieldAlert className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
        <p className="font-medium text-xs text-[#0F172A]">No Flagged Accounts</p>
        <p className="text-xs text-[#64748B] mt-1">Upload a transaction dataset to run the forensics engine.</p>
      </div>
    );
  }

  // Filter accounts
  const filtered = accounts.filter((acc) => {
    const matchesSearch = acc.account_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === "ALL" || acc.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Sort accounts
  filtered.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[4px] overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-3 border-b border-[#E2E8F0] flex flex-col md:flex-row gap-3 items-center justify-between bg-white">
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search account identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Filter size={13} className="text-[#94A3B8]" />
          <span className="text-xs text-[#64748B] mr-1">Risk:</span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterRisk(tier)}
              className={`text-xs px-2.5 py-1 rounded-[4px] font-medium transition cursor-pointer border ${
                filterRisk === tier
                  ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]"
                  : "bg-transparent text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-x-auto max-h-[580px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFC] text-[#475569] uppercase tracking-wider sticky top-0 border-b border-[#E2E8F0] z-10 font-mono text-[10px]">
            <tr>
              <th className="py-2.5 px-4 cursor-pointer hover:text-[#0F172A]" onClick={() => handleSort("account_id")}>
                <div className="flex items-center gap-1">
                  Account ID
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-[#0F172A]" onClick={() => handleSort("suspicion_score")}>
                <div className="flex items-center gap-1">
                  Score / Tier
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-2.5 px-4">Role</th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-[#0F172A]" onClick={() => handleSort("total_received")}>
                <div className="flex items-center gap-1">
                  Received
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-2.5 px-4 cursor-pointer hover:text-[#0F172A]" onClick={() => handleSort("total_sent")}>
                <div className="flex items-center gap-1">
                  Sent
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="py-2.5 px-4">Associated Ring</th>
              <th className="py-2.5 px-4">Flags</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] font-mono text-[#475569]">
            {filtered.map((acc) => {
              const isSelected = selectedAccountId === acc.account_id;

              return (
                <tr
                  key={acc.account_id}
                  className={`hover:bg-[#F8FAFC] transition ${
                    isSelected ? "bg-[#EFF6FF] border-l-2 border-l-[#2563EB]" : ""
                  }`}
                >
                  <td className="py-2.5 px-4 font-medium text-[#0F172A] whitespace-nowrap">{acc.account_id}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-[3px] font-medium text-xs border ${
                        acc.suspicion_score >= 80
                          ? "bg-red-50 text-red-700 border-red-200"
                          : acc.suspicion_score >= 60
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {acc.suspicion_score}
                      </span>
                      <span className="text-[10px] text-[#64748B]">{acc.risk_level}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-[#0F172A] whitespace-nowrap">{acc.role}</td>
                  <td className="py-2.5 px-4 text-[#0F172A] whitespace-nowrap">
                    ${Number(acc.total_received).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-[#0F172A] whitespace-nowrap">
                    ${Number(acc.total_sent).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {acc.associated_rings && acc.associated_rings.length > 0 ? (
                      <span className="bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium border border-[#E2E8F0]">
                        {acc.associated_rings[0]}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-xs truncate text-[11px] text-[#64748B]">
                    {acc.flags && acc.flags.length > 0 ? acc.flags.join(", ") : "None"}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onInvestigateAccount ? onInvestigateAccount(acc.account_id) : onInspectAccount(acc.account_id)}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] transition font-medium cursor-pointer"
                        title="Open money flow investigation room"
                      >
                        <Activity size={12} className="text-[#2563EB]" />
                        <span>Investigate</span>
                      </button>
                      <button
                        onClick={() => onInspectAccount(acc.account_id)}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] transition font-medium cursor-pointer"
                        title="View in graph visualizer"
                      >
                        <Eye size={12} />
                        <span>Graph</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
