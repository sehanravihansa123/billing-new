"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import {
  ArrowLeft,
  Download,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader,
  Search,
  Check,
  Building,
  Filter,
  AlertTriangle,
} from "lucide-react"

function AutotaskContractMappingPage() {
  const router = useRouter()
  const [csvData, setCsvData] = useState(null)
  const [billingConfig, setBillingConfig] = useState(null)
  const [organizationMappings, setOrganizationMappings] = useState({})
  const [contracts, setContracts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [jsonOutput, setJsonOutput] = useState("")
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  const [autotaskCompanies, setAutotaskCompanies] = useState([])

  // Updated UI State for single contract selection per organization
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredContracts, setFilteredContracts] = useState([])
  const [showMappedOnly, setShowMappedOnly] = useState(false)
  const [selectedContractsByOrg, setSelectedContractsByOrg] = useState({}) // { orgName: contractId }

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedCsvData = sessionStorage.getItem("vendorCsvData")
    const storedBillingConfig = sessionStorage.getItem("billingConfiguration")
    const storedOrgMappings = sessionStorage.getItem("organizationMappings")

    console.log("=== COMPONENT LOADING DEBUG ===")
    console.log("CSV Data in sessionStorage:", storedCsvData ? "Found" : "Missing")
    console.log("Billing Config in sessionStorage:", storedBillingConfig ? "Found" : "Missing")
    console.log("Organization Mappings in sessionStorage:", storedOrgMappings ? "Found" : "Missing")
    console.log("Raw organization mappings:", storedOrgMappings)

    if (!storedCsvData || !storedBillingConfig || !storedOrgMappings) {
      console.log("Missing required data, redirecting to onboarding")
      router.push("/billing/vendor-settings/onboarding")
      return
    }

    const csvDataParsed = JSON.parse(storedCsvData)
    const billingConfigParsed = JSON.parse(storedBillingConfig)
    const orgMappingsParsed = JSON.parse(storedOrgMappings)

    console.log("Parsed organization mappings:", orgMappingsParsed)
    console.log("Organization mappings keys:", Object.keys(orgMappingsParsed))

    setCsvData(csvDataParsed)
    setBillingConfig(billingConfigParsed)
    setOrganizationMappings(orgMappingsParsed)

    // Extract unique organizations from CSV
    extractOrganizations(csvDataParsed, billingConfigParsed)

    // Fetch contracts
    fetchContracts()

    // Fetch Autotask companies
    fetchAutotaskCompanies()

    console.log("=== END COMPONENT LOADING DEBUG ===")
  }, [router])

  useEffect(() => {
    // Filter contracts based on selected organization and search term
    if (!selectedOrganization) {
      setFilteredContracts([])
      return
    }

    const autotaskCompany = organizationMappings[selectedOrganization]

    console.log("=== CONTRACT FILTERING DEBUG ===")
    console.log("Selected CSV organization:", selectedOrganization)
    console.log("Mapped to Autotask company:", autotaskCompany)
    console.log("Organization mappings object:", organizationMappings)
    console.log("Total contracts available:", contracts.length)

    if (!autotaskCompany || autotaskCompany === "No Match Found") {
      console.log("No valid Autotask company mapping found")
      setFilteredContracts([])
      return
    }

    const autotaskCompanyName = autotaskCompany.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()

    console.log("Looking for contracts belonging to Autotask company:", autotaskCompanyName)

    const matchingAutotaskCompany = autotaskCompanies.find(
      (company) => company.companyName === autotaskCompanyName || company.companyName === autotaskCompany,
    )

    if (!matchingAutotaskCompany) {
      console.log("Could not find matching Autotask company in companies list")
      setFilteredContracts([])
      return
    }

    const targetCompanyId = String(matchingAutotaskCompany.id)
    console.log("Found matching Autotask company ID:", targetCompanyId)

    const organizationContracts = contracts.filter((contract) => {
      const contractCompanyId = String(contract.companyID)
      const idMatch = contractCompanyId === targetCompanyId
      return idMatch
    })

    console.log("Found contracts belonging to this Autotask company:", organizationContracts.length)

    // Apply search filter to contract name and description
    const filtered =
      searchTerm.trim() === ""
        ? organizationContracts
        : organizationContracts.filter(
            (contract) =>
              (contract.contractName && contract.contractName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase())),
          )

    console.log("Final filtered contracts after search:", filtered.length)
    console.log("=== END DEBUG ===")

    setFilteredContracts(filtered)
  }, [selectedOrganization, searchTerm, contracts, organizationMappings, autotaskCompanies])

  const extractOrganizations = (csvData, billingConfig) => {
    const lines = csvData.fullData.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1).filter((line) => line.trim())

    const orgColumnIndex = headers.indexOf(billingConfig.organizationColumn)

    if (orgColumnIndex >= 0) {
      const uniqueOrgs = new Set()
      rows.forEach((row) => {
        const cells = row.split(",").map((cell) => cell.trim())
        const orgName = cells[orgColumnIndex]
        if (orgName && orgName !== "") {
          uniqueOrgs.add(orgName)
        }
      })
      setOrganizations(Array.from(uniqueOrgs))
    }
  }

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)

      // FIXED: Use the new contracts webhook URL
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getcontracts")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const contractsArray = Array.isArray(data) ? data : data.contracts || []
      setContracts(contractsArray)
    } catch (err) {
      console.error("Error fetching contracts:", err)
      setError(`Failed to fetch contracts: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAutotaskCompanies = async () => {
    try {
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskorganisationlist")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const companies = Array.isArray(data) ? data : data.companies || []
      setAutotaskCompanies(companies)
    } catch (err) {
      console.error("Error fetching Autotask companies:", err)
    }
  }

  // Updated contract selection handler for single selection per organization
  const handleSelectContract = (contractId) => {
    if (!selectedOrganization) return
    
    setSelectedContractsByOrg(prev => ({
      ...prev,
      [selectedOrganization]: contractId
    }))
  }

  // Helper function to check if contract is selected for current org
  const isContractSelected = (contractId) => {
    return selectedContractsByOrg[selectedOrganization] === contractId
  }

  // Enhanced configuration generation with proper contract selection handling
  const generateFinalConfiguration = () => {
    // Validate that each mapped organization has a selected contract
    const mappedOrgs = organizations.filter(org => 
      organizationMappings[org] && organizationMappings[org] !== "No Match Found"
    )
    
    const missingSelections = mappedOrgs.filter(org => !selectedContractsByOrg[org])
    
    if (missingSelections.length > 0) {
      setError(`Please select contracts for: ${missingSelections.join(', ')}`)
      return
    }

    const finalConfiguration = {
      billingConfiguration: billingConfig,
      organizationMappings: organizationMappings,
      selectedContracts: {},
      contractSelectionSummary: [],
      csvData: {
        headers: csvData.headers,
        totalRows: csvData.fullData.split("\n").length - 1,
      },
      summary: {
        totalOrganizations: organizations.length,
        mappedOrganizations: mappedOrgs.length,
        selectedContracts: Object.keys(selectedContractsByOrg).length,
      },
      timestamp: new Date().toISOString(),
    }

    // Build selected contracts mapping and summary
    Object.entries(selectedContractsByOrg).forEach(([org, contractId]) => {
      const contract = contracts.find(c => c.id === contractId)
      const autotaskCompany = organizationMappings[org]
      
      if (contract && autotaskCompany) {
        const autotaskCompanyName = autotaskCompany.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
        const matchingAutotaskCompany = autotaskCompanies.find(
          company => company.companyName === autotaskCompanyName
        )
        
        const contractData = {
          contractId: contract.id,
          contractName: contract.contractName || "Unnamed Contract",
          autotaskCompany: autotaskCompany,
          autotaskCompanyId: matchingAutotaskCompany?.id,
          description: contract.description,
          estimatedRevenue: contract.estimatedRevenue,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status
        }
        
        finalConfiguration.selectedContracts[org] = contractData
        
        // Also create a flat summary array for easy processing
        finalConfiguration.contractSelectionSummary.push({
          organizationName: org,
          ...contractData
        })
      }
    })

    const output = JSON.stringify(finalConfiguration, null, 2)
    setJsonOutput(output)
    setIsProcessingComplete(true)
    
    // Store in sessionStorage for next step or download
    sessionStorage.setItem("finalContractConfiguration", output)
    
    console.log('Contract selection complete:', finalConfiguration.contractSelectionSummary)
    
    // Clear any previous errors
    setError(null)
  }

  // Enhanced download function with more detailed filename
  const downloadJson = () => {
    if (!jsonOutput) return
    
    const timestamp = new Date().toISOString().split('T')[0]
    const orgCount = Object.keys(selectedContractsByOrg).length
    
    const blob = new Blob([jsonOutput], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contract-selections-${orgCount}orgs-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-company-mapping")
  }

  // FIXED: Updated to navigate to the services page
  const handleNext = () => {
    if (!isProcessingComplete) {
      setError("Please generate the configuration first")
      return
    }
    
    // Navigate to the services mapping page
    router.push("/billing/vendor-settings/onboarding/autotask-contractservice-mapping")
  }

  const getFilteredOrganizations = () => {
    if (showMappedOnly) {
      return organizations.filter((org) => organizationMappings[org] && organizationMappings[org] !== "No Match Found")
    }
    return organizations
  }

  // Get count of organizations with selected contracts
  const getSelectedContractsCount = () => {
    return Object.keys(selectedContractsByOrg).length
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading Autotask contracts...</p>
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
                  onClick={fetchContracts}
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
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                    Organization Contracts
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    Step 4: Select one contract per organization
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
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Fields</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Companies</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Contracts</span>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {organizations.length} Organizations
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {contracts.length} Total Contracts
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedOrganization ? filteredContracts.length : 0} Available for Selected
                    </span>
                  </div>
                  {getSelectedContractsCount() > 0 && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getSelectedContractsCount()} Contracts Selected
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMappedOnly(!showMappedOnly)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      showMappedOnly
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Filter className="h-3 w-3 mr-1 inline" />
                    {showMappedOnly ? "Show All" : "Mapped Only"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organizations List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to view and select contracts</p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredOrganizations().map((org) => {
                    const hasAutotaskMapping =
                      organizationMappings[org] && organizationMappings[org] !== "No Match Found"
                    const hasSelectedContract = selectedContractsByOrg[org]

                    return (
                      <button
                        key={org}
                        onClick={() => setSelectedOrganization(org)}
                        disabled={!hasAutotaskMapping}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedOrganization === org
                            ? "bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                            : hasAutotaskMapping
                              ? "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                              : "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{org}</p>
                            {hasAutotaskMapping && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                → {organizationMappings[org]}
                              </p>
                            )}
                            {hasSelectedContract && (
                              <p className="text-xs text-green-600 dark:text-green-400 truncate mt-1">
                                ✓ Contract selected
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {!hasAutotaskMapping ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="No Autotask company mapped" />
                            ) : hasSelectedContract ? (
                              <CheckCircle className="h-4 w-4 text-green-500" title="Contract selected" />
                            ) : (
                              <Check className="h-4 w-4 text-gray-400" title="Ready for contract selection" />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Contracts Viewer */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedOrganization ? `Contracts for ${selectedOrganization}` : "Contracts"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedOrganization
                        ? `Select one contract for this organization`
                        : "Select an organization to view its contracts"}
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

                {/* Search */}
                {selectedOrganization && (
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search contracts..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="max-h-96 overflow-y-auto">
                  {!selectedOrganization ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select an organization to view its contracts</p>
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>
                        {searchTerm ? "No contracts match your search" : "No contracts found for this organization"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Select
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Contract Name
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Company
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Service Type
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Start Date
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              End Date
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {filteredContracts.map((contract, index) => (
                            <tr
                              key={contract.id || index}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                isContractSelected(contract.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                              }`}
                            >
                              <td className="py-3 px-4">
                                <input
                                  type="radio"
                                  name={`contract-${selectedOrganization}`}
                                  checked={isContractSelected(contract.id)}
                                  onChange={() => handleSelectContract(contract.id)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>
                              <td className="py-3 px-4 text-gray-900 dark:text-white">
                                <div>
                                  <div className="font-medium">{contract.contractName || "Unnamed Contract"}</div>
                                  {contract.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {contract.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {organizationMappings[selectedOrganization]
                                  ?.replace(/\s*\(ID:\s*\d+\)\s*$/, "")
                                  .trim() || selectedOrganization}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {contract.contractType_label || contract.contractType || "Recurring Service"}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "-"}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "-"}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {contract.estimatedRevenue
                                  ? `${Number.parseFloat(contract.estimatedRevenue).toLocaleString()}`
                                  : "$0.00"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded-md ${
                                    contract.status_label === "Active" || contract.status === 1
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                      : contract.status_label === "Inactive" || contract.status === 0
                                        ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {contract.status_label || (contract.status === 1 ? "Active" : "Inactive")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Complete</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getSelectedContractsCount() > 0
                    ? `Generate configuration with ${getSelectedContractsCount()} selected contracts`
                    : "Select contracts for each organization to generate configuration"}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {getSelectedContractsCount() > 0 && (
                  <button
                    onClick={() => setSelectedContractsByOrg({})}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    Clear All Selections
                  </button>
                )}
                <button
                  onClick={generateFinalConfiguration}
                  disabled={getSelectedContractsCount() === 0}
                  className={`px-6 py-3 text-sm font-medium rounded-xl transition-colors duration-200 ${
                    getSelectedContractsCount() > 0
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Generate Final Configuration
                </button>

                {isProcessingComplete && (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Continue to Services
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JSON Output */}
          {jsonOutput && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Final Configuration</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Contract selections for {getSelectedContractsCount()} organizations
                </p>
              </div>
              <div className="p-4">
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{jsonOutput}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AutotaskContractMappingPage