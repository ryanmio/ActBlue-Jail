"use client"

import { useEffect, useState } from "react"

export function LandingPageScanner() {
  const [scanProgress, setScanProgress] = useState(0)
  const [direction, setDirection] = useState<"down" | "up">("down")

  useEffect(() => {
    const duration = 6000 // 6 seconds per scan
    const interval = 16 // ~60fps
    const increment = (100 / duration) * interval

    const timer = setInterval(() => {
      setScanProgress((prev) => {
        if (direction === "down") {
          const next = prev + increment
          if (next >= 100) {
            setDirection("up")
            return 100
          }
          return next
        } else {
          const next = prev - increment
          if (next <= 0) {
            setDirection("down")
            return 0
          }
          return next
        }
      })
    }, interval)

    return () => clearInterval(timer)
  }, [direction])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[320px] overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-card to-muted/20 shadow-lg">
        <div className="space-y-4 p-6">
          {/* Logo/Header */}
          <div className="flex justify-center">
            <div className="h-8 w-24 rounded bg-foreground/15" />
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Left column - Campaign info */}
            <div className="space-y-3">
              {/* Headline */}
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-foreground/20" />
                <div className="h-3 w-5/6 rounded bg-foreground/20" />
                <div className="h-3 w-4/5 rounded bg-foreground/20" />
              </div>

              {/* Body text */}
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded bg-foreground/10" />
                <div className="h-1.5 w-full rounded bg-foreground/10" />
                <div className="h-1.5 w-4/5 rounded bg-foreground/10" />
              </div>

              {/* More body text */}
              <div className="space-y-1 pt-2">
                <div className="h-1.5 w-full rounded bg-foreground/10" />
                <div className="h-1.5 w-5/6 rounded bg-foreground/10" />
              </div>

              {/* Subheading */}
              <div className="space-y-1 pt-2">
                <div className="h-2.5 w-4/5 rounded bg-foreground/15" />
                <div className="h-2.5 w-3/4 rounded bg-foreground/15" />
              </div>
            </div>

            {/* Right column - Donation form */}
            <div className="space-y-3">
              {/* Welcome message */}
              <div className="h-2.5 w-3/4 rounded bg-foreground/15" />

              {/* Donor info section */}
              <div className="space-y-1.5 rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                <div className="h-2 w-16 rounded bg-foreground/15" />
                <div className="h-1.5 w-full rounded bg-foreground/10" />
                <div className="h-1.5 w-4/5 rounded bg-foreground/10" />
                <div className="h-1.5 w-3/4 rounded bg-foreground/10" />
              </div>

              {/* Payment method */}
              <div className="space-y-1.5 rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                <div className="h-2 w-20 rounded bg-foreground/15" />
                <div className="h-1.5 w-full rounded bg-foreground/10" />
              </div>

              {/* Donation amounts grid */}
              <div className="space-y-2 pt-1">
                <div className="h-2 w-24 rounded bg-foreground/15" />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-6 rounded bg-foreground/20" />
                  <div className="h-6 rounded bg-foreground/20" />
                  <div className="h-6 rounded bg-foreground/20" />
                  <div className="h-6 rounded bg-foreground/20" />
                </div>
              </div>

              {/* CTA button */}
              <div className="h-7 w-full rounded-md bg-foreground/25" />
            </div>
          </div>
        </div>

        {/* Scan line */}
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 h-[2px]"
          style={{
            top: `${scanProgress}%`,
            background:
              "linear-gradient(90deg, rgba(128, 206, 239, 0.4), rgba(128, 206, 239, 0.6) 50%, rgba(128, 206, 239, 0.4))",
            boxShadow:
              "0 0 20px 4px rgba(128, 206, 239, 0.4), 0 0 40px 8px rgba(128, 206, 239, 0.2), 0 0 60px 12px rgba(128, 206, 239, 0.1)",
            filter: "blur(0.5px)",
          }}
        />

        <div
          className="pointer-events-none absolute left-0 right-0 z-[5] h-24"
          style={{
            top: `${scanProgress}%`,
            transform: "translateY(-50%)",
            background: "linear-gradient(to bottom, transparent, rgba(128, 206, 239, 0.05) 50%, transparent)",
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(128, 206, 239, 0.02) 0%, 
              rgba(128, 206, 239, 0.02) ${scanProgress}%, 
              transparent ${scanProgress}%, 
              transparent 100%)`,
          }}
        />
      </div>
    </div>
  )
}
