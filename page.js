"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { ArrowLeft, CheckCircle, ChevronRight, FileText, Loader, Search, Check, Settings, X, Download, AlertTriangle } from "lucide-react"

function AutotaskContractServicesPage() {
  const router = useRouter()
  const [selectedContracts, setSelectedContracts] = useState({}) // From previous page
  const [allServices, setAllServices] = useState([]) // Store all services from getservicesname webhook
  const [contractServices, setContractServices] = useState({}) // { contractId: [services] }
  const [loading, setLoading] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true) // Track all services loading
  const [loadingContractServices, setLoadingContractServices] = useState(false) // Track contract services loading
  const [error, setError] = useState(null)
  const [jsonOutput, setJsonOutput] = useState("")
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  const [sendingData, setSendingData] = useState(false) // Add this state

  // UI State
  const [selectedContract, setSelectedContract] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServices, setFilteredServices] = useState([])
  
  // NEW: Service selection state
  const [selectedServices, setSelectedServices] = useState({}) // { contractId: [serviceIds] }
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

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

  // NEW: Service selection handlers
  const handleSelectService = (contractId, serviceId) => {
    setSelectedServices(prev => {
      const contractServices = prev[contractId] || []
      const isSelected = contractServices.includes(serviceId)
      
      if (isSelected) {
        // Remove service
        return {
          ...prev,
          [contractId]: contractServices.filter(id => id !== serviceId)
        }
      } else {
        // Add service
        return {
          ...prev,
          [contractId]: [...contractServices, serviceId]
        }
      }
    })
  }

  const isServiceSelected = (contractId, serviceId) => {
    const contractServices = selectedServices[contractId] || []
    return contractServices.includes(serviceId)
  }

  const clearServiceSelection = (contractId, serviceId) => {
    setSelectedServices(prev => {
      const contractServices = prev[contractId] || []
      return {
        ...prev,
        [contractId]: contractServices.filter(id => id !== serviceId)
      }
    })
  }

  const getTotalSelectedServices = () => {
    return Object.values(selectedServices).flat().length
  }

  const getSelectedServicesForContract = (contractId) => {
    return selectedServices[contractId] || []
  }

  // NEW: Generate final configuration with selected services
  const generateFinalConfiguration = () => {
    const finalConfig = {
      selectedContracts,
      contractServices,
      selectedServices,
      allServices, // Include the services lookup for reference
      serviceSelectionSummary: [],
      summary: {
        totalContracts: Object.keys(selectedContracts).length,
        totalAvailableServices: Object.values(contractServices).flat().length,
        totalSelectedServices: getTotalSelectedServices(),
        selectionsByContract: Object.entries(selectedServices).map(([contractId, serviceIds]) => ({
          contractId,
          selectedCount: serviceIds.length,
          availableCount: (contractServices[contractId] || []).length
        }))
      },
      timestamp: new Date().toISOString(),
    }

    // Build detailed service selection summary
    Object.entries(selectedServices).forEach(([contractId, serviceIds]) => {
      const contractData = Object.values(selectedContracts).find(c => String(c.contractId) === contractId)
      const allContractServices = contractServices[contractId] || []
      
      serviceIds.forEach(serviceId => {
        const service = allContractServices.find(s => s.id === serviceId || s.serviceID === serviceId)
        if (service && contractData) {
          finalConfig.serviceSelectionSummary.push({
            contractId: contractId,
            contractName: contractData.contractName,
            organizationName: contractData.organizationName || Object.keys(selectedContracts).find(org => selectedContracts[org].contractId === contractData.contractId),
            serviceId: service.serviceID || service.id,
            serviceName: getServiceNameById(service.serviceID || service.id),
            unitPrice: service.unitPrice || service.internalCurrencyUnitPrice || 0,
            unitCost: service.unitCost || 0,
            adjustedPrice: service.internalCurrencyAdjustedPrice || 0,
            invoiceDescription: service.invoiceDescription,
            internalDescription: service.internalDescription
          })
        }
      })
    })

    const output = JSON.stringify(finalConfig, null, 2)
    setJsonOutput(output)
    setIsProcessingComplete(true)
    
    sessionStorage.setItem("finalServicesConfiguration", output)
    console.log("Final configuration with selected services:", finalConfig)
  }

  const downloadJson = () => {
    if (!jsonOutput) return
    
    const timestamp = new Date().toISOString().split('T')[0]
    const serviceCount = getTotalSelectedServices()
    
    const blob = new Blob([jsonOutput], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `service-selections-${serviceCount}services-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // UPDATED: Complete handleNext function for NocoDB
  const handleNext = async () => {
    if (!isProcessingComplete) {
      setError("Please generate the configuration first")
      return
    }
    
    try {
      setSendingData(true)
      setError(null)
      
      // Get all the stored configuration data
      const storedBillingConfig = sessionStorage.getItem("billingConfiguration")
      const storedOrgMappings = sessionStorage.getItem("organizationMappings")
      const storedCsvData = sessionStorage.getItem("vendorCsvData")
      const billingConfig = storedBillingConfig ? JSON.parse(storedBillingConfig) : null
      const orgMappings = storedOrgMappings ? JSON.parse(storedOrgMappings) : null
      const csvData = storedCsvData ? JSON.parse(storedCsvData) : null
      
      // Get the final services configuration
      const finalConfig = JSON.parse(jsonOutput)
      
      console.log('Starting to send individual service records to NocoDB...')
      console.log('Total services to process:', finalConfig.serviceSelectionSummary?.length || 0)
      
      // Send one request per service selection to match NocoDB structure
      if (finalConfig.serviceSelectionSummary && finalConfig.serviceSelectionSummary.length > 0) {
        
        for (const [index, serviceSelection] of finalConfig.serviceSelectionSummary.entries()) {
          console.log(`Processing service ${index + 1}/${finalConfig.serviceSelectionSummary.length}:`, serviceSelection.serviceName)
          
          // Find the contract data
          const contractData = Object.values(selectedContracts).find(c => 
            String(c.contractId) === String(serviceSelection.contractId)
          )
          
          // Find the service data from contract services
          const contractServicesData = contractServices[String(serviceSelection.contractId)] || []
          const serviceData = contractServicesData.find(s => 
            (s.serviceID || s.id) === serviceSelection.serviceId
          )
          
          if (!contractData) {
            console.warn(`Contract data not found for service ${serviceSelection.serviceName}`)
            continue
          }
          
          if (!serviceData) {
            console.warn(`Service data not found for service ID ${serviceSelection.serviceId}`)
            continue
          }
          
          // Find the original CSV company name from organization mappings
          // Look up the original CSV organization name that was mapped to this Autotask company
          let csvCompanyName = ''
          let csvPlanValue = ''
          let csvSku = ''
          let csvDescription = ''
          
          if (orgMappings && csvData) {
            // Find the CSV organization that was mapped to this Autotask company
            const csvOrgEntry = Object.entries(orgMappings).find(([csvOrg, autotaskCompany]) => {
              const cleanAutotaskCompany = autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
              const contractAutotaskCompany = contractData.autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
              return cleanAutotaskCompany === contractAutotaskCompany
            })
            
            if (csvOrgEntry) {
              csvCompanyName = csvOrgEntry[0]
              
              // Extract values from CSV data
              const lines = csvData.fullData.split('\n')
              const headers = lines[0].split(',').map(h => h.trim())
              const rows = lines.slice(1).filter(line => line.trim())
              
              // Find column indexes
              const orgColumnIndex = headers.indexOf(billingConfig?.organizationColumn)
              const planColumnIndex = headers.indexOf(billingConfig?.planNameColumn) // User-selected plan column
              const skuColumnIndex = headers.indexOf('sku')
              const descriptionColumnIndex = headers.indexOf('description')
              
              if (orgColumnIndex >= 0) {
                // Find the first row that matches this organization
                const matchingRow = rows.find(row => {
                  const cells = row.split(',').map(cell => cell.trim())
                  return cells[orgColumnIndex] === csvCompanyName
                })
                
                if (matchingRow) {
                  const cells = matchingRow.split(',').map(cell => cell.trim())
                  
                  // Extract plan value from user-selected plan column
                  if (planColumnIndex >= 0 && cells[planColumnIndex]) {
                    csvPlanValue = cells[planColumnIndex]
                  }
                  
                  // Extract SKU and description from the matching row
                  if (skuColumnIndex >= 0 && cells[skuColumnIndex]) {
                    csvSku = cells[skuColumnIndex]
                  }
                  
                  if (descriptionColumnIndex >= 0 && cells[descriptionColumnIndex]) {
                    csvDescription = cells[descriptionColumnIndex]
                  }
                }
              }
            } else {
              csvCompanyName = serviceSelection.organizationName || ''
            }
          }
          
          // Create simplified data structure for NocoDB
          const nocoDbData = {
            // Unique mapping identifier
            mapid: `${serviceSelection.contractId}-${serviceSelection.serviceId}-${Date.now()}`,
            
            // Service information
            service_name: billingConfig?.serviceName || '',
            autotask_service_name: serviceSelection.serviceName || '',
            service_id: serviceSelection.serviceId || '',
            
            // Contract information  
            contract_name: contractData.contractName || '',
            contract_id: contractData.contractId || '',
            contract_service_id: serviceData.id || serviceData.serviceID || '',
            
            // Organization information
            organization_name: contractData.autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim() || contractData.autotaskCompany || '',
            customer_id: contractData.autotaskCompanyId || '',
            csv_company_name: csvCompanyName, // Original CSV company name
            
            // Plan and CSV mapping information
            plan_name: billingConfig?.planNameColumn || '',
            csv_filename: csvData?.filename || "uploaded_csv",
            plan_column: billingConfig?.planNameColumn || '',
            org_column: billingConfig?.organizationColumn || '',
            user_count_column: billingConfig?.userCountColumn || '',
            csv_plan_value: csvPlanValue, // Actual plan value from CSV for this organization
            
            // Form and timestamp information
            form_id: new Date().toISOString(),
            
            // Pricing information (optional - add if needed)
            unit_price: serviceSelection.unitPrice || 0,
            unit_cost: serviceSelection.unitCost || 0,
            adjusted_price: serviceSelection.adjustedPrice || 0,
            
            // Service descriptions (optional - add if needed)
            invoice_description: serviceSelection.invoiceDescription || '',
            internal_description: serviceSelection.internalDescription || ''
          }
          
          console.log(`Sending service ${index + 1} to NocoDB:`, nocoDbData)
          
          // Send to webhook
          const response = await fetch('https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/senddata', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(nocoDbData)
          })
          
          console.log(`Service ${index + 1} response status:`, response.status)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Error sending service ${index + 1}:`, errorText)
            throw new Error(`Failed to send service ${serviceSelection.serviceName} (${response.status}): ${errorText}`)
          }
          
          const result = await response.json()
          console.log(`Service ${index + 1} sent successfully:`, result)
          
          // Small delay between requests to avoid overwhelming the webhook
          if (index < finalConfig.serviceSelectionSummary.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log('All services sent successfully!')
        
        // Success - navigate to overview
        router.push("/billing/vendor-settings/overview")
        
      } else {
        throw new Error('No services selected to send')
      }
      
    } catch (error) {
      console.error('Error sending data to webhook:', error)
      setError(`Failed to send configuration: ${error.message}. Please try again.`)
    } finally {
      setSendingData(false)
    }
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
    let filtered = searchTerm.trim() === ""
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

    // Apply selected-only filter
    if (showSelectedOnly) {
      const selectedServiceIds = getSelectedServicesForContract(contractId)
      filtered = filtered.filter(service => 
        selectedServiceIds.includes(service.serviceID || service.id)
      )
    }

    setFilteredServices(filtered)
  }, [selectedContract, searchTerm, contractServices, allServices, selectedServices, showSelectedOnly])

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-contract-mapping")
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
                    Step 5: Select services for selected contracts
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

            {/* Stats Bar - Enhanced */}
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
                      {getTotalServicesCount()} Available Services
                    </span>
                  </div>
                  {getTotalSelectedServices() > 0 && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getTotalSelectedServices()} Services Selected
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      showSelectedOnly
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Check className="h-3 w-3 mr-1 inline" />
                    {showSelectedOnly ? "Show All" : "Selected Only"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selected Contracts List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Selected Contracts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to view and select services</p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableContracts.map((contract) => {
                    const selectedCount = getSelectedServicesForContract(String(contract.contractId)).length
                    const totalCount = getServicesCount(contract.contractId)
                    
                    return (
                      <button
                        key={contract.contractId}
                        onClick={() => handleSelectContract(contract)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedContract?.contractId === contract.contractId
                            ? "bg-purple-50 border-2 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
                            : selectedCount > 0
                            ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700"
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
                            <p className="text-xs mt-1">
                              <span className={selectedCount > 0 ? "text-green-600 dark:text-green-400" : "text-gray-500"}>
                                {selectedCount > 0 ? `${selectedCount} selected` : `${totalCount} services`}
                              </span>
                              {selectedCount > 0 && totalCount > selectedCount && (
                                <span className="text-gray-500"> of {totalCount}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {selectedCount > 0 ? (
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
              </div>
            </div>

            {/* Services Viewer - Enhanced with selection */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedContract ? `Services for ${selectedContract.contractName}` : "Services"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedContract
                        ? `Click to select services for ${selectedContract.organizationName}`
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
                    <div className="space-y-2">
                      {filteredServices.map((service, index) => {
                        const contractId = String(selectedContract.contractId)
                        const serviceId = service.serviceID || service.id
                        const isSelected = isServiceSelected(contractId, serviceId)
                        
                        return (
                          <button
                            key={serviceId || index}
                            onClick={() => handleSelectService(contractId, serviceId)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-purple-50 border-2 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
                                : "border-gray-200 hover:border-purple-300 hover:bg-purple-50 dark:border-gray-600 dark:hover:border-purple-500 dark:hover:bg-purple-900/20"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {service.serviceName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  Service ID: {serviceId}
                                </div>
                                {service.invoiceDescription && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                    Invoice: {service.invoiceDescription}
                                  </div>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>
                                    Price: ${Number.parseFloat(service.unitPrice || service.internalCurrencyUnitPrice || 0).toFixed(2)}
                                  </span>
                                  <span>
                                    Cost: ${Number.parseFloat(service.unitCost || 0).toFixed(2)}
                                  </span>
                                  {service.internalCurrencyAdjustedPrice && (
                                    <span>
                                      Adjusted: ${Number.parseFloat(service.internalCurrencyAdjustedPrice).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isSelected && (
                                  <CheckCircle className="h-5 w-5 text-purple-600 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Selection Results Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Selections</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Review and manage selected services
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
                  {getTotalSelectedServices() === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      No services selected yet
                    </p>
                  ) : (
                    Object.entries(selectedServices).map(([contractId, serviceIds]) => {
                      const contractData = Object.values(selectedContracts).find(c => String(c.contractId) === contractId)
                      const orgName = Object.keys(selectedContracts).find(org => selectedContracts[org].contractId === contractData?.contractId)
                      
                      return serviceIds.map(serviceId => {
                        const service = (contractServices[contractId] || []).find(s => (s.serviceID || s.id) === serviceId)
                        if (!service || !contractData) return null
                        
                        return (
                          <div
                            key={`${contractId}-${serviceId}`}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {getServiceNameById(serviceId)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {contractData.contractName} → {orgName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                ${Number.parseFloat(service.unitPrice || service.internalCurrencyUnitPrice || 0).toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => clearServiceSelection(contractId, serviceId)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            >
                              <X className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        )
                      })
                    }).filter(Boolean)
                  )}
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={generateFinalConfiguration}
                    disabled={getTotalSelectedServices() === 0}
                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                  >
                    Generate Final Configuration
                  </button>
                  
                  {isProcessingComplete && (
                    <button
                      onClick={handleNext}
                      disabled={sendingData}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                    >
                      {sendingData ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Sending Data...
                        </>
                      ) : (
                        "Complete Setup"
                      )}
                    </button>
                  )}
                </div>
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
                  Service selections: {getTotalSelectedServices()} services across {availableContracts.length} contracts
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

export default AutotaskContractServicesPage