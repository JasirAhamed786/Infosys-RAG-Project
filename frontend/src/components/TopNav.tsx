
import React from 'react'
import { NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
        <div className="font-semibold">AI Coaching Assistant</div>
        <nav className="flex gap-4 text-sm">
          <NavLink
            to="/session"
            className={({ isActive }) =>
              `hover:underline ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`
            }
          >
            Session Config
          </NavLink>
          <NavLink
            to="/knowledge"
            className={({ isActive }) =>
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