"use client";

import { useState } from "react";
import type { WizardStep } from "@/lib/types";
import {
  advanceWizardStep,
  completeWizard,
} from "@/app/actions/wizard";
import TitleStep from "./title-step";

interface Props {
  contentId: string;
  contentTitle: string;
  currentStep: WizardStep;
}

const steps: WizardStep[] = [
  "title",
  "thumbnail",
  "script",
  "review",
  "complete",
];

export default function WizardLayout({
  contentId,
  contentTitle,
  currentStep,
}: Props) {
  const [step, setStep] = useState<WizardStep>(currentStep);
  const [loading, setLoading] = useState(false);

  const currentIndex = steps.indexOf(step);

  async function goTo(nextStep: WizardStep) {
    setLoading(true);
    await advanceWizardStep(contentId, nextStep);
    setStep(nextStep);
    setLoading(false);
    if (nextStep === "complete") {
      await completeWizard(contentId);
    }
  }

  async function next() {
    if (step === "complete") return;
    const nextStep = steps[currentIndex + 1];
    if (!nextStep) return;
    await goTo(nextStep);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Guided Creation
        </h1>
        <p className="mt-1 text-sm text-muted">{contentTitle}</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step Container */}
      <div className="rounded-xl border border-border bg-surface p-6">
        {step === "title" && (
          <TitleStep
            contentId={contentId}
            initialTitle={contentTitle}
            onNext={() => goTo("thumbnail")}
          />
        )}

        {step === "thumbnail" && (
          <StepPlaceholder label="Thumbnail" next={next} loading={loading} />
        )}

        {step === "script" && (
          <StepPlaceholder label="Script" next={next} loading={loading} />
        )}

        {step === "review" && (
          <StepPlaceholder label="Review" next={next} loading={loading} />
        )}

        {step === "complete" && (
          <div className="py-12 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Creation Complete
            </h2>
            <p className="mt-2 text-sm text-muted">
              Redirecting to content…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepPlaceholder({
  label,
  next,
  loading,
}: {
  label: string;
  next: () => void;
  loading: boolean;
}) {
  return (
    <>
      <h2 className="text-[15px] font-semibold text-foreground">{label} Step</h2>
      <p className="mt-1.5 text-sm text-muted">This module will be built next.</p>
      <div className="mt-6">
        <button
          onClick={next}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Processing..." : "Next"}
        </button>
      </div>
    </>
  );
}
