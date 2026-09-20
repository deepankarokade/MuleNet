"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import SuspiciousTable from "@/components/SuspiciousTable";
import { useForensics } from "@/context/ForensicsContext";

function AccountsContent() {
  const router = useRouter();
  const {
    report,
    selectedAccountId,
    setSelectedAccountId
  } = useForensics();

  if (!report || !report.suspicious_accounts) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-8 text-center text-xs font-mono text-[#64748B]">
        Loading Accounts Registry...
      </div>
    );
  }

  const handleInspectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    router.push(`/investigate?account=${encodeURIComponent(accountId)}`);
  };

  const handleInvestigateAccount = (accountId) => {
    setSelectedAccountId(accountId);
    router.push(`/investigate?account=${encodeURIComponent(accountId)}`);
  };

  return (
    <SuspiciousTable
      accounts={report.suspicious_accounts}
      onInspectAccount={handleInspectAccount}
      onInvestigateAccount={handleInvestigateAccount}
      selectedAccountId={selectedAccountId}
    />
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#64748B]">Loading Flagged Accounts...</div>}>
      <AccountsContent />
    </Suspense>
  );
}
