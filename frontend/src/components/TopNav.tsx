import React from 'react'
import { NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-600/20 overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-br from-white/35 to-transparent opacity-80" />
            <span className="absolute -top-6 -left-6 h-16 w-16 rounded-full bg-white/20 blur" />
            <span className="relative">C</span>
          </div>
          <div className="leading-tight">
              <div className="font-bold text-slate-900 text-base tracking-tight">
                Clario 
                
              </div>

            <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />

            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <NavLink
            to="/session"
            className={({ isActive }: { isActive: boolean }) =>
              `relative px-4 py-2 rounded-xl transition-all duration-150 select-none ${
                isActive
                  ? 'text-blue-800 font-bold bg-blue-50 border border-blue-100/90 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`
            }
          >
            <span className="relative z-10">Session Config</span>
            {/* active glow */}
            <span
              className={
                'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-150 pointer-events-none ' +
                'bg-gradient-to-r from-blue-500/20 to-emerald-500/20'
              }
              aria-hidden="true"
            />
          </NavLink>

          <NavLink
            to="/knowledge"
            className={({ isActive }: { isActive: boolean }) =>
              `relative px-4 py-2 rounded-xl transition-all duration-150 select-none ${
                isActive
                  ? 'text-indigo-800 font-bold bg-indigo-50 border border-indigo-100/90 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`
            }
          >
            <span className="relative z-10">Knowledge Base Upload</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

