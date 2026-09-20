"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RingInvestigation from "@/components/RingInvestigation";
import { useForensics } from "@/context/ForensicsContext";

function NetworksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ringParam = searchParams.get("ring");

  const {
    report,
    activeRingFilter,
    setActiveRingFilter,
    setSelectedAccountId,
    setActiveCaseRing,
    setIsCaseModalOpen,
    parsedTransactions
  } = useForensics();

  useEffect(() => {
    if (ringParam && ringParam !== activeRingFilter) {
      setActiveRingFilter(ringParam);
    }
  }, [ringParam, activeRingFilter, setActiveRingFilter]);

  const handleSelectRing = (ringId) => {
    setActiveRingFilter(ringId);
    if (ringId && ringId !== "ALL") {
      router.replace(`/networks?ring=${encodeURIComponent(ringId)}`, { scroll: false });
    } else {
      router.replace(`/networks`, { scroll: false });
    }
  };

  const handleSelectAccount = (accId) => {
    setSelectedAccountId(accId);
    router.push(`/investigate?account=${encodeURIComponent(accId)}`);
  };

  const handleNavigateTab = (tab) => {
    if (tab === "investigate") router.push("/investigate");
    else if (tab === "graph") router.push("/graph");
    else if (tab === "table") router.push("/accounts");
    else router.push("/overview");
  };

  return (
    <RingInvestigation
      report={report}
      activeRingId={ringParam || activeRingFilter}
      onSelectRing={handleSelectRing}
      onSelectAccount={handleSelectAccount}
      onNavigateTab={handleNavigateTab}
      onOpenCaseFile={(r) => {
        setActiveCaseRing(r);
        setIsCaseModalOpen(true);
      }}
      transactions={parsedTransactions}
    />
  );
}

export default function NetworksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#64748B]">Loading Network Rings...</div>}>
      <NetworksContent />
    </Suspense>
  );
}
