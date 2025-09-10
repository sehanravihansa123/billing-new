"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { ArrowLeft, CheckCircle, ChevronRight, FileText, Loader, Search, Check, Settings } from "lucide-react"

function AutotaskContractServicesPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState([])
  const [services, setServices] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [organizationMappings, setOrganizationMappings] = useState({})
  const [autotaskCompanies, setAutotaskCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI State
  const [selectedContract, setSelectedContract] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredServices, setFilteredServices] = useState([])
  const [availableContracts, setAvailableContracts] = useState([])

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedOrgMappings = sessionStorage.getItem("organizationMappings")
    const storedCsvData = sessionStorage.getItem("vendorCsvData")
    const storedBillingConfig = sessionStorage.getItem("billingConfiguration")

    if (!storedOrgMappings || !storedCsvData || !storedBillingConfig) {
      router.push("/billing/vendor-settings/onboarding")
      return
    }

    const orgMappingsParsed = JSON.parse(storedOrgMappings)
    const csvDataParsed = JSON.parse(storedCsvData)
    const billingConfigParsed = JSON.parse(storedBillingConfig)

    setOrganizationMappings(orgMappingsParsed)

    // Extract organizations from CSV
    extractOrganizations(csvDataParsed, billingConfigParsed)

    // Fetch data
    fetchContracts()
    fetchServices()
    fetchAutotaskCompanies()
  }, [router])

  useEffect(() => {
    // Filter services based on selected contract
    if (!selectedContract) {
      setFilteredServices([])
      return
    }

    console.log("=== SERVICE FILTERING DEBUG ===")
    console.log("Selected contract ID:", selectedContract.id)
    console.log("Selected contract object:", selectedContract)
    console.log("Total services available:", services.length)

    // Log first few services to see their structure
    console.log("First 3 services structure:", services.slice(0, 3))

    const contractServices = services.filter((service) => {
      const serviceContractId = String(service.contractID)
      const selectedContractId = String(selectedContract.id)

      console.log("Checking service:", {
        id: service.id,
        contractID: service.contractID,
        serviceID: service.serviceID,
        invoiceDescription: service.invoiceDescription,
        // Log all properties of the service to see what fields are available
        allServiceProperties: Object.keys(service)
      })

      console.log("Service contractID (as string):", serviceContractId)
      console.log("Selected contract ID (as string):", selectedContractId)

      const match = serviceContractId === selectedContractId
      console.log("Contract ID match:", match)
      console.log("---")

      return match
    })

    console.log("Found services for contract:", contractServices.length)

    // Apply search filter
    const filtered =
      searchTerm.trim() === ""
        ? contractServices
        : contractServices.filter(
            (service) =>
              (service.invoiceDescription &&
                service.invoiceDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (service.internalDescription &&
                service.internalDescription.toLowerCase().includes(searchTerm.toLowerCase())),
          )

    console.log("Final filtered services after search:", filtered.length)
    console.log("=== END DEBUG ===")

    setFilteredServices(filtered)
  }, [selectedContract, searchTerm, services])

  useEffect(() => {
    // Get contracts that have mapped organizations
    if (contracts.length > 0 && autotaskCompanies.length > 0 && Object.keys(organizationMappings).length > 0) {
      const mappedContracts = contracts.filter((contract) => {
        // Find if this contract belongs to a company that has an organization mapping
        const contractCompany = autotaskCompanies.find((company) => String(company.id) === String(contract.companyID))
        if (!contractCompany) return false

        // Check if any organization is mapped to this company
        return Object.values(organizationMappings).some((mapping) => {
          const companyName = mapping.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
          return companyName === contractCompany.companyName || mapping === contractCompany.companyName
        })
      })

      setAvailableContracts(mappedContracts)
    }
  }, [contracts, autotaskCompanies, organizationMappings])

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
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskcontractlist")
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      const contractsArray = Array.isArray(data) ? data : data.contracts || []
      setContracts(contractsArray)
    } catch (err) {
      console.error("Error fetching contracts:", err)
      setError(`Failed to fetch contracts: ${err.message}`)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskcontractservices")
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      const servicesArray = Array.isArray(data) ? data : data.services || []
      
      // Enhanced debugging for services
      console.log("=== SERVICES FETCH DEBUG ===")
      console.log("Raw services response:", data)
      console.log("Services array length:", servicesArray.length)
      if (servicesArray.length > 0) {
        console.log("Sample service object:", servicesArray[0])
        console.log("All properties in first service:", Object.keys(servicesArray[0]))
      }
      console.log("=== END SERVICES FETCH DEBUG ===")
      
      setServices(servicesArray)
    } catch (err) {
      console.error("Error fetching services:", err)
      setError(`Failed to fetch services: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAutotaskCompanies = async () => {
    try {
      const response = await fetch("https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskorganisationlist")
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      const companies = Array.isArray(data) ? data : data.companies || []
      setAutotaskCompanies(companies)
    } catch (err) {
      console.error("Error fetching Autotask companies:", err)
    }
  }

  const getContractOrganization = (contract) => {
    const contractCompany = autotaskCompanies.find((company) => String(company.id) === String(contract.companyID))
    if (!contractCompany) return "Unknown Organization"

    // Find the organization mapped to this company
    for (const [org, mapping] of Object.entries(organizationMappings)) {
      const companyName = mapping.replace(/\s*\(ID:\s*\d+\)\s*$/, "").trim()
      if (companyName === contractCompany.companyName || mapping === contractCompany.companyName) {
        return org
      }
    }
    return contractCompany.companyName
  }

  const handleBack = () => {
    router.push("/billing/vendor-settings/onboarding/autotask-contract-mapping")
  }

  const handleNext = () => {
    alert("Contract services review completed!")
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading contract services...</p>
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
                  onClick={() => {
                    fetchContracts()
                    fetchServices()
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
                    Step 5: Review services for each contract
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
                      {availableContracts.length} Available Contracts
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {services.length} Total Services
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedContract ? filteredServices.length : 0} Services for Selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contracts List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contracts</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Click to view services</p>
              </div>

              <div className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableContracts.map((contract) => (
                    <button
                      key={contract.id}
                      onClick={() => setSelectedContract(contract)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedContract?.id === contract.id
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
                            {getContractOrganization(contract)}
                          </p>
                          {contract.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                              {contract.description}
                            </p>
                          )}
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
                        ? `Organization: ${getContractOrganization(selectedContract)}`
                        : "Select a contract to view its services"}
                    </p>
                  </div>
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
                              Service Description
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
                                  <div className="font-medium">
                                    {service.invoiceDescription || service.internalDescription || "No description"}
                                  </div>
                                  {service.internalDescription &&
                                    service.invoiceDescription &&
                                    service.internalDescription !== service.invoiceDescription && (
                                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Internal: {service.internalDescription}
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{service.serviceID || "-"}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                ${Number.parseFloat(service.unitPrice || 0).toFixed(2)}
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
                  All contract services have been reviewed and mapped
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors duration-200"
                >
                  Complete Services Review
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