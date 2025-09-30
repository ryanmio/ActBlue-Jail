"use client"

import { useEffect, useState } from "react"

type Props = {
  successOnly?: boolean
}

export function EmailSuccessAnimation({ successOnly = true }: Props) {
  const [showSuccess, setShowSuccess] = useState<boolean>(successOnly)

  useEffect(() => {
    if (successOnly) {
      setShowSuccess(true)
    }
  }, [successOnly])

  if (!showSuccess) return null

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-white"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping" />
      </div>
      <p className="text-lg font-medium text-slate-700">Email sent successfully!</p>
    </div>
  )
}
