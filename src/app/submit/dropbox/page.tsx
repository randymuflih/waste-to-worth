"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SidebarCitizen } from "@/components/citizen/SidebarCitizen";
import { DropboxForm } from "@/components/citizen/submit/DropboxForm";
import { DropboxReview } from "@/components/citizen/submit/DropboxReview";
import { SubmissionVerifying } from "@/components/citizen/submit/SubmissionVerifying";
import { SubmissionCompleted } from "@/components/citizen/submit/SubmissionCompleted";

type FlowState = "form" | "review" | "verifying" | "completed";

interface DraftSubmission {
  dropboxId: string;
  dropboxName: string;
  boxNumber: string;
  items: { itemType: string; quantity: number }[];
  notes?: string;
}

interface SubmissionResult {
  id: string;
  batchId: string;
  items: { itemType: string; quantity: number }[];
  dropboxName: string;
  boxNumber: string;
  pointsEstimate: number;
}

export default function DropboxSubmitPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen" style={{ background: "#F8FAF9" }}><SidebarCitizen /><main className="flex-1 ml-64 min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></main></div>}>
      <DropboxSubmitContent />
    </Suspense>
  );
}

function DropboxSubmitContent() {
  const searchParams = useSearchParams();
  const qrDropboxId = searchParams.get("dropboxId") || "";

  const [state, setState] = useState<FlowState>("form");
  const [draft, setDraft] = useState<DraftSubmission | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [canSubmitAnother, setCanSubmitAnother] = useState(true);

  const refreshStatus = async (submissionId: string) => {
    const response = await fetch("/api/submissions/dropbox", { cache: "no-store" });
    const data = await response.json();
    const latest = (data?.data || []).find((item: { id: string }) => item.id === submissionId);
    if (latest?.status === "VERIFIED") {
      setState("completed");
    }
  };

  const refreshDropboxAvailability = async () => {
    try {
      const response = await fetch("/api/dropboxes", { cache: "no-store" });
      const data = await response.json();
      const dropboxes = data?.data || [];
      const hasSlot = dropboxes.some(
        (dropbox: {
          isActive: boolean;
          currentBoxCount: number;
          maxCapacity: number;
          availableBoxes: { boxNumber: string }[];
        }) =>
          dropbox.isActive &&
          dropbox.currentBoxCount < dropbox.maxCapacity &&
          (dropbox.availableBoxes?.length || 0) > 0
      );
      setCanSubmitAnother(hasSlot);
    } catch {
      // Keep the previous state if request fails.
    }
  };

  useEffect(() => {
    if (!submission || state !== "verifying") return;
    refreshDropboxAvailability().catch(() => null);
    const interval = setInterval(() => {
      refreshStatus(submission.id).catch(() => null);
      refreshDropboxAvailability().catch(() => null);
    }, 8000);
    return () => clearInterval(interval);
  }, [submission, state]);

  // Refresh availability once more when entering completed state
  useEffect(() => {
    if (state === "completed") {
      refreshDropboxAvailability().catch(() => null);
    }
  }, [state]);

  useEffect(() => {
    const bootstrapLatestSubmission = async () => {
      try {
        const response = await fetch("/api/submissions/dropbox", { cache: "no-store" });
        const data = await response.json();
        const latest = data?.data?.[0];
        if (!latest) return;

        const mappedSubmission: SubmissionResult = {
          id: latest.id,
          batchId: latest.batchId,
          items: latest.submissionItems || [],
          dropboxName:
            latest.dropboxSubmissionDetail?.dropbox?.name || "Connected Dropbox",
          boxNumber: latest.dropboxSubmissionDetail?.box?.boxNumber || "-",
          pointsEstimate: latest.totalPointsEarned || 450,
        };
        setSubmission(mappedSubmission);

        if (latest.status === "VERIFIED") {
          setState("completed");
        } else {
          setState("verifying");
        }
      } catch {
        // Keep default form state when there is no previous submission or request fails.
      }
    };
    bootstrapLatestSubmission();
  }, []);

  const handleDraftReady = (payload: DraftSubmission) => {
    setDraft(payload);
    setError(null);
    setState("review");
  };

  const handleConfirmSubmission = async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/submissions/dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropboxId: draft.dropboxId,
          boxNumber: draft.boxNumber,
          items: draft.items,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create submission");
      }

      const created = result?.data;
      const normalized: SubmissionResult = {
        id: created.id,
        batchId: created.batchId,
        items: created.submissionItems || draft.items,
        dropboxName: draft.dropboxName,
        boxNumber: draft.boxNumber,
        pointsEstimate: created.totalPointsEarned || 450,
      };
      setSubmission(normalized);
      setState("verifying");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit right now"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewSubmission = () => {
    setIsStartingNew(true);
    setDraft(null);
    setError(null);
    setState("form");
    setIsStartingNew(false);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAF9" }}>
      <SidebarCitizen />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {state === "form" && (
            <DropboxForm onContinue={handleDraftReady} lockedDropboxId={qrDropboxId} />
          )}
          {state === "review" && draft && (
            <DropboxReview
              draft={draft}
              isSaving={isSaving}
              errorMessage={error}
              onBack={() => setState("form")}
              onConfirm={handleConfirmSubmission}
            />
          )}
          {state === "verifying" && submission && (
            <SubmissionVerifying
              submission={submission}
              onSubmitAnother={handleStartNewSubmission}
              isStartingNew={isStartingNew}
              canSubmitAnother={canSubmitAnother}
            />
          )}
          {state === "completed" && submission && (
            <SubmissionCompleted
              submission={submission}
              onSubmitAnother={handleStartNewSubmission}
              canSubmitAnother={canSubmitAnother}
            />
          )}
        </div>
      </main>
    </div>
  );
}
