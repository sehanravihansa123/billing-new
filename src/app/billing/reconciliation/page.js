"use client"

import React from "react"
import DashboardLayout from "@/components/dashboard-layout.js"
import { ExternalLink, FileText, Clock } from "lucide-react"

function SimpleReconciliationFormPage() {
  const formUrl = "https://n8n-oitlabs.eastus.cloudapp.azure.com/form/286180ae-8840-4b97-b979-aaf7eb9e3065"

  const handleOpenNewTab = () => {
    window.open(formUrl, '_blank')
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Run Reconciliation Form</h1>
          <p className="mt-2 text-gray-600">
            Access the n8n reconciliation form to process billing data and generate reports.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Form Access Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-10 w-10 text-blue-600" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  N8N Reconciliation Form
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Click the button below to open the reconciliation form. The form will guide you through 
                  uploading data, running reconciliation, and generating billing reports.
                </p>
                
                <button
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ExternalLink className="mr-3 h-6 w-6" />
                  Open Form in New Tab
                </button>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Reconciliation Process</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-sm font-medium text-blue-600">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Upload Data Files</h4>
                    <p className="text-sm text-gray-500">Upload your billing and transaction data files to the form.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-sm font-medium text-blue-600">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Configure Parameters</h4>
                    <p className="text-sm text-gray-500">Set reconciliation parameters and matching criteria.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-sm font-medium text-blue-600">3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Run Reconciliation</h4>
                    <p className="text-sm text-gray-500">Execute the automated reconciliation process.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-sm font-medium text-blue-600">4</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Download Reports</h4>
                    <p className="text-sm text-gray-500">Access and download the generated reconciliation reports.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-sm font-medium text-blue-900">Processing Time</h3>
              </div>
              <p className="text-sm text-blue-700">
                Typical reconciliation takes 5-15 minutes depending on data volume. 
                Large datasets may require additional processing time.
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <ExternalLink className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="text-sm font-medium text-yellow-900">Troubleshooting</h3>
              </div>
              <p className="text-sm text-yellow-700">
                If you see "Problem loading form", check that the n8n workflow is activated. 
                The workflow must be running for the form to be accessible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SimpleReconciliationFormPage