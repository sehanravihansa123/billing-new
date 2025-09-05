"use client"

import { useState } from "react"
import { LayoutDashboard, FileText, UserPlus, UserMinus, Settings, LogOut, Menu, X } from "lucide-react"

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Overview", href: "/home", icon: LayoutDashboard, current: true },
    { name: "Billing Reconciliation", href: "/billing", icon: FileText, current: false },
    { name: "Onboarding", href: "/onboarding", icon: UserPlus, current: false },
    { name: "Offboarding", href: "/offboarding", icon: UserMinus, current: false },
  ]

  const bottomNavigation = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Log out", href: "/logout", icon: LogOut },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="text-lg font-semibold">Menu</span>
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User profile */}
          <div className="flex items-center p-4 border-b border-gray-200">
            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              OI
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">offshoreit</p>
              <p className="text-xs text-gray-500">offshoreit@email.abc</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </a>
              )
            })}
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-gray-200 p-2 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-2">
          <button
            className="p-2 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
