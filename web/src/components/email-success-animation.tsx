"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

export function EmailSuccessAnimation({ message = "Email sent successfully!" }: { message?: string }) {
  return (
    <div className="relative h-48 w-72 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          className="relative"
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </motion.div>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-green-400"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-medium text-slate-700"
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  )
}
