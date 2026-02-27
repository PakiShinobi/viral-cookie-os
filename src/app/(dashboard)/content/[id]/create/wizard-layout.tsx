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
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">
          Guided Creation — {contentTitle}
        </h1>

        {/* Progress Bar */}
        <div className="flex items-center space-x-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded ${
                i <= currentIndex ? "bg-blue-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {step === "title" && (
            <TitleStep
              contentId={contentId}
              initialTitle={contentTitle}
              onNext={() => goTo("thumbnail")}
            />
          )}

          {step === "thumbnail" && (
            <StepPlaceholder
              label="Thumbnail"
              next={next}
              loading={loading}
            />
          )}

          {step === "script" && (
            <StepPlaceholder
              label="Script"
              next={next}
              loading={loading}
            />
          )}

          {step === "review" && (
            <StepPlaceholder
              label="Review"
              next={next}
              loading={loading}
            />
          )}

          {step === "complete" && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold">
                Creation Complete
              </h2>
              <p className="text-slate-400 mt-2">
                Redirecting to content…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Temporary Placeholder
=========================== */

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
      <h2 className="text-lg font-medium">{label} Step</h2>
      <p className="text-slate-400 mt-2">
        This module will be built next.
      </p>

      <div className="mt-6">
        <button
          onClick={next}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
        >
          {loading ? "Processing..." : "Next"}
        </button>
      </div>
    </>
  );
}
