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

  // Enhanced state for multi-service support (similar to service mapping)
  const [selectedOrgPlan, setSelectedOrgPlan] = useState(null) // { orgName, planName, displayName, key }
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredContracts, setFilteredContracts] = useState([])
  const [showMappedOnly, setShowMappedOnly] = useState(false)
  
  // FIXED: Contract selection per organization/plan combination (like service mapping)
  const [organizationServices, setOrganizationServices] = useState({}) // { orgName: [service1, service2, ...] }
  const [selectedContractsByOrgPlan, setSelectedContractsByOrgPlan] = useState({}) // { "orgName|planName": contractId }
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

  // Contract filtering - now works per organization/plan combination
  useEffect(() => {
    if (!selectedOrgPlan) {
      setFilteredContracts([])
      return
    }

    const autotaskCompany = organizationMappings[selectedOrgPlan.orgName]

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
  }, [selectedOrgPlan, searchTerm, contracts, organizationMappings, autotaskCompanies])

  // Enhanced function to extract organizations AND their services (with duplicate handling)
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

  // Check if organization has multiple services
  const hasMultipleServices = (orgName) => {
    return billingConfig?.planNameColumn && organizationServices[orgName] && organizationServices[orgName].length > 0
  }

  // Get services for an organization
  const getServicesForOrganization = (orgName) => {
    if (!hasMultipleServices(orgName)) return []
    return organizationServices[orgName] || []
  }

  // FIXED: Get organization/plan combinations similar to service mapping page
  const getOrgPlanCombinations = () => {
    const combinations = []
    
    organizations.forEach(orgName => {
      if (organizationMappings[orgName] && organizationMappings[orgName] !== "No Match Found") {
        if (hasMultipleServices(orgName)) {
          const services = getServicesForOrganization(orgName)
          services.forEach(serviceName => {
            combinations.push({
              orgName,
              planName: serviceName,
              displayName: `${orgName} (${serviceName})`,
              key: `${orgName}|${serviceName}`
            })
          })
        } else {
          combinations.push({
            orgName,
            planName: 'default',
            displayName: orgName,
            key: orgName
          })
        }
      }
    })
    
    return combinations
  }

  // Filtered organizations - only show mapped organizations
  const getFilteredOrganizations = () => {
    const mappedOrganizations = organizations.filter(org => 
      organizationMappings[org] && organizationMappings[org] !== "No Match Found"
    )
    
    return mappedOrganizations
  }

  // FIXED: Contract selection handler (one contract per organization/plan combination)
  const handleSelectContract = (contractId, orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    
    setSelectedContractsByOrgPlan(prev => ({
      ...prev,
      [key]: contractId
    }))
  }

  // Check if contract is selected for organization/plan combination
  const isContractSelected = (contractId, orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    return selectedContractsByOrgPlan[key] === contractId
  }

  // Clear contract mapping for organization/plan
  const clearContractMapping = (orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    setSelectedContractsByOrgPlan(prev => {
      const newMappings = { ...prev }
      delete newMappings[key]
      return newMappings
    })
  }

  // Toggle organization expansion
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

  // Get total selected contracts count
  const getSelectedContractsCount = () => {
    return Object.keys(selectedContractsByOrgPlan).length
  }

  // Check if organization/plan combination is mapped
  const isOrgPlanMapped = (orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    return selectedContractsByOrgPlan[key] !== undefined
  }

  // Enhanced configuration generation
  const generateFinalConfiguration = () => {
    const orgPlanCombinations = getOrgPlanCombinations()
    const unmappedCombinations = orgPlanCombinations.filter(combo => 
      !isOrgPlanMapped(combo.orgName, combo.planName)
    )
    
    if (unmappedCombinations.length > 0) {
      const unmappedNames = unmappedCombinations.map(combo => combo.displayName)
      setError(`Please select contracts for: ${unmappedNames.join(', ')}`)
      return
    }
    
    if (orgPlanCombinations.length === 0) {
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
        mappedOrganizations: getFilteredOrganizations().length,
        selectedContracts: getSelectedContractsCount(),
        totalServices: Object.values(organizationServices).flat().length,
      },
      timestamp: new Date().toISOString(),
    }

    // Build selected contracts mapping and summary
    Object.entries(selectedContractsByOrgPlan).forEach(([key, contractId]) => {
      const [orgName, planName] = key.split('|')
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
          serviceName: planName !== 'default' ? planName : null
        }
        
        // Use the key as is for the selected contracts
        finalConfiguration.selectedContracts[key] = contractData
        
        finalConfiguration.contractSelectionSummary.push({
          organizationName: orgName,
          serviceName: planName !== 'default' ? planName : null,
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

  // Handle organization/plan selection
  const handleSelectOrgPlan = (combination) => {
    setSelectedOrgPlan(combination)
    setSearchTerm("")
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

  const orgPlanCombinations = getOrgPlanCombinations()

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
                    Step 4: Select contracts per organization {billingConfig?.planNameColumn && '& plan'}
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
                      {orgPlanCombinations.length} Organization{orgPlanCombinations.length !== 1 ? 's' : ''}/Plan{orgPlanCombinations.length !== 1 ? 's' : ''}
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
                      {selectedOrgPlan ? filteredContracts.length : 0} Contracts Available
                    </span>
                  </div>
                  {getSelectedContractsCount() > 0 && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getSelectedContractsCount()} Contract{getSelectedContractsCount() !== 1 ? 's' : ''} Selected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organizations/Plans List (similar to service mapping) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations & Plans</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {billingConfig?.planNameColumn ? 'Select each plan to choose contracts' : 'Select organizations to choose contracts'}
                </p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orgPlanCombinations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm font-medium">No Organizations Available</p>
                      <p className="text-xs mt-1">
                        No organizations are mapped to companies with contracts.
                      </p>
                    </div>
                  ) : (
                    (() => {
                      // Group combinations by organization
                      const orgGroups = {}
                      orgPlanCombinations.forEach(combo => {
                        if (!orgGroups[combo.orgName]) {
                          orgGroups[combo.orgName] = []
                        }
                        orgGroups[combo.orgName].push(combo)
                      })

                      return Object.entries(orgGroups).map(([orgName, combinations]) => {
                        const hasMultiplePlans = combinations.length > 1
                        
                        return (
                          <div key={orgName} className="space-y-1">
                            {/* Organization Header */}
                            <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{orgName}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {hasMultiplePlans ? `${combinations.length} plans` : '1 organization'}
                              </span>
                            </div>
                            
                            {/* Plan/Service Combinations */}
                            {combinations.map((combination) => {
                              const isMapped = isOrgPlanMapped(combination.orgName, combination.planName)
                              
                              return (
                                <button
                                  key={combination.key}
                                  onClick={() => handleSelectOrgPlan(combination)}
                                  className={`w-full text-left p-3 ml-4 rounded-lg transition-all ${
                                    selectedOrgPlan?.key === combination.key
                                      ? "bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                                      : isMapped
                                      ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700"
                                      : "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      {hasMultiplePlans ? (
                                        <>
                                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 truncate">
                                            {combination.planName}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            Plan/Service Type
                                          </p>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {combination.displayName}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            Organization
                                          </p>
                                        </>
                                      )}
                                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        → {organizationMappings[combination.orgName]}
                                      </p>
                                      <p className="text-xs mt-1">
                                        <span className={isMapped ? "text-green-600 dark:text-green-400" : "text-gray-500"}>
                                          {isMapped ? "✓ Contract selected" : "Select contract"}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {isMapped ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Check className="h-4 w-4 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* Contracts Viewer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedOrgPlan ? 
                        (selectedOrgPlan.planName !== 'default' ? 
                          `Contracts for ${selectedOrgPlan.orgName} - ${selectedOrgPlan.planName}` :
                          `Contracts for ${selectedOrgPlan.orgName}`
                        ) : "Contracts"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedOrgPlan
                        ? `Select ONE contract for this ${selectedOrgPlan.planName !== 'default' ? 'plan' : 'organization'}`
                        : "Select an organization/plan to view available contracts"}
                    </p>
                  </div>
                </div>

                {/* Search */}
                {selectedOrgPlan && (
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
                  {!selectedOrgPlan ? (
                    <div className="text-center py-12 text-gray-500">
                      <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select an organization/plan to view its contracts</p>
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>
                        {searchTerm ? "No contracts match your search" : "No contracts found for this organization"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Show plan context if applicable */}
                      {selectedOrgPlan.planName !== 'default' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              Selecting contract for: {selectedOrgPlan.orgName} → {selectedOrgPlan.planName}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            This contract will be used for the "{selectedOrgPlan.planName}" plan from your CSV
                          </p>
                        </div>
                      )}
                      
                      {filteredContracts.map((contract, index) => (
                        <button
                          key={contract.id || index}
                          onClick={() => handleSelectContract(contract.id, selectedOrgPlan.orgName, selectedOrgPlan.planName)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isContractSelected(contract.id, selectedOrgPlan.orgName, selectedOrgPlan.planName)
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
                            {isContractSelected(contract.id, selectedOrgPlan.orgName, selectedOrgPlan.planName) && (
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

            {/* Contract Selection Results Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Selections</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      One contract per organization/plan
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
                  {Object.keys(selectedContractsByOrgPlan).length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      No contracts selected yet
                    </p>
                  ) : (
                    Object.entries(selectedContractsByOrgPlan).map(([key, contractId]) => {
                      const [orgName, planName] = key.split('|')
                      const contract = contracts.find(c => c.id === contractId)
                      if (!contract) return null
                      
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {planName !== 'default' ? `${orgName} (${planName})` : orgName}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                              Contract: {contract.contractName || "Unnamed Contract"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {organizationMappings[orgName]?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()}
                            </p>
                          </div>
                          <button
                            onClick={() => clearContractMapping(orgName, planName)}
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
                    disabled={Object.keys(selectedContractsByOrgPlan).length === 0}
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
                  Contract selections for {getSelectedContractsCount()} organization{getSelectedContractsCount() !== 1 ? 's' : ''}/plan{getSelectedContractsCount() !== 1 ? 's' : ''}
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