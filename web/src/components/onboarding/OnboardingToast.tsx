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
      className={`fixed z-40 transition-all duration-300 ease-out ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
      }
      top-20 right-6 md:top-24 md:right-10
      sm:bottom-auto sm:top-20 sm:right-6 md:top-24 md:right-10`}
      style={{ maxWidth: "calc(100vw - 3rem)" }}
    >
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl shadow-2xl p-5 pr-14 relative hover:shadow-xl hover:border-slate-300 transition-all duration-200">
        <button
          onClick={onClick}
          className="text-left group"
          aria-label="Learn how AB Jail works"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-base font-semibold text-slate-900">
              New here?
            </div>
          </div>
          <div className="text-sm text-slate-600 group-hover:text-slate-900 inline-flex items-center gap-1.5 font-medium transition-colors">
            See how AB Jail works
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
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
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-1 transition-all"
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

