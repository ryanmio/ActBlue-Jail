"use client";

import { useEffect, useState } from "react";

type OnboardingToastProps = {
  onClick: () => void;
  onDismiss: () => void;
};

export function OnboardingToast({ onClick, onDismiss }: OnboardingToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Fade in animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-200 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }
      top-20 right-6 md:top-24 md:right-10
      sm:bottom-auto sm:top-20 sm:right-6 md:top-24 md:right-10`}
      style={{ maxWidth: "calc(100vw - 3rem)" }}
    >
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-lg p-4 pr-12 relative hover:border-slate-400 transition-colors">
        <button
          onClick={onClick}
          className="text-left group"
          aria-label="Learn how AB Jail works"
        >
          <div className="text-sm font-medium text-slate-900 mb-1">
            New here?
          </div>
          <div className="text-sm text-slate-700 group-hover:text-slate-900 inline-flex items-center gap-1">
            See how AB Jail works
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

