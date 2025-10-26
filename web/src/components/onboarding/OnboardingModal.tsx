"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type OnboardingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl?: string;
};

const STEPS = [
  {
    title: "What is AB Jail?",
    description:
      "AB Jail is a public log of political fundraising messages. We're an open-source, community-driven project that brings transparency to political fundraising by flagging potential ActBlue policy violations.",
    note: "Not affiliated with ActBlue.",
  },
  {
    title: "How to use it",
    description:
      "Forward an email to submit@abjail.org, drag and drop a screenshot, or paste text from a political fundraising message. Our system will automatically extract and analyze the content.",
    icon: (
      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    title: "What happens next",
    description:
      "We use OCR to extract text from screenshots, then classify potential ActBlue policy violations using AI. Each submission becomes a public case that anyone can view and reference.",
    icon: (
      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Privacy notice",
    description:
      "All submissions are made public. We attempt to automatically redact personally identifying information (PII), but accuracy isn't guaranteed. Please review your content and redact any private information before submitting.",
    icon: (
      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export function OnboardingModal({ open, onOpenChange, videoUrl }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset to first step when closing
    setTimeout(() => setCurrentStep(0), 200);
  };

  const step = STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{step.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Optional video slot */}
          {videoUrl && currentStep === 0 && (
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-100">
              <video
                src={videoUrl}
                controls
                className="w-full h-full"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            </div>
          )}

          {/* Icon */}
          {step.icon && (
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                {step.icon}
              </div>
            </div>
          )}

          {/* Description */}
          <DialogDescription className="text-base leading-relaxed text-slate-700">
            {step.description}
          </DialogDescription>

          {/* Note */}
          {step.note && (
            <div className="text-sm text-slate-600 italic">
              {step.note}
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-2 pt-2">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-8 bg-slate-900"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to step ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/welcome"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Full guide
              </Link>
              <button
                onClick={handleNext}
                className="px-6 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
              >
                {currentStep < STEPS.length - 1 ? "Next" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

