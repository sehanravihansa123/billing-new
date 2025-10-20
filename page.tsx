"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileText, TrendingUp, Play, CheckCircle } from "lucide-react"
import { CsvUploadForm } from "@/features/billing/components/run-reconciliation/CsvUploadForm"

export default function UploadFilePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const handleUploadSuccess = () => {
    console.log('CSV upload completed successfully!')
    // Redirect to results page after successful upload
    router.push('/billing-reconciliation/results')
  }

  const handleUploadError = (error: string) => {
    console.error('CSV upload failed:', error)
    // Error handling is already built into the component
  }

  const handleBack = () => {
    router.push('/billing-reconciliation')
  }

  // Function to update step from child component
  const handleStepChange = (step: number) => {
    setCurrentStep(step)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="px-8 py-12 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                {/* Steps Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
                    currentStep >= 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                    }`}>
                      1
                    </div>
                    <span className="text-sm font-medium">Run Reconciliation</span>
                    {currentStep > 1 && <CheckCircle className="h-4 w-4" />}
                  </div>
                  
                  <div className={`w-8 h-px transition-colors ${currentStep >= 2 ? 'bg-green-300 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
                    currentStep >= 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                    }`}>
                      2
                    </div>
                    <span className="text-sm font-medium">Upload CSV Files</span>
                    {currentStep > 2 && <CheckCircle className="h-4 w-4" />}
                  </div>
                  
                  <div className={`w-8 h-px transition-colors ${currentStep >= 3 ? 'bg-blue-300 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
                    currentStep >= 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      currentStep >= 3 ? 'bg-orange-600 text-white' : 'bg-gray-400 text-white'
                    }`}>
                      3
                    </div>
                    <span className="text-sm font-medium">Process All</span>
                    {currentStep > 3 && <CheckCircle className="h-4 w-4" />}
                  </div>
                </div>

                <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                  CSV Upload for Billing Reconciliation
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  {currentStep === 1 && "Click 'Run Reconciliation' to get started"}
                  {currentStep === 2 && "Upload CSV files for each detected service"}
                  {currentStep === 3 && "Process all uploaded CSV files at once"}
                </p>
              </div>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Billing Reconciliation</span>
              <span>/</span>
              <span className="text-gray-900 dark:text-white">CSV Upload</span>
            </nav>
          </div>

          {/* Info Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Play className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Run Reconciliation</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Load available services</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Service-based Upload</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload CSV per service</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Automatic Processing</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Data sent directly to webhook</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Real-time Results</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Immediate processing feedback</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="p-8">
            <CsvUploadForm 
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
              onStepChange={handleStepChange}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-purple-900/30 rounded-xl border border-blue-200 dark:border-purple-700 p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            How to use this tool
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <div className="flex items-start">
              <span className="font-medium mr-2">1.</span>
              <span>Click "Run Reconciliation" to fetch all available services from the system</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">2.</span>
              <span>For each service displayed, select and upload the corresponding CSV file</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">3.</span>
              <span>Review the data preview to ensure your CSV files are formatted correctly</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">4.</span>
              <span>Click "Send to Webhook" for each service to process and upload the data</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">5.</span>
              <span>Monitor the progress and wait for upload completion confirmations</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">6.</span>
              <span>After all uploads complete, you'll be redirected to view the reconciliation results</span>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-50 dark:bg-purple-900/20 rounded-xl border border-gray-200 dark:border-purple-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Technical Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Services Endpoint:</span>
              <div className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 break-all">
                https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getnocodbservice
              </div>
            </div>
            <div>
              <span className="font-medium">Upload Endpoint:</span>
              <div className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 break-all">
                https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/sendcsv
              </div>
            </div>
            <div>
              <span className="font-medium">Processing Method:</span>
              <p className="mt-1">Each CSV file is uploaded separately with service metadata</p>
            </div>
            <div>
              <span className="font-medium">Service Detection:</span>
              <p className="mt-1">Automatically filters duplicate services from the webhook response</p>
            </div>
            <div>
              <span className="font-medium">Supported Format:</span>
              <p className="mt-1">CSV files with comma-separated values and headers</p>
            </div>
            <div>
              <span className="font-medium">Multi-service Support:</span>
              <p className="mt-1">Upload different CSV files for each detected service simultaneously</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}