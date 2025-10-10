"use client"

import { useState, useEffect } from "react"
import type {
  AutotaskService,
  ContractService,
  ContractSelection,
  OrgServiceCombination,
  FinalServiceConfiguration,
  BillingConfiguration,
  OrganizationMappings,
  CsvData,
  FinalConfiguration,
} from "@/types/vendor"

interface UseContractServicesProps {
  selectedContracts?: Record<string, ContractSelection>
}

export function useContractServices({ selectedContracts: propSelectedContracts }: UseContractServicesProps) {
  // Service data state
  const [allServices, setAllServices] = useState<AutotaskService[]>([])
  const [contractServices, setContractServices] = useState<Record<string, ContractService[]>>({})

  // Contract data state - loads from props or sessionStorage
  const [selectedContracts, setSelectedContracts] = useState<Record<string, ContractSelection>>({})

  // UI state
  const [selectedServicesByOrgPlan, setSelectedServicesByOrgPlan] = useState<Record<string, string | number>>({})
  const [selectedOrgService, setSelectedOrgService] = useState<OrgServiceCombination | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServices, setFilteredServices] = useState<ContractService[]>([])
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  // Processing state
  const [jsonOutput, setJsonOutput] = useState("")
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  const [sendingData, setSendingData] = useState(false)

  // Loading and error state
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingContractServices, setLoadingContractServices] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load selected contracts from props or sessionStorage
  useEffect(() => {
    const loadSelectedContracts = () => {
      // First try to use prop data
      if (propSelectedContracts && Object.keys(propSelectedContracts).length > 0) {
        console.log("Loading contracts from props:", propSelectedContracts)
        setSelectedContracts(propSelectedContracts)
        return
      }

      // Fallback to sessionStorage
      try {
        const stored = sessionStorage.getItem("finalContractConfiguration")
        if (stored) {
          const parsed: FinalConfiguration = JSON.parse(stored)
          console.log("Loading contracts from sessionStorage:", parsed.selectedContracts)
          setSelectedContracts(parsed.selectedContracts || {})
        } else {
          console.warn("No contract data found in sessionStorage")
          setError("No contract data found. Please go back and complete the contract mapping.")
        }
      } catch (err) {
        console.error("Error reading contract data from sessionStorage:", err)
        setError("Failed to load contract data. Please go back and complete the contract mapping.")
      }
    }

    loadSelectedContracts()
  }, [propSelectedContracts])

  // Load all services from API
  const loadAllServices = async (): Promise<void> => {
    try {
      setLoadingServices(true)
      setError(null)

      console.log("Loading all services...")

      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservicesname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        // Try GET method if POST fails
        const getResponse = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservicesname", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        if (!getResponse.ok) {
          throw new Error(`Both POST and GET failed. GET status: ${getResponse.status}`)
        }

        const services = await getResponse.json()
        console.log(`Loaded ${services.length} services via GET`)
        setAllServices(services)
        return
      }

      const services = await response.json()
      console.log(`Loaded ${services.length} services via POST`)
      setAllServices(services)
    } catch (err) {
      console.error("Error loading all services:", err)
      setError(`Failed to load services: ${(err as Error).message}`)
    } finally {
      setLoadingServices(false)
    }
  }

  // Load all services on mount
  useEffect(() => {
    loadAllServices()
  }, [])

  // Load services for a specific contract
  const loadServicesForContract = async (contractId: string): Promise<void> => {
    try {
      setLoadingContractServices(true)
      setError(null)

      console.log(`Loading services for contract: ${contractId}`)

      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractIds: [contractId],
        }),
      })

      console.log(`Response status for contract ${contractId}: ${response.status}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()

      if (!responseText || responseText.trim() === "") {
        console.log(`Empty response for contract ${contractId}, trying alternative formats...`)

        // Try alternative request formats
        const alternativeFormats = [
          { contractId: contractId },
          { contractIds: contractId },
          { body: { contractIds: [contractId] } },
        ]

        for (const altFormat of alternativeFormats) {
          const altResponse = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/getservices", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(altFormat),
          })

          const altResponseText = await altResponse.text()

          if (altResponseText && altResponseText.trim() !== "") {
            try {
              const contractServicesData = JSON.parse(altResponseText)
              const servicesArray = Array.isArray(contractServicesData) ? contractServicesData : []

              console.log(`Loaded ${servicesArray.length} services for contract ${contractId} with alternative format`)
              setContractServices((prev) => ({
                ...prev,
                [contractId]: servicesArray,
              }))
              return
            } catch (parseErr) {
              continue
            }
          }
        }

        // If all formats fail, set empty array
        console.log(`No services found for contract ${contractId}`)
        setContractServices((prev) => ({
          ...prev,
          [contractId]: [],
        }))
        return
      }

      let contractServicesData
      try {
        contractServicesData = JSON.parse(responseText)
      } catch (parseErr) {
        throw new Error(`Invalid JSON response: ${(parseErr as Error).message}`)
      }

      let servicesArray = Array.isArray(contractServicesData) ? contractServicesData : []
      servicesArray = servicesArray.filter((service) => service.contractID === Number.parseInt(contractId))

      console.log(`Loaded ${servicesArray.length} services for contract ${contractId}`)
      setContractServices((prev) => ({
        ...prev,
        [contractId]: servicesArray,
      }))
    } catch (err) {
      console.error(`Error loading services for contract ${contractId}:`, err)
      setError(`Failed to load services for contract ${contractId}: ${(err as Error).message}`)
    } finally {
      setLoadingContractServices(false)
    }
  }

  // Get organization/service combinations
  const getOrgServiceCombinations = (): OrgServiceCombination[] => {
    const combinations: OrgServiceCombination[] = []

    Object.entries(selectedContracts).forEach(([key, contractData]) => {
      if (key.includes("|")) {
        // Multi-service mode: "orgName|serviceName"
        const [orgName, serviceName] = key.split("|")
        combinations.push({
          orgName,
          serviceName,
          contractData,
          displayName: `${orgName} (${serviceName})`,
          key: key,
        })
      } else {
        // Single-service mode: just orgName
        combinations.push({
          orgName: key,
          serviceName: "default",
          contractData,
          displayName: key,
          key: key,
        })
      }
    })

    console.log(`Generated ${combinations.length} org/service combinations:`, combinations)
    return combinations
  }

  // Initialize and auto-load first combination when selectedContracts changes
  useEffect(() => {
    if (Object.keys(selectedContracts).length > 0 && allServices.length > 0) {
      const orgServiceCombinations = getOrgServiceCombinations()
      const firstCombination = orgServiceCombinations[0]

      if (firstCombination && !selectedOrgService) {
        console.log("Auto-selecting first combination:", firstCombination)
        setSelectedOrgService(firstCombination)

        // Load services for this contract
        const contractId = String(firstCombination.contractData.contractId)
        if (!contractServices[contractId]) {
          loadServicesForContract(contractId)
        }
      }
    }
  }, [selectedContracts, allServices, selectedOrgService])

  // Get service name by ID
  const getServiceNameById = (serviceId: string | number): string => {
    const service = allServices.find((s) => s.id === serviceId)
    return service ? service.name : `Service ${serviceId}`
  }

  // Handle service selection
  const handleSelectService = (serviceId: string | number, orgName: string, planName = "default"): void => {
    const key = `${orgName}|${planName}`

    setSelectedServicesByOrgPlan((prev) => {
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
          [key]: serviceId,
        }
      }
    })
  }

  // Clear service selection
  const clearServiceSelection = (orgName: string, planName = "default"): void => {
    const key = `${orgName}|${planName}`
    setSelectedServicesByOrgPlan((prev) => {
      const newSelection = { ...prev }
      delete newSelection[key]
      return newSelection
    })
  }

  // Get total selected services count
  const getTotalSelectedServices = (): number => {
    return Object.keys(selectedServicesByOrgPlan).length
  }

  // Generate final configuration
  const generateFinalConfiguration = (): void => {
    const orgServiceCombinations = getOrgServiceCombinations()
    const unselectedCombinations = orgServiceCombinations.filter((combo) => {
      const selectionKey = `${combo.orgName}|${combo.serviceName}`
      return !selectedServicesByOrgPlan[selectionKey]
    })

    if (unselectedCombinations.length > 0) {
      const unselectedNames = unselectedCombinations.map((combo) => combo.displayName)
      setError(`Please select a service for: ${unselectedNames.join(", ")}`)
      return
    }

    const finalConfig: FinalServiceConfiguration = {
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
      const [orgName, planName] = key.split("|")

      // Find contract data using multiple possible key formats
      const possibleContractKeys = [
        key, // Full key "orgName|planName"
        orgName, // Just org name
        planName !== "default" ? `${orgName}|${planName}` : orgName, // Conditional key
      ]

      let contractData = null

      for (const testKey of possibleContractKeys) {
        if (selectedContracts[testKey]) {
          contractData = selectedContracts[testKey]
          break
        }
      }

      if (!contractData) {
        console.warn(`Contract data not found for selection key: ${key}`)
        return
      }

      const contractId = String(contractData.contractId)
      const allContractServices = contractServices[contractId] || []

      // Find service by both serviceID and id fields
      const service = allContractServices.find((s) => {
        const sId = s.serviceID || s.id
        return sId === serviceId
      })

      if (service) {
        const serviceIdToUse = service.serviceID || service.id
        const serviceName = getServiceNameById(serviceIdToUse)

        finalConfig.serviceSelectionSummary.push({
          contractId: contractId,
          contractName: contractData.contractName,
          organizationName: orgName,
          planName: planName !== "default" ? planName : null,
          serviceId: serviceIdToUse,
          serviceName: serviceName,
          unitPrice: Number(service.unitPrice || service.internalCurrencyUnitPrice || 0),
          unitCost: Number(service.unitCost || 0),
          adjustedPrice: Number(service.internalCurrencyAdjustedPrice || 0),
          invoiceDescription: service.invoiceDescription,
          internalDescription: service.internalDescription,
        })
      }
    })

    if (finalConfig.serviceSelectionSummary.length === 0) {
      setError("No valid services were found for the selected items. Please check your selections and try again.")
      return
    }

    const output = JSON.stringify(finalConfig, null, 2)
    setJsonOutput(output)
    setIsProcessingComplete(true)

    sessionStorage.setItem("finalServicesConfiguration", output)
    console.log("Service configuration complete:", finalConfig.serviceSelectionSummary)
    setError(null)
  }

  // Send data to NocoDB webhook
  const sendToNocoDB = async (): Promise<void> => {
    console.log("[v0] sendToNocoDB function called")
    console.log("[v0] isProcessingComplete:", isProcessingComplete)
    console.log("[v0] jsonOutput exists:", !!jsonOutput)

    if (!isProcessingComplete || !jsonOutput) {
      const errorMsg = "Please generate the configuration first"
      console.error("[v0] ERROR SEND TO NOCODB:", errorMsg)
      throw new Error(errorMsg)
    }

    try {
      setSendingData(true)
      setError(null)

      console.log("[v0] === STARTING SEND TO NOCODB ===")

      // Load additional data from sessionStorage
      const storedBillingConfig = sessionStorage.getItem("billingConfiguration")
      const storedOrgMappings = sessionStorage.getItem("organizationMappings")
      const storedCsvData = sessionStorage.getItem("vendorCsvData")

      const billingConfig: BillingConfiguration | null = storedBillingConfig ? JSON.parse(storedBillingConfig) : null
      const orgMappings: OrganizationMappings | null = storedOrgMappings ? JSON.parse(storedOrgMappings) : null
      const csvData: CsvData | null = storedCsvData ? JSON.parse(storedCsvData) : null

      const finalConfig: FinalServiceConfiguration = JSON.parse(jsonOutput)

      console.log("[v0] Service selections count:", finalConfig.serviceSelectionSummary?.length || 0)

      // Validate serviceSelectionSummary
      if (
        !finalConfig.serviceSelectionSummary ||
        !Array.isArray(finalConfig.serviceSelectionSummary) ||
        finalConfig.serviceSelectionSummary.length === 0
      ) {
        throw new Error("No services selected to send. Please select services and generate the configuration again.")
      }

      // Process each service selection
      for (const [index, serviceSelection] of finalConfig.serviceSelectionSummary.entries()) {
        try {
          console.log(
            `[v0] Processing service ${index + 1}/${finalConfig.serviceSelectionSummary.length}:`,
            serviceSelection.serviceName,
          )

          // Find the contract data for this service selection
          const contractKey = serviceSelection.planName
            ? `${serviceSelection.organizationName}|${serviceSelection.planName}`
            : `${serviceSelection.organizationName}|default`

          const contractData = selectedContracts[contractKey]

          if (!contractData) {
            console.warn(`Contract data not found for service ${serviceSelection.serviceName}`)
            continue
          }

          // Find the actual service data
          const contractServicesData = contractServices[String(serviceSelection.contractId)] || []
          const serviceData = contractServicesData.find((s) => (s.serviceID || s.id) === serviceSelection.serviceId)

          if (!serviceData) {
            console.warn(`Service data not found for service ID ${serviceSelection.serviceId}`)
            continue
          }

          // Extract CSV data for this organization/plan
          let csvCompanyName = ""
          let csvPlanValue = ""

          if (orgMappings && csvData) {
            const csvOrgEntry = Object.entries(orgMappings).find(([csvOrg, autotaskCompany]) => {
              const cleanAutotaskCompany = autotaskCompany?.replace(/\s*$$ID:\s*\d+$$\s*$/, "").trim()
              const contractAutotaskCompany = contractData.autotaskCompany?.replace(/\s*$$ID:\s*\d+$$\s*$/, "").trim()
              return cleanAutotaskCompany === contractAutotaskCompany
            })

            if (csvOrgEntry) {
              csvCompanyName = csvOrgEntry[0]

              const lines = csvData.fullData.split("\n")
              const headers = lines[0].split(",").map((h) => h.trim())
              const rows = lines.slice(1).filter((line) => line.trim())

              const orgColumnIndex = headers.indexOf(billingConfig?.organizationColumn || "")
              const planColumnIndex = headers.indexOf(billingConfig?.planNameColumn || "")

              if (orgColumnIndex >= 0) {
                const matchingRow = rows.find((row) => {
                  const cells = row.split(",").map((cell) => cell.trim())
                  const rowOrg = cells[orgColumnIndex]
                  const rowPlan = planColumnIndex >= 0 ? cells[planColumnIndex] : null

                  if (serviceSelection.planName && rowPlan) {
                    return rowOrg === csvCompanyName && rowPlan === serviceSelection.planName
                  } else {
                    return rowOrg === csvCompanyName
                  }
                })

                if (matchingRow) {
                  const cells = matchingRow.split(",").map((cell) => cell.trim())
                  if (planColumnIndex >= 0 && cells[planColumnIndex]) {
                    csvPlanValue = cells[planColumnIndex]
                  }
                }
              }
            } else {
              csvCompanyName = serviceSelection.organizationName || ""
            }
          }

          // Ensure customer_id is never empty
          let customerId = contractData.autotaskCompanyId
          if (!customerId || customerId === "" || customerId === null || customerId === undefined) {
            customerId = "0"
          }

          // Extract domain from organization name or use a default
          const mspDomain = "offshoreitlabs.com" // TODO: Get this from your MSP data or config

          const nocoDbData = {
            msp_lookup_domain: mspDomain,
            service_lookup_name: "Autotask",
            integration_type: "Autotask",

            autotask_contract_service_name: serviceSelection.serviceName || "",

            mapid: `${serviceSelection.contractId}-${serviceSelection.serviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            service_name: billingConfig?.serviceName || "",
            service_id: serviceSelection.serviceId || "",
            contract_service_id: serviceData.id || serviceData.serviceID || "",
            contract_name: contractData.contractName || "",
            contract_id: contractData.contractId || "",
            organization_name:
              contractData.autotaskCompany?.replace(/\s*$$ID:\s*\d+$$\s*$/, "").trim() ||
              contractData.autotaskCompany ||
              "",
            customer_id: customerId,
            csv_company_name: csvCompanyName,
            plan_name: billingConfig?.planNameColumn || "",
            csv_filename: "uploaded_csv",
            plan_column: billingConfig?.planNameColumn || "",
            org_column: billingConfig?.organizationColumn || "",
            user_count_column: billingConfig?.userCountColumn || "",
            csv_plan_value: csvPlanValue,
            form_id: new Date().toISOString(),
            unit_price: Number(serviceSelection.unitPrice || 0),
            unit_cost: Number(serviceSelection.unitCost || 0),
            adjusted_price: Number(serviceSelection.adjustedPrice || 0),
            invoice_description: serviceSelection.invoiceDescription || "",
            internal_description: serviceSelection.internalDescription || "",
          }

          console.log(`[v0] === SENDING SERVICE ${index + 1} TO NOCODB ===`)
          console.log(
            "[v0] Webhook URL:",
            "https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/sendmappingdatalatest",
          )
          console.log("[v0] Payload:", JSON.stringify(nocoDbData, null, 2))

          // Send to webhook
          const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/sendmappingdatalatest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(nocoDbData),
          })

          console.log(`[v0] Response status:`, response.status)
          console.log(`[v0] Response ok:`, response.ok)

          const responseText = await response.text()
          console.log(`[v0] Response body:`, responseText)

          if (!response.ok) {
            throw new Error(
              `Failed to send service ${serviceSelection.serviceName} (${response.status}): ${responseText}`,
            )
          }

          console.log(`[v0] ✓ Service ${index + 1} sent successfully`)

          // Rate limiting
          if (index < finalConfig.serviceSelectionSummary.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (serviceError) {
          console.error(`[v0] Error processing service ${index + 1}:`, serviceError)
          throw serviceError
        }
      }

      console.log("[v0] ✓ All services sent successfully to NocoDB!")
    } catch (error) {
      console.error("[v0] Error sending data to NocoDB webhook:", error)
      console.error("[v0] Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw new Error(`Failed to send configuration to NocoDB: ${(error as Error).message}`)
    } finally {
      setSendingData(false)
      console.log("[v0] sendToNocoDB function completed")
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
      const serviceId = contractService.serviceID || contractService.id
      const serviceName = getServiceNameById(serviceId)

      return {
        ...contractService,
        serviceName: serviceName,
      }
    })

    let filtered =
      searchTerm.trim() === ""
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
              String(service.serviceID || service.id || "").includes(searchLower)
            )
          })

    if (showSelectedOnly) {
      const selectedServiceId =
        selectedServicesByOrgPlan[`${selectedOrgService.orgName}|${selectedOrgService.serviceName}`]
      filtered = selectedServiceId
        ? filtered.filter((service) => (service.serviceID || service.id) === selectedServiceId)
        : []
    }

    setFilteredServices(filtered)
  }, [selectedOrgService, searchTerm, contractServices, allServices, selectedServicesByOrgPlan, showSelectedOnly])

  return {
    // Data state
    allServices,
    contractServices,
    selectedContracts,
    selectedServicesByOrgPlan,
    selectedOrgService,
    searchTerm,
    filteredServices,
    showSelectedOnly,
    jsonOutput,
    isProcessingComplete,
    sendingData,

    // Loading and error state
    loadingServices,
    loadingContractServices,
    error,

    // Setters
    setSelectedOrgService,
    setSearchTerm,
    setShowSelectedOnly,
    setError,
    setSendingData,

    // Computed values
    getOrgServiceCombinations,
    getServiceNameById,
    getTotalSelectedServices,

    // Actions
    loadAllServices,
    loadServicesForContract,
    handleSelectService,
    clearServiceSelection,
    generateFinalConfiguration,
    sendToNocoDB,
  }
}
