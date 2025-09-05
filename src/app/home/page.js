"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard-layout.js"

export default function HomePage() {
  const [file, setFile] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null)
  }

  const handleUpload = () => {
    if (!file) return alert("Please select a CSV file")
    alert(`CSV file "${file.name}" uploaded successfully!`)
    setFile(null) // Reset after upload
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <img src="/offshore-logo.jpeg" alt="Offshore IT Logo" className="w-16 h-16 rounded-lg mr-4" />
            <h1 className="text-4xl font-bold text-blue-600 tracking-wider">OFFSHORE IT</h1>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Reconciliation</h2>
          <p className="text-gray-600">
            Welcome to the MSP Billing Platform. Use the tools below to manage your services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* CSV Upload Card */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handleUpload}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Upload
            </button>
          </div>

          {/* Billing Reports Card */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Billing Reports</h3>
            <p className="text-gray-700 mb-4 text-center text-sm">View reconciliation and billing reports here.</p>
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Open Reports
            </button>
          </div>

          {/* User Management Card */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">User Management</h3>
            <p className="text-gray-700 mb-4 text-center text-sm">Add or manage users with access to the system.</p>
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Manage Users
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
