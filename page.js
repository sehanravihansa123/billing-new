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
  X,
  Package,
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

  // Enhanced state for multi-service support
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredContracts, setFilteredContracts] = useState([])
  const [showMappedOnly, setShowMappedOnly] = useState(false)
  
  // NEW: Support for multiple services per organization
  const [organizationServices, setOrganizationServices] = useState({}) // { orgName: [service1, service2, ...] }
  const [selectedContractsByOrgAndService, setSelectedContractsByOrgAndService] = useState({}) // { "orgName|service": contractId }
  const [expandedOrganizations, setExpandedOrganizations] = useState(new Set()) // Track which orgs are expanded

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedCsvData = sessionStorage.getItem("vendorCsvData")
    const storedBillingConfig = sessionStorage.getItem("billingConfiguration")
    const storedOrgMappings = sessionStorage.getItem("organizationMappings")

    console.log("=== COMPONENT LOADING DEBUG ===")
    console.log("CSV Data in sessionStorage:", storedCsvData ? "Found" : "Missing")
    console.log("Billing Config in sessionStorage:", storedBillingConfig ? "Found" : "Missing")
    console.log("Organization Mappings in sessionStorage:", storedOrgMappings ? "Found" : "Missing")

    if (!storedCsvData || !storedBillingConfig || !storedOrgMappings) {
      console.log("Missing required data, redirecting to onboarding")
      router.push("/billing/vendor-settings/onboarding")
      return
    }

    const csvDataParsed = JSON.parse(storedCsvData)
    const billingConfigParsed = JSON.parse(storedBillingConfig)
    const orgMappingsParsed = JSON.parse(storedOrgMappings)

    setCsvData(csvDataParsed)
    setBillingConfig(billingConfigParsed)
    setOrganizationMappings(orgMappingsParsed)

    // Extract unique organizations and their services from CSV
    extractOrganizationsAndServices(csvDataParsed, billingConfigParsed)

    // Fetch contracts and companies
    fetchAutotaskData()

    console.log("=== END COMPONENT LOADING DEBUG ===")
  }, [router])

  // Contract filtering remains the same
  useEffect(() => {
    if (!selectedOrganization) {
      setFilteredContracts([])
      return
    }

    const autotaskCompany = organizationMappings[selectedOrganization]

    if (!autotaskCompany || autotaskCompany === "No Match Found") {
      setFilteredContracts([])
      return
    }

    const autotaskCompanyName = autotaskCompany.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()

    const matchingAutotaskCompany = autotaskCompanies.find(
      (company) => company.companyName === autotaskCompanyName || company.companyName === autotaskCompany,
    )

    if (!matchingAutotaskCompany) {
      setFilteredContracts([])
      return
    }

    const targetCompanyId = String(matchingAutotaskCompany.id)
    
    const organizationContracts = contracts.filter((contract) => {
      const contractCompanyId = String(contract.companyID)
      return contractCompanyId === targetCompanyId
    })

    // Apply search filter to contract name and description
    const filtered =
      searchTerm.trim() === ""
        ? organizationContracts
        : organizationContracts.filter(
            (contract) =>
              (contract.contractName && contract.contractName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase())),
          )

    setFilteredContracts(filtered)
  }, [selectedOrganization, searchTerm, contracts, organizationMappings, autotaskCompanies])

  // NEW: Enhanced function to extract organizations AND their services (with duplicate handling)
  const extractOrganizationsAndServices = (csvData, billingConfig) => {
    const lines = csvData.fullData.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1).filter((line) => line.trim())

    const orgColumnIndex = headers.indexOf(billingConfig.organizationColumn)
    const planColumnIndex = billingConfig.planNameColumn ? headers.indexOf(billingConfig.planNameColumn) : -1

    console.log("Plan column index:", planColumnIndex, "for column:", billingConfig.planNameColumn)

    const orgServicesMap = {}
    const uniqueOrgs = new Set()

    rows.forEach((row, rowIndex) => {
      const cells = row.split(",").map((cell) => cell.trim())
      const orgName = cells[orgColumnIndex]
      const planValue = planColumnIndex >= 0 ? cells[planColumnIndex] : null

      if (orgName && orgName !== "") {
        uniqueOrgs.add(orgName)

        // If user selected a plan column, track services per organization
        if (planValue && planValue !== "" && billingConfig.planNameColumn) {
          if (!orgServicesMap[orgName]) {
            orgServicesMap[orgName] = []
          }
          
          // FIXED: Instead of using Set, use Array to preserve duplicates
          // Create unique identifier for each instance
          const existingCount = orgServicesMap[orgName].filter(service => 
            service.planValue === planValue
          ).length
          
          const serviceInstance = {
            planValue: planValue,
            instance: existingCount + 1,
            rowIndex: rowIndex,
            displayName: existingCount > 0 ? `${planValue} (Instance ${existingCount + 1})` : planValue
          }
          
          orgServicesMap[orgName].push(serviceInstance)
        }
      }
    })

    console.log("Organization services map with duplicates:", orgServicesMap)
    
    setOrganizations(Array.from(uniqueOrgs))
    
    // Convert to the format expected by the rest of the code
    const orgServicesArray = {}
    Object.keys(orgServicesMap).forEach(org => {
      orgServicesArray[org] = orgServicesMap[org].map(service => service.displayName)
    })
    
    setOrganizationServices(orgServicesArray)
  }

  const fetchAutotaskData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [contractsResponse, companiesResponse] = await Promise.all([
        fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getcontracts"),
        fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskorganisationlist")
      ])

      if (!contractsResponse.ok) {
        throw new Error(`Contracts API error! status: ${contractsResponse.status}`)
      }
      
      if (!companiesResponse.ok) {
        throw new Error(`Companies API error! status: ${companiesResponse.status}`)
      }

      const contractsData = await contractsResponse.json()
      const companiesData = await companiesResponse.json()
      
      const contractsArray = Array.isArray(contractsData) ? contractsData : contractsData.contracts || []
      const companiesArray = Array.isArray(companiesData) ? companiesData : companiesData.companies || []
      
      setContracts(contractsArray)
      setAutotaskCompanies(companiesArray)
      
    } catch (err) {
      console.error("Error fetching Autotask data:", err)
      setError(`Failed to fetch Autotask data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // NEW: Check if organization has multiple services
  const hasMultipleServices = (orgName) => {
    return billingConfig?.planNameColumn && organizationServices[orgName] && organizationServices[orgName].length > 0
  }

  // NEW: Get services for an organization
  const getServicesForOrganization = (orgName) => {
    if (!hasMultipleServices(orgName)) return []
    return organizationServices[orgName] || []
  }

  // Filtered organizations - only show mapped organizations
  const getFilteredOrganizations = () => {
    const mappedOrganizations = organizations.filter(org => 
      organizationMappings[org] && organizationMappings[org] !== "No Match Found"
    )
    
    if (showMappedOnly) {
      return mappedOrganizations.filter(org => {
        if (hasMultipleServices(org)) {
          // For multi-service orgs, check if any service is unmapped
          const services = getServicesForOrganization(org)
          return services.some(service => !selectedContractsByOrgAndService[`${org}|${service}`])
        } else {
          // For single-service orgs, use legacy check
          return !selectedContractsByOrgAndService[`${org}|default`]
        }
      })
    }
    
    return mappedOrganizations
  }

  // NEW: Enhanced contract selection handler
  const handleSelectContract = (contractId, orgName, serviceName = 'default') => {
    const key = `${orgName}|${serviceName}`
    
    setSelectedContractsByOrgAndService(prev => ({
      ...prev,
      [key]: contractId
    }))
  }

  // NEW: Check if contract is selected for specific org/service combination
  const isContractSelected = (contractId, orgName, serviceName = 'default') => {
    const key = `${orgName}|${serviceName}`
    return selectedContractsByOrgAndService[key] === contractId
  }

  // NEW: Clear contract mapping for specific org/service
  const clearContractMapping = (orgName, serviceName = 'default') => {
    const key = `${orgName}|${serviceName}`
    setSelectedContractsByOrgAndService(prev => {
      const newMappings = { ...prev }
      delete newMappings[key]
      return newMappings
    })
  }

  // NEW: Toggle organization expansion
  const toggleOrganizationExpansion = (orgName) => {
    setExpandedOrganizations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orgName)) {
        newSet.delete(orgName)
      } else {
        newSet.add(orgName)
      }
      return newSet
    })
  }

  // NEW: Get total selected contracts count
  const getSelectedContractsCount = () => {
    return Object.keys(selectedContractsByOrgAndService).length
  }

  // NEW: Check if organization is fully mapped
  const isOrganizationFullyMapped = (orgName) => {
    if (hasMultipleServices(orgName)) {
      const services = getServicesForOrganization(orgName)
      return services.every(service => selectedContractsByOrgAndService[`${orgName}|${service}`])
    } else {
      return selectedContractsByOrgAndService[`${orgName}|default`]
    }
  }

  // Enhanced configuration generation
  const generateFinalConfiguration = () => {
    const mappedOrganizations = getFilteredOrganizations()
    const incompleteOrganizations = mappedOrganizations.filter(org => !isOrganizationFullyMapped(org))
    
    if (incompleteOrganizations.length > 0) {
      const incompleteDetails = incompleteOrganizations.map(org => {
        if (hasMultipleServices(org)) {
          const services = getServicesForOrganization(org)
          const unmappedServices = services.filter(service => !selectedContractsByOrgAndService[`${org}|${service}`])
          return `${org} (missing: ${unmappedServices.join(', ')})`
        }
        return org
      })
      setError(`Please select contracts for: ${incompleteDetails.join('; ')}`)
      return
    }
    
    if (mappedOrganizations.length === 0) {
      setError("No mapped organizations found. Please go back and complete the company mapping step.")
      return
    }

    const finalConfiguration = {
      billingConfiguration: billingConfig,
      organizationMappings: organizationMappings,
      selectedContracts: {},
      contractSelectionSummary: [],
      multiServiceMode: billingConfig?.planNameColumn ? true : false,
      organizationServices: organizationServices,
      csvData: {
        headers: csvData.headers,
        totalRows: csvData.fullData.split("\n").length - 1,
      },
      summary: {
        totalOrganizations: organizations.length,
        mappedOrganizations: mappedOrganizations.length,
        selectedContracts: getSelectedContractsCount(),
        totalServices: Object.values(organizationServices).flat().length,
      },
      timestamp: new Date().toISOString(),
    }

    // Build selected contracts mapping and summary
    Object.entries(selectedContractsByOrgAndService).forEach(([key, contractId]) => {
      const [orgName, serviceName] = key.split('|')
      const contract = contracts.find(c => c.id === contractId)
      const autotaskCompany = organizationMappings[orgName]
      
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
          status: contract.status,
          serviceName: serviceName !== 'default' ? serviceName : null, // NEW: Include service name
        }
        
        // For multi-service mode, use orgName|service as key
        const configKey = serviceName !== 'default' ? `${orgName}|${serviceName}` : orgName
        finalConfiguration.selectedContracts[configKey] = contractData
        
        finalConfiguration.contractSelectionSummary.push({
          organizationName: orgName,
          serviceName: serviceName !== 'default' ? serviceName : null,
          ...contractData
        })
      }
    })

    const output = JSON.stringify(finalConfiguration, null, 2)
    setJsonOutput(output)
    setIsProcessingComplete(true)
    
    sessionStorage.setItem("finalContractConfiguration", output)
    
    console.log('Contract selection complete:', finalConfiguration.contractSelectionSummary)
    setError(null)
  }

  const downloadJson = () => {
    if (!jsonOutput) return
    
    const timestamp = new Date().toISOString().split('T')[0]
    const contractCount = getSelectedContractsCount()
    
    const blob = new Blob([jsonOutput], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `contract-selections-${contractCount}contracts-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-company-mapping")
  }

  const handleNext = () => {
    if (!isProcessingComplete) {
      setError("Please generate the configuration first")
      return
    }
    
    router.push("/billing/vendor-settings/onboarding/autotask-contractservice-mapping")
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

  if (error && !contracts.length) {
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
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                    Organization Contracts
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    Step 4: Select contracts per organization {billingConfig?.planNameColumn && '& service'}
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

            {/* Enhanced Stats Bar */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getFilteredOrganizations().length} Organizations Available
                    </span>
                  </div>
                  {billingConfig?.planNameColumn && (
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Object.values(organizationServices).flat().length} Services Total
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedOrganization ? filteredContracts.length : 0} Contracts for Selected
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
                    {showMappedOnly ? "Show All" : "Unmapped Only"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Enhanced Organizations List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {billingConfig?.planNameColumn ? 'Click to expand and select services' : 'Click to select and view contracts'}
                </p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredOrganizations().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm font-medium">No Organizations Available</p>
                      <p className="text-xs mt-1">
                        No organizations are mapped to companies with contracts.
                      </p>
                    </div>
                  ) : (
                    getFilteredOrganizations().map((org) => {
                      const hasServices = hasMultipleServices(org)
                      const isFullyMapped = isOrganizationFullyMapped(org)
                      const isExpanded = expandedOrganizations.has(org)

                      return (
                        <div key={org} className="space-y-1">
                          <button
                            onClick={() => {
                              if (hasServices) {
                                toggleOrganizationExpansion(org)
                              } else {
                                setSelectedOrganization(org)
                              }
                            }}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                              selectedOrganization === org && !hasServices
                                ? "bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                                : isFullyMapped
                                ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700"
                                : "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{org}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  → {organizationMappings[org]}
                                </p>
                                {hasServices && (
                                  <p className="text-xs text-purple-600 dark:text-purple-400 truncate mt-1">
                                    {getServicesForOrganization(org).length} services
                                  </p>
                                )}
                                {isFullyMapped && (
                                  <p className="text-xs text-green-600 dark:text-green-400 truncate mt-1">
                                    ✓ {hasServices ? 'All services mapped' : 'Contract selected'}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                {hasServices && (
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                )}
                                {isFullyMapped ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Check className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Service List for Multi-Service Organizations */}
                          {hasServices && isExpanded && (
                            <div className="ml-4 space-y-1">
                              {getServicesForOrganization(org).map((service) => {
                                const isServiceMapped = selectedContractsByOrgAndService[`${org}|${service}`]
                                
                                return (
                                  <button
                                    key={service}
                                    onClick={() => setSelectedOrganization(org)}
                                    className={`w-full text-left p-2 rounded-md text-sm transition-all ${
                                      selectedOrganization === org
                                        ? "bg-blue-100 border border-blue-300 dark:bg-blue-900/30 dark:border-blue-600"
                                        : isServiceMapped
                                        ? "bg-green-100 border border-green-300 dark:bg-green-900/30 dark:border-green-600"
                                        : "bg-gray-100 border border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-900 dark:text-white truncate">{service}</span>
                                      {isServiceMapped && (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Contracts Viewer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedOrganization ? `Contracts for ${selectedOrganization}` : "Contracts"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedOrganization
                        ? hasMultipleServices(selectedOrganization) 
                          ? `Select contracts for each service`
                          : `Select one contract for this organization`
                        : "Select an organization to view its contracts"}
                    </p>
                  </div>
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
                  ) : hasMultipleServices(selectedOrganization) ? (
                    // Multi-service contract selection
                    <div className="space-y-4">
                      {getServicesForOrganization(selectedOrganization).map((service) => (
                        <div key={service} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{service}</h3>
                            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 px-2 py-1 rounded-full">
                              Service
                            </span>
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {filteredContracts.map((contract, index) => (
                              <button
                                key={`${contract.id || index}-${service}`}
                                onClick={() => handleSelectContract(contract.id, selectedOrganization, service)}
                                className={`w-full text-left p-2 rounded-md border text-sm transition-all ${
                                  isContractSelected(contract.id, selectedOrganization, service)
                                    ? "bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                      {contract.contractName || "Unnamed Contract"}
                                    </div>
                                    {contract.description && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                        {contract.description}
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                      <span>
                                        {contract.estimatedRevenue
                                          ? `${Number.parseFloat(contract.estimatedRevenue).toLocaleString()}`
                                          : "$0.00"}
                                      </span>
                                      <span
                                        className={`px-1 py-0.5 rounded ${
                                          contract.status_label === "Active" || contract.status === 1
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                        }`}
                                      >
                                        {contract.status_label || (contract.status === 1 ? "Active" : "Inactive")}
                                      </span>
                                    </div>
                                  </div>
                                  {isContractSelected(contract.id, selectedOrganization, service) && (
                                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Single contract selection (legacy mode)
                    <div className="space-y-2">
                      {filteredContracts.map((contract, index) => (
                        <button
                          key={contract.id || index}
                          onClick={() => handleSelectContract(contract.id, selectedOrganization)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isContractSelected(contract.id, selectedOrganization)
                              ? "bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {contract.contractName || "Unnamed Contract"}
                              </div>
                              {contract.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                  {contract.description}
                                </div>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>
                                  {contract.contractType_label || contract.contractType || "Recurring Service"}
                                </span>
                                <span>
                                  {contract.estimatedRevenue
                                    ? `${Number.parseFloat(contract.estimatedRevenue).toLocaleString()}`
                                    : "$0.00"}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-md ${
                                    contract.status_label === "Active" || contract.status === 1
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                  }`}
                                >
                                  {contract.status_label || (contract.status === 1 ? "Active" : "Inactive")}
                                </span>
                              </div>
                            </div>
                            {isContractSelected(contract.id, selectedOrganization) && (
                              <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Contract Selection Results Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Selections</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Review and manage selections
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
                  {Object.keys(selectedContractsByOrgAndService).length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      No contracts selected yet
                    </p>
                  ) : (
                    Object.entries(selectedContractsByOrgAndService).map(([key, contractId]) => {
                      const [orgName, serviceName] = key.split('|')
                      const contract = contracts.find(c => c.id === contractId)
                      if (!contract) return null
                      
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {orgName}
                            </p>
                            {serviceName !== 'default' && (
                              <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                                Service: {serviceName}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              → {contract.contractName || "Unnamed Contract"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {organizationMappings[orgName]?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()}
                            </p>
                          </div>
                          <button
                            onClick={() => clearContractMapping(orgName, serviceName)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={generateFinalConfiguration}
                    disabled={Object.keys(selectedContractsByOrgAndService).length === 0}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                  >
                    Generate Final Configuration
                  </button>
                  
                  {isProcessingComplete && (
                    <button
                      onClick={handleNext}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Next: Contract Services
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && contracts.length > 0 && (
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
                  Contract selections for {getSelectedContractsCount()} {billingConfig?.planNameColumn ? 'services' : 'organizations'}
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