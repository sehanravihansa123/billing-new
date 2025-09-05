"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard-layout.js"

export default function HomePage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null)
  }

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file")

    setUploading(true)
    try {
      const formData = new FormData()

      formData.append("file", file)

      const res = await fetch("/api/upload-csv", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setFile(null)
      } else {
        alert("Upload failed: " + data.message)
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred during upload")
    } finally {
      setUploading(false)
    }
  }

  const handleOpenReports = () => {
    alert("Opening reports... (replace with actual page or modal)")
  }

  const handleManageUsers = () => {
    alert("Opening user management... (replace with actual page or modal)")
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header with larger logo and professional text */}
        <div className="text-center mb-12 flex flex-col md:flex-row items-center justify-center md:space-x-6 space-y-4 md:space-y-0">
          <img 
            src="/offshoreit logo.png" 
            alt="Offshore IT Logo" 
            className="w-32 h-32 rounded-xl shadow-lg object-contain"
          />
          <h1 className="text-6xl font-bold text-blue-700 tracking-tight uppercase">OFFSHORE IT</h1>
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
              disabled={uploading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          {/* Billing Reports Card */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Billing Reports</h3>
            <p className="text-gray-700 mb-4 text-center text-sm">View reconciliation and billing reports here.</p>
            <button
              onClick={handleOpenReports}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Open Reports
            </button>
          </div>

          {/* User Management Card */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">User Management</h3>
            <p className="text-gray-700 mb-4 text-center text-sm">Add or manage users with access to the system.</p>
            <button
              onClick={handleManageUsers}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Manage Users
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}