
import React from 'react'
import { NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold">AI</div>
          <div className="leading-tight">
            <div className="font-semibold">AI Coaching Assistant</div>
            <div className="text-xs text-gray-500">Milestone 1 foundation</div>
          </div>
        </div>
        <nav className="flex gap-4 text-sm ml-auto">

          <NavLink
            to="/session"
            className={({ isActive }: { isActive: boolean }) =>
              `hover:underline ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`
            }
          >
            Session Config
          </NavLink>
          <NavLink
            to="/knowledge"
            className={({ isActive }: { isActive: boolean }) =>
              `hover:underline ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`
            }
          >
            Knowledge Base Upload
          </NavLink>

        </nav>
      </div>
    </header>
  )
}