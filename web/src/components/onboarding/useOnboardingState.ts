"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "abj_onboarding_state_v1";

type OnboardingState = {
  status: "dismissed" | "clicked";
  ts: number;
};

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingState;
        setState(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const shouldShowToast = isClient && state === null;

  const markDismissed = () => {
    const newState: OnboardingState = { status: "dismissed", ts: Date.now() };
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Ignore storage errors
    }
  };

  const markClicked = () => {
    const newState: OnboardingState = { status: "clicked", ts: Date.now() };
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Ignore storage errors
    }
  };

  const hasEverInteracted = state !== null;

  return {
    shouldShowToast,
    markDismissed,
    markClicked,
    hasEverInteracted,
  };
}

