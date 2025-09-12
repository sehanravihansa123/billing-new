"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { ArrowLeft, CheckCircle, ChevronRight, FileText, Loader, Search, Check, Settings } from "lucide-react"

function AutotaskContractServicesPage() {
  const router = useRouter()
  const [selectedContracts, setSelectedContracts] = useState({}) // From previous page
  const [allServices, setAllServices] = useState([]) // Store all services from getservicesname webhook
  const [contractServices, setContractServices] = useState({}) // { contractId: [services] }
  const [loading, setLoading] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true) // Track all services loading
  const [loadingContractServices, setLoadingContractServices] = useState(false) // Track contract services loading
  const [error, setError] = useState(null)

  // UI State
  const [selectedContract, setSelectedContract] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServices, setFilteredServices] = useState([])

  // -----------------------
  // Load all services (run once on mount)
  // -----------------------
  const loadAllServices = async () => {
    try {
      setLoadingServices(true)
      setError(null)
      console.log("=== LOADING ALL SERVICES ===")

      // Try POST method first (n8n webhooks often expect POST)
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservicesname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Empty body for POST
      })

      console.log("All services response status:", response.status)

      if (!response.ok) {
        // If POST fails, try GET as fallback
        console.log("POST failed, trying GET method...")
        const getResponse = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservicesname", {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        })

        if (!getResponse.ok) {
          throw new Error(`Both POST and GET failed. GET status: ${getResponse.status}`)
        }

        const services = await getResponse.json()
        console.log("All services loaded via GET:", services)
        setAllServices(services)
        return
      }

      const services = await response.json()
      console.log("All services loaded via POST:", services)
      console.log("Total services count:", services.length)

      setAllServices(services)
    } catch (err) {
      console.error("Error loading all services:", err)
      setError(`Failed to load services: ${err.message}. Check console for network details.`)
    } finally {
      setLoadingServices(false)
    }
  }

  // -----------------------
  // Load services for a specific contract (POST)
  // -----------------------
  const loadServicesForContract = async (contractId) => {
    try {
      setLoadingContractServices(true)
      setError(null)
      console.log(`=== LOADING SERVICES FOR CONTRACT ${contractId} ===`)

      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractIds: [contractId], // Use array format as per your n8n setup
        }),
      })

      console.log(`Contract services response status for contract ${contractId}:`, response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get response as text first to check if it's empty or malformed
      const responseText = await response.text()
      console.log(`Contract services raw response for ${contractId}:`, responseText)
      console.log(`Response length: ${responseText.length}`)

      if (!responseText || responseText.trim() === '') {
        console.warn(`Empty response for contract ${contractId}, trying different request formats...`)
        
        // Try different request body formats
        const alternativeFormats = [
          { contractId: contractId }, // Singular contractId
          { contractIds: contractId }, // contractIds as single value
          { body: { contractIds: [contractId] } }, // Nested in body
        ]
        
        for (const altFormat of alternativeFormats) {
          console.log(`Trying alternative format for ${contractId}:`, JSON.stringify(altFormat))
          
          const altResponse = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(altFormat),
          })
          
          const altResponseText = await altResponse.text()
          console.log(`Alternative response length:`, altResponseText.length)
          
          if (altResponseText && altResponseText.trim() !== '') {
            console.log(`Alternative format worked! Response:`, altResponseText.substring(0, 200))
            
            try {
              const contractServicesData = JSON.parse(altResponseText)
              const servicesArray = Array.isArray(contractServicesData) ? contractServicesData : []
              
              setContractServices((prev) => ({
                ...prev,
                [String(contractId)]: servicesArray,
              }))
              return
            } catch (parseErr) {
              console.error(`Parse error with alternative format:`, parseErr)
              continue
            }
          }
        }
        
        // If all formats failed, set empty array
        console.warn(`All request formats failed for contract ${contractId}`)
        setContractServices((prev) => ({
          ...prev,
          [String(contractId)]: [],
        }))
        return
      }

      let contractServicesData
      try {
        contractServicesData = JSON.parse(responseText)
      } catch (parseErr) {
        console.error(`JSON parse error for contract ${contractId}:`, parseErr)
        console.error(`Raw response was:`, responseText.substring(0, 500))
        throw new Error(`Invalid JSON response: ${parseErr.message}`)
      }

      console.log(`Contract services for ${contractId}:`, contractServicesData)

      // Since you mentioned the response is now clean JSON array, we can use it directly
      let servicesArray = Array.isArray(contractServicesData) ? contractServicesData : []
      
      // Filter services to only include ones for the requested contract
      servicesArray = servicesArray.filter(service => 
        service.contractID === parseInt(contractId)
      )
      
      console.log(`Total services received: ${contractServicesData.length}`)
      console.log(`Filtered services for contract ${contractId}: ${servicesArray.length}`)

      setContractServices((prev) => ({
        ...prev,
        [String(contractId)]: servicesArray,
      }))
    } catch (err) {
      console.error(`Error loading services for contract ${contractId}:`, err)
      setError(`Failed to load services for contract ${contractId}: ${err.message}`)
    } finally {
      setLoadingContractServices(false)
    }
  }

  // -----------------------
  // Helper function to get service name by serviceID
  // -----------------------
  const getServiceNameById = (serviceId) => {
    const service = allServices.find(s => s.id === serviceId)
    return service ? service.name : `Service ${serviceId}`
  }

  // -----------------------
  // On mount: load selectedContracts from session and load all services
  // -----------------------
  useEffect(() => {
    const storedContractConfig = sessionStorage.getItem("finalContractConfiguration")

    if (!storedContractConfig) {
      console.log("No contract configuration found, redirecting...")
      router.push("/billing/vendor-settings/onboarding/autotask-contract-mapping")
      return
    }

    const contractConfig = JSON.parse(storedContractConfig)
    console.log("=== LOADING CONTRACT SERVICES PAGE ===")
    console.log("Contract configuration:", contractConfig)

    // Extract selected contracts
    const contracts = contractConfig.selectedContracts || {}
    setSelectedContracts(contracts)

    // Load all services first
    loadAllServices().then(() => {
      // Auto-select first contract after services are loaded
      const firstContract = Object.values(contracts)[0]
      if (firstContract) {
        setSelectedContract(firstContract)
        loadServicesForContract(firstContract.contractId)
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const handleSelectContract = async (contract) => {
    setSelectedContract(contract)
    setSearchTerm("") // Clear search when switching contracts

    // Load services for this contract if not already loaded
    if (!contractServices[String(contract.contractId)]) {
      await loadServicesForContract(contract.contractId)
    }
  }

  // Filter and enhance services when contract or search term changes
  useEffect(() => {
    if (!selectedContract) {
      setFilteredServices([])
      return
    }

    const contractId = String(selectedContract.contractId)
    const services = contractServices[contractId] || []

    console.log(`Filtering services for contract ${contractId}:`, services)

    // Enhance services with service names from allServices lookup
    const servicesWithNames = services.map((contractService) => {
      const serviceId = contractService.serviceID
      const serviceName = getServiceNameById(serviceId)
      
      return {
        ...contractService,
        serviceName: serviceName,
      }
    })

    console.log("Services with names:", servicesWithNames)

    // Apply search filter
    const filtered = searchTerm.trim() === ""
      ? servicesWithNames
      : servicesWithNames.filter((service) => {
          const serviceName = (service.serviceName || "").toLowerCase()
          const invoiceDesc = (service.invoiceDescription || "").toLowerCase()
          const internalDesc = (service.internalDescription || "").toLowerCase()
          const searchLower = searchTerm.toLowerCase()

          return (
            serviceName.includes(searchLower) ||
            invoiceDesc.includes(searchLower) ||
            internalDesc.includes(searchLower) ||
            String(service.serviceID || "").includes(searchLower)
          )
        })

    setFilteredServices(filtered)
  }, [selectedContract, searchTerm, contractServices, allServices])

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-contract-mapping")
  }

  const handleNext = () => {
    // Create final configuration with services
    const finalConfig = {
      selectedContracts,
      contractServices,
      allServices, // Include the services lookup for reference
      summary: {
        totalContracts: Object.keys(selectedContracts).length,
        totalServices: Object.values(contractServices).flat().length,
      },
      timestamp: new Date().toISOString(),
    }

    sessionStorage.setItem("finalServicesConfiguration", JSON.stringify(finalConfig, null, 2))
    console.log("Final configuration with services:", finalConfig)

    // Navigate to completion page
    router.push("/billing/vendor-settings/complete")
  }

  const getAvailableContracts = () => {
    return Object.entries(selectedContracts).map(([orgName, contractData]) => ({
      organizationName: orgName,
      ...contractData,
    }))
  }

  const getServicesCount = (contractId) => {
    const services = contractServices[String(contractId)] || []
    return services.length
  }

  const getTotalServicesCount = () => {
    return Object.values(contractServices).flat().length
  }

  if (loading || loadingServices) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {loadingServices ? "Loading all services..." : "Initializing..."}
            </p>
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
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Services</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setError(null)
                    loadAllServices()
                  }}
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

  const availableContracts = getAvailableContracts()

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
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                    Contract Services
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    Step 5: Review services for selected contracts
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
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Contracts</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    5
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Services</span>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {availableContracts.length} Selected Contracts
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getTotalServicesCount()} Total Services
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {allServices.length} Available Services
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selected Contracts List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Contracts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to view services</p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableContracts.map((contract) => (
                    <button
                      key={contract.contractId}
                      onClick={() => handleSelectContract(contract)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedContract?.contractId === contract.contractId
                          ? "bg-purple-50 border-2 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
                          : "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {contract.contractName || "Unnamed Contract"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {contract.organizationName}
                          </p>
                          {contract.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                              {contract.description}
                            </p>
                          )}
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {getServicesCount(contract.contractId)} services
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Services Viewer */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedContract ? `Services for ${selectedContract.contractName}` : "Services"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedContract
                        ? `Organization: ${selectedContract.organizationName}`
                        : "Select a contract to view its services"}
                    </p>
                  </div>
                  {loadingContractServices && <Loader className="h-5 w-5 animate-spin text-purple-600" />}
                </div>

                {/* Search */}
                {selectedContract && (
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search services..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="max-h-96 overflow-y-auto">
                  {!selectedContract ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select a contract to view its services</p>
                    </div>
                  ) : loadingContractServices ? (
                    <div className="text-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading services for this contract...</p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>{searchTerm ? "No services match your search" : "No services found for this contract"}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Service Name
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Service ID
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Unit Price
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Unit Cost
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                              Adjusted Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {filteredServices.map((service, index) => (
                            <tr key={service.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="py-3 px-4 text-gray-900 dark:text-white">
                                <div>
                                  <div className="font-medium">{service.serviceName}</div>
                                  {service.invoiceDescription && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      Invoice: {service.invoiceDescription}
                                    </div>
                                  )}
                                  {service.internalDescription && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      Internal: {service.internalDescription}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{service.serviceID || "-"}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                ${Number.parseFloat(service.unitPrice || service.internalCurrencyUnitPrice || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                ${Number.parseFloat(service.unitCost || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                ${Number.parseFloat(service.internalCurrencyAdjustedPrice || 0).toFixed(2)}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Services Review Complete</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Found {getTotalServicesCount()} services across {availableContracts.length} selected contracts
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AutotaskContractServicesPage