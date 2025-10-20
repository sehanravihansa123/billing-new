"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, FileText, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface ComparisonResult {
  Status: string
  "Sheet Unit": string
  "Autotask Unit": string
  Metadata: Array<{
    Id: number
    SheetCustomerName: string
    SheetServiceName: string
    AutotaskCustomerName: string
    AutotaskContractName: string
    AutotaskContractServiceName: string
    SheetPlanName: string
    SheetUnitColumnName: string
  }>
}

interface ReconciliationRun {
  Id: number
  Service: string
  reconciliation_run_id: string
  run_name: string
  run_by: string
  status: string
  processed_at: string
  processed_data: {
    Service: string
    processed_data: {
      "Comparison Results": ComparisonResult
    }
  } | null
  not_mapped: any[]
}

export default function ReconciliationResultsPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<ReconciliationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<ReconciliationRun | null>(null)

  // Fetch reconciliation runs from Next.js API route
  const fetchReconciliationRuns = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/reconciliation-runs')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch reconciliation runs')
      }

      const data = await response.json()
      console.log('API Response:', data)
      setRuns(data.list || [])
      
      // Auto-select first run if available
      if (data.list && data.list.length > 0) {
        setSelectedRun(data.list[0])
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReconciliationRuns()
  }, [])

  const handleBack = () => {
    router.push('/billing-reconciliation/upload-file')
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Over Bill') {
      return <TrendingUp className="h-5 w-5 text-red-600" />
    } else if (status === 'Under Bill') {
      return <TrendingDown className="h-5 w-5 text-orange-600" />
    } else if (status === 'Matched') {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    return <Minus className="h-5 w-5 text-gray-600" />
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'Over Bill': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'Under Bill': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'Matched': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'No Mapping': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles['No Mapping']}`}>
        {status}
      </span>
    )
  }

  const getRunStatusBadge = (status: string) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const calculateDifference = (sheetUnit: string, autotaskUnit: string) => {
    const sheet = parseInt(sheetUnit) || 0
    const autotask = parseInt(autotaskUnit) || 0
    const diff = sheet - autotask
    return {
      value: Math.abs(diff),
      isPositive: diff > 0,
      percentage: autotask > 0 ? ((diff / autotask) * 100).toFixed(1) : '0'
    }
  }

  // Helper to get comparison results - handles nested structure
  const getComparisonResults = (run: ReconciliationRun) => {
    return run.processed_data?.processed_data?.["Comparison Results"]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="px-8 py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                  Reconciliation Results
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  View billing comparison and reconciliation status
                </p>
              </div>
            </div>

            <button
              onClick={fetchReconciliationRuns}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading results</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading reconciliation runs...</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && runs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Runs */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Runs ({runs.length})
              </h2>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {runs.map((run) => {
                  const comparisonResults = getComparisonResults(run)
                  const comparisonStatus = comparisonResults?.Status || 'No Mapping'
                  return (
                    <button
                      key={run.Id}
                      onClick={() => setSelectedRun(run)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        selectedRun?.Id === run.Id
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(comparisonStatus)}
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {run.Service || 'Unknown Service'}
                          </span>
                        </div>
                        {getStatusBadge(comparisonStatus)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {run.run_name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(run.processed_at)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
              {selectedRun ? (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Billing Comparison
                    </h2>
                    {getRunStatusBadge(selectedRun.status)}
                  </div>

                  {(() => {
                    const comparisonResults = getComparisonResults(selectedRun)
                    return comparisonResults ? (
                      <>
                        {/* Comparison Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">CSV Units</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                              {comparisonResults["Sheet Unit"]}
                            </p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Autotask Units</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                              {comparisonResults["Autotask Unit"]}
                            </p>
                          </div>
                          <div className={`rounded-lg p-4 ${
                            comparisonResults.Status === 'Over Bill'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : comparisonResults.Status === 'Under Bill'
                              ? 'bg-orange-50 dark:bg-orange-900/20'
                              : 'bg-green-50 dark:bg-green-900/20'
                          }`}>
                            <p className={`text-sm mb-1 ${
                              comparisonResults.Status === 'Over Bill'
                                ? 'text-red-600 dark:text-red-400'
                                : comparisonResults.Status === 'Under Bill'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              Status
                            </p>
                            <p className={`text-xl font-bold ${
                              comparisonResults.Status === 'Over Bill'
                                ? 'text-red-900 dark:text-red-100'
                                : comparisonResults.Status === 'Under Bill'
                                ? 'text-orange-900 dark:text-orange-100'
                                : 'text-green-900 dark:text-green-100'
                            }`}>
                              {comparisonResults.Status}
                            </p>
                          </div>
                        </div>

                        {/* Difference Calculation */}
                        {(() => {
                          const diff = calculateDifference(
                            comparisonResults["Sheet Unit"],
                            comparisonResults["Autotask Unit"]
                          )
                          return diff.value > 0 ? (
                            <div className={`p-4 rounded-lg mb-6 ${
                              diff.isPositive 
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-sm font-medium ${
                                    diff.isPositive 
                                      ? 'text-red-800 dark:text-red-200'
                                      : 'text-orange-800 dark:text-orange-200'
                                  }`}>
                                    Difference Detected
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    diff.isPositive 
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-orange-600 dark:text-orange-400'
                                  }`}>
                                    {diff.isPositive ? 'CSV has fewer units than Autotask' : 'CSV has more units than Autotask'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-2xl font-bold ${
                                    diff.isPositive 
                                      ? 'text-red-900 dark:text-red-100'
                                      : 'text-orange-900 dark:text-orange-100'
                                  }`}>
                                    {diff.value}
                                  </p>
                                  <p className={`text-xs ${
                                    diff.isPositive 
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-orange-600 dark:text-orange-400'
                                  }`}>
                                    ({diff.percentage}% difference)
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null
                        })()}

                        {/* Mapping Details */}
                        {comparisonResults.Metadata && comparisonResults.Metadata.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Mapping Details
                            </h3>
                            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-4">
                              {comparisonResults.Metadata.map((meta, index) => (
                                <div key={index} className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-200 dark:border-slate-700 last:border-b-0 last:pb-0">
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">CSV Customer</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{meta.SheetCustomerName}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Autotask Customer</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{meta.AutotaskCustomerName}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">CSV Plan</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{meta.SheetPlanName}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Autotask Contract</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{meta.AutotaskContractName}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Autotask Service</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{meta.AutotaskContractServiceName}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Run Metadata */}
                        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Run Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Service</p>
                              <p className="text-gray-900 dark:text-white font-medium">{selectedRun.Service}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Run By</p>
                              <p className="text-gray-900 dark:text-white font-medium">{selectedRun.run_by || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Run Name</p>
                              <p className="text-gray-900 dark:text-white font-medium">{selectedRun.run_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Processed At</p>
                              <p className="text-gray-900 dark:text-white font-medium">{formatDate(selectedRun.processed_at)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Not Mapped Items */}
                        {selectedRun.not_mapped && selectedRun.not_mapped.length > 0 && (
                          <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Unmapped Items ({selectedRun.not_mapped.length})
                            </h3>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                                The following items from the CSV were not matched with Autotask:
                              </p>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {selectedRun.not_mapped.map((item, index) => (
                                  <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300 py-1">
                                    {item.Customer || item.Domain} - {item["Plan Name"]} ({item["Used Licenses"]} units)
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                          No Comparison Data
                        </p>
                        <p className="text-gray-500 dark:text-gray-500 text-sm">
                          This reconciliation run has no processed comparison results.
                        </p>
                        {selectedRun.not_mapped && selectedRun.not_mapped.length > 0 && (
                          <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
                            However, there are {selectedRun.not_mapped.length} unmapped items from the CSV.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a reconciliation run to view billing comparison
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Runs State */}
        {!loading && !error && runs.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
              No Reconciliation Runs Found
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Upload CSV files to create reconciliation runs
            </p>
            <button
              onClick={() => router.push('/billing-reconciliation/upload-file')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Upload CSV Files
            </button>
          </div>
        )}
      </div>
    </div>
  )
}