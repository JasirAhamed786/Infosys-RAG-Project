import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion' // 1. Added import

type Props = {
  to: string
  label: string
  activeClassName: string
}

export default function NavButton({ to, label, activeClassName }: Props) {
  return (
    // 2. Wrap in motion.button for spring-based tap/hover effects
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <NavLink
        to={to}
        className={({ isActive }: { isActive: boolean }) =>
          `relative px-3 py-2 rounded-xl transition-all duration-150 select-none border flex items-center justify-center ${
            isActive
              ? `${activeClassName} shadow-sm border-opacity-60`
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-transparent hover:border-slate-200'
          }`
        }
      >
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      </NavLink>
    </motion.div>
  )
}