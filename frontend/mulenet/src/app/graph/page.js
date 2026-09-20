"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import CytoscapeGraph from "@/components/CytoscapeGraph";
import ForensicStoryboard from "@/components/ForensicStoryboard";
import { useForensics } from "@/context/ForensicsContext";

function GraphContent() {
  const router = useRouter();
  const {
    report,
    activeRingFilter,
    setActiveRingFilter,
    selectedAccountId,
    setSelectedAccountId,
    hideCleanNodes,
    setHideCleanNodes,
    parsedTransactions
  } = useForensics();

  if (!report || !report.graph_data) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-8 text-center text-xs font-mono text-[#64748B]">
        Initializing Transaction Graph...
      </div>
    );
  }

  const handleSelectRing = (ringId) => {
    setActiveRingFilter(ringId);
  };

  const handleInspectAccount = (accountId) => {
    setSelectedAccountId(accountId);
  };

  const handleInvestigateAccount = (accountId) => {
    setSelectedAccountId(accountId);
    router.push(`/investigate?account=${encodeURIComponent(accountId)}`);
  };

  return (
    <div className="space-y-4">
      <ForensicStoryboard
        report={report}
        activeRingId={activeRingFilter}
        onSelectRing={handleSelectRing}
        onSelectAccount={handleInspectAccount}
        hideCleanNodes={hideCleanNodes}
        onToggleHideClean={() => setHideCleanNodes((prev) => !prev)}
        transactions={parsedTransactions}
      />

      <div className="h-[650px] w-full">
        <CytoscapeGraph
          graphData={report.graph_data}
          fraudRings={report.fraud_rings}
          onSelectAccount={setSelectedAccountId}
          onInvestigateAccount={handleInvestigateAccount}
          selectedAccountId={selectedAccountId}
          activeRingFilter={activeRingFilter}
          hideCleanNodes={hideCleanNodes}
          onToggleHideClean={() => setHideCleanNodes((prev) => !prev)}
        />
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#64748B]">Loading Graph Engine...</div>}>
      <GraphContent />
    </Suspense>
  );
}
