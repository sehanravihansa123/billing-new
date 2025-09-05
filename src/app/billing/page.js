"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle, XCircle, FileText } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"

export default function BillingReconciliationPage() {
  const [billingPeriod, setBillingPeriod] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState([])

  // Mock data for previous submissions
  const previousSubmissions = [
    {
      id: 1,
      date: "12/2023",
      status: "Completed",
      statusColor: "text-green-600",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-500"
    },
    {
      id: 2,
      date: "11/2023", 
      status: "Pending",
      statusColor: "text-yellow-600",
      icon: AlertCircle,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-500"
    },
    {
      id: 3,
      date: "10/2023",
      status: "Failed", 
      statusColor: "text-red-600",
      icon: XCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-500"
    }
  ]

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!billingPeriod || !customerId || uploadedFiles.length === 0) {
      alert("Please fill in all fields and upload at least one document")
      return
    }
    alert("Reconciliation submitted successfully!")
    // Reset form
    setBillingPeriod("")
    setCustomerId("")
    setUploadedFiles([])
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">BillingReconcilePro</h1>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
                <a href="/customer-billing-data" className="hover:text-gray-900">Customer Billing Data</a>
                <span className="font-medium text-gray-900">Run Reconciliation Form</span>
                <a href="/settings" className="hover:text-gray-900">Settings</a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reconciliation Form</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Billing Period and Customer ID Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="billing-period" className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Period
                    </label>
                    <input
                      type="text"
                      id="billing-period"
                      placeholder="e.g., 01/2023"
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="customer-id" className="block text-sm font-medium text-gray-700 mb-2">
                      Customer ID
                    </label>
                    <input
                      type="text"
                      id="customer-id"
                      placeholder="Enter Customer ID"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Upload Documents */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Documents
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Submit Reconciliation
                </button>
              </form>
            </div>
          </div>

          {/* Previous Submissions Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Submissions</h3>
            
            <div className="space-y-4">
              {previousSubmissions.map((submission) => {
                const IconComponent = submission.icon
                return (
                  <div
                    key={submission.id}
                    className={`p-4 rounded-lg border ${submission.bgColor} border-gray-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          Submission Date: {submission.date}
                        </p>
                        <p className={`text-sm ${submission.statusColor}`}>
                          Status: {submission.status}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full ${submission.bgColor}`}>
                        <IconComponent className={`w-5 h-5 ${submission.iconColor}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}