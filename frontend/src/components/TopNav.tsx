import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

const TABS: { to: string; label: string }[] = [
  { to: '/', label: 'Home' },
  { to: '/session', label: 'Session Config' },
  { to: '/knowledge', label: 'Knowledge Base' },
  { to: '/console', label: 'Live Console' },
  { to: '/coaching', label: 'Coaching Feed' },
  { to: '/escalation', label: 'Escalation Alerts' },
  { to: '/reports', label: 'Reports' },
  { to: '/analytics', label: 'Analytics' },
]

export default function TopNav() {
  const { isSessionActive } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b border-[#C7D2E8] bg-white/85 backdrop-blur-md brand-grad-nav">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
<div className="flex items-center gap-3">
          <div className="brand-grad h-9 w-9 rounded-[8px] text-white flex items-center justify-center text-sm font-semibold shadow-[0_2px_8px_rgba(14,116,144,0.35)]">
            C
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[#101828] text-base tracking-tight">Clario</div>
            <div className="text-xs font-medium text-[#667085] flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0E2B6C]" />
              Customer Support Agent
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium justify-end overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }: { isActive: boolean }) =>
                `relative px-3 py-1.5 rounded-[6px] transition-colors duration-150 select-none whitespace-nowrap ${
                  isActive
                    ? 'text-[#0E2B6C] bg-[#E9EDF6]'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7]'
                }`
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {tab.label}
                  <span
                    className={`absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-[#0E2B6C] transition-opacity duration-150 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Persistent Session Active indicator */}
        <div
          className={`hidden md:inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            isSessionActive
              ? 'border-[#B7E8CF] bg-[#E7F7EF] text-[#12B76A]'
              : 'border-[#E4E7EC] bg-white text-[#667085]'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isSessionActive ? 'bg-[#12B76A]' : 'bg-[#C7CED9]'
            }`}
          />
          {isSessionActive ? 'Session Active' : 'No Session'}
        </div>
      </div>

      {/* Mobile horizontal tab scroller */}
      <nav className="lg:hidden flex items-center gap-1 px-4 pb-2 text-sm font-medium overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }: { isActive: boolean }) =>
              `relative px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? 'text-[#0E2B6C] bg-[#E9EDF6]'
                  : 'text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7]'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
