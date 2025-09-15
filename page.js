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
  const [sendingData, setSendingData] = useState(false)

  // UI State
  const [selectedOrgService, setSelectedOrgService] = useState(null) // { orgName, serviceName, contractId }
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServices, setFilteredServices] = useState([])
  
  // MODIFIED: Single service selection per organization/plan
  const [selectedServicesByOrgPlan, setSelectedServicesByOrgPlan] = useState({}) // { "orgName|planName": serviceId }
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  // Load all services (run once on mount)
  const loadAllServices = async () => {
    try {
      setLoadingServices(true)
      setError(null)
      console.log("=== LOADING ALL SERVICES ===")

      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservicesname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      console.log("All services response status:", response.status)

      if (!response.ok) {
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

  // Load services for a specific contract
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
          contractIds: [contractId],
        }),
      })

      console.log(`Contract services response status for contract ${contractId}:`, response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      console.log(`Contract services raw response for ${contractId}:`, responseText)

      if (!responseText || responseText.trim() === '') {
        console.warn(`Empty response for contract ${contractId}, trying different request formats...`)
        
        const alternativeFormats = [
          { contractId: contractId },
          { contractIds: contractId },
          { body: { contractIds: [contractId] } },
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
        throw new Error(`Invalid JSON response: ${parseErr.message}`)
      }

      let servicesArray = Array.isArray(contractServicesData) ? contractServicesData : []
      servicesArray = servicesArray.filter(service => 
        service.contractID === parseInt(contractId)
      )
      
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

  // Helper function to get service name by serviceID
  const getServiceNameById = (serviceId) => {
    const service = allServices.find(s => s.id === serviceId)
    return service ? service.name : `Service ${serviceId}`
  }

  // MODIFIED: Single service selection per organization/plan
  const handleSelectService = (serviceId, orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    
    setSelectedServicesByOrgPlan(prev => {
      const currentSelection = prev[key]
      
      if (currentSelection === serviceId) {
        // Deselect if clicking the same service
        const newSelection = { ...prev }
        delete newSelection[key]
        return newSelection
      } else {
        // Select new service (replacing any previous selection)
        return {
          ...prev,
          [key]: serviceId
        }
      }
    })
  }

  const isServiceSelected = (serviceId, orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    return selectedServicesByOrgPlan[key] === serviceId
  }

  const clearServiceSelection = (orgName, planName = 'default') => {
    const key = `${orgName}|${planName}`
    setSelectedServicesByOrgPlan(prev => {
      const newSelection = { ...prev }
      delete newSelection[key]
      return newSelection
    })
  }

  const getTotalSelectedServices = () => {
    return Object.keys(selectedServicesByOrgPlan).length
  }

  // Get organization/service combinations for display
  const getOrgServiceCombinations = () => {
    const combinations = []
    
    Object.entries(selectedContracts).forEach(([key, contractData]) => {
      // Handle both single and multi-service modes
      if (key.includes('|')) {
        // Multi-service mode: "orgName|serviceName"
        const [orgName, serviceName] = key.split('|')
        combinations.push({
          orgName,
          serviceName,
          contractData,
          displayName: `${orgName} (${serviceName})`,
          key: key
        })
      } else {
        // Single-service mode: just orgName
        combinations.push({
          orgName: key,
          serviceName: 'default',
          contractData,
          displayName: key,
          key: key
        })
      }
    })
    
    return combinations
  }

  // Generate final configuration with single service selections
  const generateFinalConfiguration = () => {
    const orgServiceCombinations = getOrgServiceCombinations()
    const unselectedCombinations = orgServiceCombinations.filter(combo => {
      const selectionKey = `${combo.orgName}|${combo.serviceName}`
      return !selectedServicesByOrgPlan[selectionKey]
    })
    
    if (unselectedCombinations.length > 0) {
      const unselectedNames = unselectedCombinations.map(combo => combo.displayName)
      setError(`Please select a service for: ${unselectedNames.join(', ')}`)
      return
    }

    const finalConfig = {
      selectedContracts,
      contractServices,
      selectedServicesByOrgPlan,
      allServices,
      serviceSelectionSummary: [],
      summary: {
        totalContracts: Object.keys(selectedContracts).length,
        totalAvailableServices: Object.values(contractServices).flat().length,
        totalSelectedServices: getTotalSelectedServices(),
      },
      timestamp: new Date().toISOString(),
    }

    // Build detailed service selection summary
    Object.entries(selectedServicesByOrgPlan).forEach(([key, serviceId]) => {
      const [orgName, planName] = key.split('|')
      
      // Find the corresponding contract data
      const contractKey = planName !== 'default' ? `${orgName}|${planName}` : orgName
      const contractData = selectedContracts[contractKey]
      
      if (!contractData) {
        console.warn(`Contract data not found for key: ${contractKey}`)
        return
      }

      const contractId = String(contractData.contractId)
      const allContractServices = contractServices[contractId] || []
      const service = allContractServices.find(s => (s.serviceID || s.id) === serviceId)
      
      if (service) {
        finalConfig.serviceSelectionSummary.push({
          contractId: contractId,
          contractName: contractData.contractName,
          organizationName: orgName,
          planName: planName !== 'default' ? planName : null,
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

  // Handle data sending with single service per org/plan
  const handleNext = async () => {
    if (!isProcessingComplete) {
      setError("Please generate the configuration first")
      return
    }
    
    try {
      setSendingData(true)
      setError(null)
      
      const storedBillingConfig = sessionStorage.getItem("billingConfiguration")
      const storedOrgMappings = sessionStorage.getItem("organizationMappings")
      const storedCsvData = sessionStorage.getItem("vendorCsvData")
      const billingConfig = storedBillingConfig ? JSON.parse(storedBillingConfig) : null
      const orgMappings = storedOrgMappings ? JSON.parse(storedOrgMappings) : null
      const csvData = storedCsvData ? JSON.parse(storedCsvData) : null
      
      const finalConfig = JSON.parse(jsonOutput)
      
      console.log('Starting to send individual service records to NocoDB...')
      console.log('Total services to process:', finalConfig.serviceSelectionSummary?.length || 0)
      
      if (finalConfig.serviceSelectionSummary && finalConfig.serviceSelectionSummary.length > 0) {
        
        for (const [index, serviceSelection] of finalConfig.serviceSelectionSummary.entries()) {
          console.log(`Processing service ${index + 1}/${finalConfig.serviceSelectionSummary.length}:`, serviceSelection.serviceName)
          
          const contractData = selectedContracts[serviceSelection.planName ? 
            `${serviceSelection.organizationName}|${serviceSelection.planName}` : 
            serviceSelection.organizationName
          ]
          
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
          
          let csvCompanyName = ''
          let csvPlanValue = ''
          
          if (orgMappings && csvData) {
            const csvOrgEntry = Object.entries(orgMappings).find(([csvOrg, autotaskCompany]) => {
              const cleanAutotaskCompany = autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
              const contractAutotaskCompany = contractData.autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
              return cleanAutotaskCompany === contractAutotaskCompany
            })
            
            if (csvOrgEntry) {
              csvCompanyName = csvOrgEntry[0]
              
              const lines = csvData.fullData.split('\n')
              const headers = lines[0].split(',').map(h => h.trim())
              const rows = lines.slice(1).filter(line => line.trim())
              
              const orgColumnIndex = headers.indexOf(billingConfig?.organizationColumn)
              const planColumnIndex = headers.indexOf(billingConfig?.planNameColumn)
              
              if (orgColumnIndex >= 0) {
                // For multi-service mode, find the row that matches both org and plan
                const matchingRow = rows.find(row => {
                  const cells = row.split(',').map(cell => cell.trim())
                  const rowOrg = cells[orgColumnIndex]
                  const rowPlan = planColumnIndex >= 0 ? cells[planColumnIndex] : null
                  
                  if (serviceSelection.planName && rowPlan) {
                    return rowOrg === csvCompanyName && rowPlan === serviceSelection.planName
                  } else {
                    return rowOrg === csvCompanyName
                  }
                })
                
                if (matchingRow) {
                  const cells = matchingRow.split(',').map(cell => cell.trim())
                  if (planColumnIndex >= 0 && cells[planColumnIndex]) {
                    csvPlanValue = cells[planColumnIndex]
                  }
                }
              }
            } else {
              csvCompanyName = serviceSelection.organizationName || ''
            }
          }
          
          const nocoDbData = {
            mapid: `${serviceSelection.contractId}-${serviceSelection.serviceId}-${Date.now()}`,
            service_name: billingConfig?.serviceName || '',
            autotask_service_name: serviceSelection.serviceName || '',
            service_id: serviceSelection.serviceId || '',
            contract_name: contractData.contractName || '',
            contract_id: contractData.contractId || '',
            contract_service_id: serviceData.id || serviceData.serviceID || '',
            organization_name: contractData.autotaskCompany?.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim() || contractData.autotaskCompany || '',
            customer_id: contractData.autotaskCompanyId || '',
            csv_company_name: csvCompanyName,
            plan_name: billingConfig?.planNameColumn || '',
            csv_filename: csvData?.filename || "uploaded_csv",
            plan_column: billingConfig?.planNameColumn || '',
            org_column: billingConfig?.organizationColumn || '',
            user_count_column: billingConfig?.userCountColumn || '',
            csv_plan_value: csvPlanValue,
            form_id: new Date().toISOString(),
            unit_price: serviceSelection.unitPrice || 0,
            unit_cost: serviceSelection.unitCost || 0,
            adjusted_price: serviceSelection.adjustedPrice || 0,
            invoice_description: serviceSelection.invoiceDescription || '',
            internal_description: serviceSelection.internalDescription || ''
          }
          
          console.log(`Sending service ${index + 1} to NocoDB:`, nocoDbData)
          
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
          
          let result = null
          try {
            const responseText = await response.text()
            console.log(`Service ${index + 1} raw response text:`, responseText)
            
            if (responseText && responseText.trim() !== '') {
              try {
                result = JSON.parse(responseText)
                console.log(`Service ${index + 1} sent successfully:`, result)
              } catch (parseError) {
                console.log(`Service ${index + 1} response not valid JSON, but request succeeded`)
                result = { success: true }
              }
            } else {
              console.log(`Service ${index + 1} sent successfully (empty response)`)
              result = { success: true }
            }
          } catch (textError) {
            console.log(`Service ${index + 1} could not read response, but status was 200`)
            result = { success: true }
          }
          
          if (index < finalConfig.serviceSelectionSummary.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log('All services sent successfully!')
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

  // On mount: load selectedContracts from session and load all services
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

    const contracts = contractConfig.selectedContracts || {}
    setSelectedContracts(contracts)

    loadAllServices().then(() => {
      // Auto-select first contract after services are loaded
      const firstContract = Object.values(contracts)[0]
      if (firstContract) {
        const firstCombination = getOrgServiceCombinations()[0]
        if (firstCombination) {
          setSelectedOrgService(firstCombination)
          loadServicesForContract(firstContract.contractId)
        }
      }
      setLoading(false)
    })
  }, [router])

  const handleSelectOrgService = async (combination) => {
    setSelectedOrgService(combination)
    setSearchTerm("")

    if (!contractServices[String(combination.contractData.contractId)]) {
      await loadServicesForContract(combination.contractData.contractId)
    }
  }

  // Filter services when org/service or search term changes
  useEffect(() => {
    if (!selectedOrgService) {
      setFilteredServices([])
      return
    }

    const contractId = String(selectedOrgService.contractData.contractId)
    const services = contractServices[contractId] || []

    const servicesWithNames = services.map((contractService) => {
      const serviceId = contractService.serviceID
      const serviceName = getServiceNameById(serviceId)
      
      return {
        ...contractService,
        serviceName: serviceName,
      }
    })

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

    if (showSelectedOnly) {
      const selectedServiceId = selectedServicesByOrgPlan[`${selectedOrgService.orgName}|${selectedOrgService.serviceName}`]
      filtered = selectedServiceId ? filtered.filter(service => 
        (service.serviceID || service.id) === selectedServiceId
      ) : []
    }

    setFilteredServices(filtered)
  }, [selectedOrgService, searchTerm, contractServices, allServices, selectedServicesByOrgPlan, showSelectedOnly])

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-contract-mapping")
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

  if (error && !Object.keys(contractServices).length) {
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

  const orgServiceCombinations = getOrgServiceCombinations()

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
                    Step 5: Select one service per organization/plan
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
                      {orgServiceCombinations.length} Organization{orgServiceCombinations.length !== 1 ? 's' : ''}/Plan{orgServiceCombinations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {Object.values(contractServices).flat().length} Available Services
                    </span>
                  </div>
                  {getTotalSelectedServices() > 0 && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getTotalSelectedServices()} Service{getTotalSelectedServices() !== 1 ? 's' : ''} Selected
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
            {/* Organization/Plan Combinations List with Multi-Plan Support */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organizations & Services</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {orgServiceCombinations.some(combo => combo.serviceName !== 'default') ? 
                    'Select services for each plan' : 'Select one service per organization'}
                </p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {/* Group combinations by organization for multi-plan display */}
                  {(() => {
                    const orgGroups = {}
                    orgServiceCombinations.forEach(combo => {
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
                            const selectionKey = `${combination.orgName}|${combination.serviceName}`
                            const hasSelection = selectedServicesByOrgPlan[selectionKey]
                            
                            return (
                              <button
                                key={combination.key}
                                onClick={() => handleSelectOrgService(combination)}
                                className={`w-full text-left p-3 ml-4 rounded-lg transition-all ${
                                  selectedOrgService?.key === combination.key
                                    ? "bg-purple-50 border-2 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700"
                                    : hasSelection
                                    ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700"
                                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    {hasMultiplePlans ? (
                                      <>
                                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400 truncate">
                                          {combination.serviceName}
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
                                      {combination.contractData.contractName || "Unnamed Contract"}
                                    </p>
                                    <p className="text-xs mt-1">
                                      <span className={hasSelection ? "text-green-600 dark:text-green-400" : "text-gray-500"}>
                                        {hasSelection ? "✓ Service selected" : "Select service"}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {hasSelection ? (
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
                  })()}
                </div>
              </div>
            </div>

            {/* Enhanced Services Viewer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedOrgService ? 
                        (selectedOrgService.serviceName !== 'default' ? 
                          `Services for ${selectedOrgService.orgName} - ${selectedOrgService.serviceName}` :
                          `Services for ${selectedOrgService.orgName}`
                        ) : "Services"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedOrgService
                        ? `Select ONE service for this ${selectedOrgService.serviceName !== 'default' ? 'plan' : 'organization'}`
                        : "Select an organization/plan to view available services"}
                    </p>
                  </div>
                  {loadingContractServices && <Loader className="h-5 w-5 animate-spin text-purple-600" />}
                </div>

                {/* Search */}
                {selectedOrgService && (
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
                  {!selectedOrgService ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Select an organization/plan to view its services</p>
                    </div>
                  ) : loadingContractServices ? (
                    <div className="text-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading services...</p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>{searchTerm ? "No services match your search" : "No services found"}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Show plan context if applicable */}
                      {selectedOrgService.serviceName !== 'default' && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 mb-4">
                          <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                              Selecting service for: {selectedOrgService.orgName} → {selectedOrgService.serviceName}
                            </span>
                          </div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            This service will be mapped to the "{selectedOrgService.serviceName}" plan type from your CSV
                          </p>
                        </div>
                      )}
                      
                      {filteredServices.map((service, index) => {
                        const serviceId = service.serviceID || service.id
                        const isSelected = isServiceSelected(serviceId, selectedOrgService.orgName, selectedOrgService.serviceName)
                        
                        return (
                          <button
                            key={serviceId || index}
                            onClick={() => handleSelectService(serviceId, selectedOrgService.orgName, selectedOrgService.serviceName)}
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

            {/* Single Service Selection Results Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Selections</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      One service per organization/plan
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
                    Object.entries(selectedServicesByOrgPlan).map(([key, serviceId]) => {
                      const [orgName, planName] = key.split('|')
                      const contractKey = planName !== 'default' ? `${orgName}|${planName}` : orgName
                      const contractData = selectedContracts[contractKey]
                      
                      if (!contractData) return null
                      
                      const contractServicesData = contractServices[String(contractData.contractId)] || []
                      const service = contractServicesData.find(s => (s.serviceID || s.id) === serviceId)
                      
                      if (!service) return null
                      
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {planName !== 'default' ? `${orgName} (${planName})` : orgName}
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                              Service: {getServiceNameById(serviceId)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              Contract: {contractData.contractName || "Unnamed Contract"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              ${Number.parseFloat(service.unitPrice || service.internalCurrencyUnitPrice || 0).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => clearServiceSelection(orgName, planName)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      )
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
                  Service selections: {getTotalSelectedServices()} service{getTotalSelectedServices() !== 1 ? 's' : ''} for {orgServiceCombinations.length} organization{orgServiceCombinations.length !== 1 ? 's' : ''}/plan{orgServiceCombinations.length !== 1 ? 's' : ''}
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