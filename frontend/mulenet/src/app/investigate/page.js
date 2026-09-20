"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InvestigationRoom from "@/components/InvestigationRoom";
import { useForensics } from "@/context/ForensicsContext";

function InvestigationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountParam = searchParams.get("account");

  const {
    report,
    selectedAccountId,
    setSelectedAccountId,
    parsedTransactions
  } = useForensics();

  useEffect(() => {
    if (accountParam && accountParam !== selectedAccountId) {
      setSelectedAccountId(accountParam);
    }
  }, [accountParam, selectedAccountId, setSelectedAccountId]);

  const handleSelectAccount = (accId) => {
    setSelectedAccountId(accId);
    if (accId) {
      router.replace(`/investigate?account=${encodeURIComponent(accId)}`, { scroll: false });
    } else {
      router.replace(`/investigate`, { scroll: false });
    }
  };

  return (
    <InvestigationRoom
      report={report}
      selectedAccountId={accountParam || selectedAccountId}
      onSelectAccount={handleSelectAccount}
      transactions={parsedTransactions}
    />
  );
}

export default function InvestigatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#64748B]">Loading Investigation Room...</div>}>
      <InvestigationContent />
    </Suspense>
  );
}
