"use client";

import { useRouter } from "next/navigation";
import NetworkOverview from "@/components/NetworkOverview";
import { useForensics } from "@/context/ForensicsContext";

export default function WorkstationPage() {
  const router = useRouter();
  const {
    report,
    parsedTransactions,
    setSelectedAccountId,
    setActiveRingFilter
  } = useForensics();

  return (
    <NetworkOverview
      report={report}
      onNavigateTab={(tab) => {
        if (tab === "investigate") router.push("/investigate");
        else if (tab === "ring_investigation") router.push("/networks");
        else if (tab === "graph") router.push("/graph");
        else if (tab === "table") router.push("/accounts");
        else router.push("/workstation");
      }}
      onSelectRing={(ringId) => {
        setActiveRingFilter(ringId);
        router.push(`/networks?ring=${encodeURIComponent(ringId)}`);
      }}
      onSelectAccount={(accId) => {
        setSelectedAccountId(accId);
        router.push(`/investigate?account=${encodeURIComponent(accId)}`);
      }}
      transactions={parsedTransactions}
    />
  );
}
