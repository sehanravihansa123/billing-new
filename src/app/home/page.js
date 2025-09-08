"use client"

import React, { useState } from "react"
import DashboardLayout from "@/components/dashboard-layout.js"
import { Upload, FileBarChart, Users, ChevronRight } from "lucide-react"

function HomePage() {
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
      <div className="min-h-screen bg-gray-50">
        <div className="px-8 py-12 max-w-7xl mx-auto">
          {/* Clean Header - Original Design */}
          <div className="mb-12">
            <div className="flex items-center space-x-4 mb-4">
              <img 
                src="/offshoreit%20logo.png" 
                alt="Offshore IT Logo" 
                className="w-12 h-12 rounded-lg object-contain bg-white p-1 shadow-sm border border-gray-200"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm border border-gray-200" style={{display: 'none'}}>
                OI
              </div>
              <div>
                <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                  Offshore IT
                </h1>
                <p className="text-sm text-gray-500 font-normal">Business Management Platform</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Primary Action Card - CSV Upload */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload CSV Data</h2>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                      Upload your CSV files for processing, analysis, and reconciliation. Supported formats include billing data, transaction records, and customer information.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer"
                        />
                        {file && (
                          <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors duration-200"
                      >
                        {uploading ? "Uploading..." : "Upload File"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              
              {/* Billing Reports Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 group cursor-pointer" onClick={handleOpenReports}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <FileBarChart className="h-5 w-5 text-green-600" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Billing Reports</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Access comprehensive billing and reconciliation reports
                </p>
              </div>

              {/* User Management Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 group cursor-pointer" onClick={handleManageUsers}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Manage system users and access permissions
                </p>
              </div>

              {/* Quick Stats Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Active Users</span>
                    <span className="text-sm font-medium">24</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Files Processed</span>
                    <span className="text-sm font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Last Sync</span>
                    <span className="text-sm font-medium">2 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default HomePage