"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { ArrowLeft, Download, CheckCircle, Settings, ChevronRight, Building, Loader, Search, X, Check, ArrowRight, Users, Filter, Eye } from "lucide-react"

function AutotaskMappingPage() {
  const router = useRouter()
  const [csvData, setCsvData] = useState(null)
  const [billingConfig, setBillingConfig] = useState(null)
  const [autotaskCompanies, setAutotaskCompanies] = useState([])
  const [contracts, setContracts] = useState([]) // NEW: Add contracts state
  const [organizations, setOrganizations] = useState([])
  const [mappings, setMappings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [jsonOutput, setJsonOutput] = useState("")
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  
  // UI State
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCompanies, setFilteredCompanies] = useState([])
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedCsvData = sessionStorage.getItem('vendorCsvData')
    const storedBillingConfig = sessionStorage.getItem('billingConfiguration')
    
    if (!storedCsvData || !storedBillingConfig) {
      router.push('/billing/vendor-settings/onboarding')
      return
    }

    const csvDataParsed = JSON.parse(storedCsvData)
    const billingConfigParsed = JSON.parse(storedBillingConfig)
    
    setCsvData(csvDataParsed)
    setBillingConfig(billingConfigParsed)
    
    // Extract organizations from CSV
    extractOrganizations(csvDataParsed, billingConfigParsed)
    
    // Fetch both Autotask companies and contracts
    fetchAutotaskData()
  }, [router])

  useEffect(() => {
    // Filter companies based on search term and contracts availability
    let companies = autotaskCompanies
    
    // Filter out companies that have no contracts
    if (contracts.length > 0) {
      companies = autotaskCompanies.filter(company => {
        const companyContracts = contracts.filter(contract => 
          String(contract.companyID) === String(company.id)
        )
        return companyContracts.length > 0
      })
    }
    
    // Apply search filter
    if (searchTerm.trim() === "") {
      setFilteredCompanies(companies)
    } else {
      const filtered = companies.filter(company => 
        company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCompanies(filtered)
    }
  }, [searchTerm, autotaskCompanies, contracts])

  const extractOrganizations = (csvData, billingConfig) => {
    const lines = csvData.fullData.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).filter(line => line.trim())
    
    const orgColumnIndex = headers.indexOf(billingConfig.organizationColumn)
    
    if (orgColumnIndex >= 0) {
      const uniqueOrgs = new Set()
      rows.forEach(row => {
        const cells = row.split(',').map(cell => cell.trim())
        const orgName = cells[orgColumnIndex]
        if (orgName && orgName !== '') {
          uniqueOrgs.add(orgName)
        }
      })
      setOrganizations(Array.from(uniqueOrgs))
    }
  }

  // NEW: Fetch both companies and contracts
  const fetchAutotaskData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch companies and contracts in parallel
      const [companiesResponse, contractsResponse] = await Promise.all([
        fetch('https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskorganisationlist'),
        fetch('https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getcontracts')
      ])
      
      if (!companiesResponse.ok) {
        throw new Error(`Companies API error! status: ${companiesResponse.status}`)
      }
      
      if (!contractsResponse.ok) {
        throw new Error(`Contracts API error! status: ${contractsResponse.status}`)
      }
      
      const companiesData = await companiesResponse.json()
      const contractsData = await contractsResponse.json()
      
      const companies = Array.isArray(companiesData) ? companiesData : (companiesData.companies || [])
      const contractsArray = Array.isArray(contractsData) ? contractsData : (contractsData.contracts || [])
      
      setAutotaskCompanies(companies)
      setContracts(contractsArray)
      
      console.log(`Loaded ${companies.length} companies and ${contractsArray.length} contracts`)
      
    } catch (err) {
      console.error('Error fetching Autotask data:', err)
      setError(`Failed to fetch Autotask data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySelect = (company) => {
    if (!selectedOrg) return
    
    const companyValue = company.id === 0 ? `${company.companyName} (ID: 0)` : company.companyName
    setMappings(prev => ({ ...prev, [selectedOrg]: companyValue }))
    
    // Auto-select next unmapped organization
    const nextUnmapped = organizations.find(org => org !== selectedOrg && !mappings[org])
    if (nextUnmapped) {
      setSelectedOrg(nextUnmapped)
    }
  }

  const handleNoMatchSelect = () => {
    if (!selectedOrg) return
    setMappings(prev => ({ ...prev, [selectedOrg]: "No Match Found" }))
    
    // Auto-select next unmapped organization
    const nextUnmapped = organizations.find(org => org !== selectedOrg && !mappings[org])
    if (nextUnmapped) {
      setSelectedOrg(nextUnmapped)
    }
  }

  const clearMapping = (orgName) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[orgName]
      return newMappings
    })
  }

  const generateFinalMapping = () => {
    const finalMapping = {
      billingConfiguration: billingConfig,
      organizationMappings: mappings,
      csvData: {
        headers: csvData.headers,
        totalRows: csvData.fullData.split('\n').length - 1
      },
      mappingSummary: {
        totalOrganizations: organizations.length,
        mappedOrganizations: Object.keys(mappings).filter(key => mappings[key] !== "No Match Found" && mappings[key] !== "").length,
        unmappedOrganizations: organizations.filter(org => !mappings[org] || mappings[org] === "No Match Found" || mappings[org] === "").length,
        companiesWithContracts: filteredCompanies.length,
        totalAvailableCompanies: autotaskCompanies.length
      },
      timestamp: new Date().toISOString()
    }

    const output = JSON.stringify(finalMapping, null, 2)
    setJsonOutput(output)
    setIsProcessingComplete(true)
    sessionStorage.setItem('finalAutotaskMapping', output)
  }

  const downloadJson = () => {
    if (!jsonOutput) return
    const blob = new Blob([jsonOutput], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autotask-company-mapping-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push('/billing/vendor-settings/onboarding/mapping')
  }

  const handleNext = () => {
    // Store the organization mappings for the next step
    sessionStorage.setItem('organizationMappings', JSON.stringify(mappings))
    
    // Navigate to autotask contract mapping page
    router.push('/billing/vendor-settings/onboarding/autotask-contract-mapping')
  }

  const getFilteredOrganizations = () => {
    if (showUnmappedOnly) {
      return organizations.filter(org => !mappings[org])
    }
    return organizations
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading Autotask data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={fetchAutotaskData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
                >
                  Retry
                </button>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium rounded-lg"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                    Autotask Company Mapping
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    Step 3: Map organizations to Autotask companies with contracts
                  </p>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Upload</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Mapping</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Companies</span>
                </div>
              </div>
            </div>

            {/* Stats Bar - Updated to show filtered companies */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {organizations.length} Organizations
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {filteredCompanies.length} Companies Available
                    </span>
                  </div>
                  {autotaskCompanies.length > filteredCompanies.length && (
                    <div className="flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {autotaskCompanies.length - filteredCompanies.length} Without Contracts
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {Object.keys(mappings).length} Mapped
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUnmappedOnly(!showUnmappedOnly)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      showUnmappedOnly 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Filter className="h-3 w-3 mr-1 inline" />
                    {showUnmappedOnly ? 'Show All' : 'Unmapped Only'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organizations List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Organizations</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Click to select and map
                </p>
              </div>
              
              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredOrganizations().map((orgName) => (
                    <button
                      key={orgName}
                      onClick={() => setSelectedOrg(orgName)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedOrg === orgName
                          ? 'bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                          : mappings[orgName]
                          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {orgName}
                        </span>
                        {mappings[orgName] && (
                          <div className="flex items-center space-x-1">
                            {mappings[orgName] === "No Match Found" ? (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-md">
                                No Match
                              </span>
                            ) : (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {mappings[orgName] && mappings[orgName] !== "No Match Found" && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          → {mappings[orgName]}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Autotask Companies Browser - Updated header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Companies with Contracts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Only showing companies that have contracts available
                </p>
                
                {/* Search */}
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search companies..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="p-4">
                {selectedOrg && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Mapping: {selectedOrg}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Select an Autotask company below
                        </p>
                      </div>
                      <button
                        onClick={handleNoMatchSelect}
                        className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors"
                      >
                        No Match
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCompanies.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {searchTerm ? 'No companies match your search' : 'No companies with contracts available'}
                    </p>
                  ) : (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleCompanySelect(company)}
                        disabled={!selectedOrg}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedOrg
                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {company.companyName}
                        </div>
                        {company.id === 0 && (
                          <div className="text-xs text-gray-500 mt-1">ID: 0</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Mapping Results & Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mapping Results</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Review and manage mappings
                    </p>
                  </div>
                  {jsonOutput && (
                    <button
                      onClick={downloadJson}
                      className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {Object.keys(mappings).length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      No mappings created yet
                    </p>
                  ) : (
                    Object.entries(mappings).map(([orgName, companyName]) => (
                      <div
                        key={orgName}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {orgName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            → {companyName}
                          </p>
                        </div>
                        <button
                          onClick={() => clearMapping(orgName)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={generateFinalMapping}
                    disabled={Object.keys(mappings).length === 0}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                  >
                    Generate Final Mapping
                  </button>
                  
                  {isProcessingComplete && (
                    <button
                      onClick={handleNext}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Next: Contract Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* JSON Output (if needed) */}
          {jsonOutput && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Final Configuration</h3>
              </div>
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {jsonOutput}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AutotaskMappingPage