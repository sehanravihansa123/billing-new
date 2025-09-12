"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { 
  Eye, Search, Filter, Building2, Package, ChevronDown, 
  RefreshCw, Download, Plus, Settings, ExternalLink, 
  FileText, CheckCircle, AlertTriangle, Users, DollarSign
} from "lucide-react"

function VendorOverviewPage() {
  const router = useRouter()
  const [configurations, setConfigurations] = useState([])
  const [filteredConfigurations, setFilteredConfigurations] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrganization, setSelectedOrganization] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalContracts: 0,
    totalServices: 0,
    totalRevenue: 0
  })

  // Load configurations from sessionStorage and localStorage
  useEffect(() => {
    const loadConfigurations = () => {
      setLoading(true)
      try {
        const configurations = []
        
        // Check for completed configurations
        const finalServicesConfig = sessionStorage.getItem("finalServicesConfiguration")
        const finalContractConfig = sessionStorage.getItem("finalContractConfiguration") 
        const organizationMappings = sessionStorage.getItem("organizationMappings")
        
        if (finalServicesConfig) {
          const servicesData = JSON.parse(finalServicesConfig)
          configurations.push({
            id: `services-${Date.now()}`,
            type: "Services Configuration",
            status: "Completed",
            dateCreated: new Date().toLocaleDateString(),
            organizations: Object.keys(servicesData.selectedContracts || {}),
            contracts: Object.values(servicesData.selectedContracts || {}),
            services: servicesData.serviceSelectionSummary || [],
            totalServices: servicesData.summary?.totalSelectedServices || 0,
            totalContracts: servicesData.summary?.totalContracts || 0,
            data: servicesData
          })
        } else if (finalContractConfig) {
          const contractData = JSON.parse(finalContractConfig)
          configurations.push({
            id: `contracts-${Date.now()}`,
            type: "Contract Configuration", 
            status: "In Progress",
            dateCreated: new Date().toLocaleDateString(),
            organizations: Object.keys(contractData.selectedContracts || {}),
            contracts: Object.values(contractData.selectedContracts || {}),
            services: [],
            totalServices: 0,
            totalContracts: contractData.summary?.selectedContracts || 0,
            data: contractData
          })
        } else if (organizationMappings) {
          const mappingData = JSON.parse(organizationMappings)
          configurations.push({
            id: `mappings-${Date.now()}`,
            type: "Organization Mapping",
            status: "Partial",
            dateCreated: new Date().toLocaleDateString(), 
            organizations: Object.keys(mappingData || {}),
            contracts: [],
            services: [],
            totalServices: 0,
            totalContracts: 0,
            data: { organizationMappings: mappingData }
          })
        }
        
        // Calculate stats
        const stats = configurations.reduce((acc, config) => ({
          totalOrganizations: acc.totalOrganizations + config.organizations.length,
          totalContracts: acc.totalContracts + config.totalContracts,
          totalServices: acc.totalServices + config.totalServices,
          totalRevenue: acc.totalRevenue + config.services.reduce((sum, service) => 
            sum + (parseFloat(service.unitPrice) || 0), 0)
        }), { totalOrganizations: 0, totalContracts: 0, totalServices: 0, totalRevenue: 0 })
        
        setConfigurations(configurations)
        setFilteredConfigurations(configurations)
        setStats(stats)
        
      } catch (error) {
        console.error('Error loading configurations:', error)
        setConfigurations([])
        setFilteredConfigurations([])
      } finally {
        setLoading(false)
      }
    }

    loadConfigurations()
  }, [])

  // Filter functionality
  useEffect(() => {
    let filtered = configurations

    if (searchTerm) {
      filtered = filtered.filter(config => 
        config.organizations.some(org => 
          org.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        config.contracts.some(contract => 
          (contract.contractName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contract.autotaskCompany || "").toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        config.services.some(service =>
          (service.serviceName || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (selectedOrganization !== "all") {
      filtered = filtered.filter(config => 
        config.organizations.includes(selectedOrganization)
      )
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(config => config.status === selectedStatus)
    }

    setFilteredConfigurations(filtered)
  }, [searchTerm, selectedOrganization, selectedStatus, configurations])

  const toggleRowExpansion = (configId) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(configId)) {
      newExpandedRows.delete(configId)
    } else {
      newExpandedRows.add(configId)
    }
    setExpandedRows(newExpandedRows)
  }

  const refreshData = () => {
    setLoading(true)
    // Reload from sessionStorage
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const exportData = () => {
    const exportData = {
      configurations: filteredConfigurations,
      stats: stats,
      exportDate: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `vendor-configurations-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const startNewConfiguration = () => {
    // Clear existing data and start fresh
    sessionStorage.removeItem("finalServicesConfiguration")
    sessionStorage.removeItem("finalContractConfiguration") 
    sessionStorage.removeItem("organizationMappings")
    sessionStorage.removeItem("vendorCsvData")
    sessionStorage.removeItem("billingConfiguration")
    
    router.push("/billing/vendor-settings/onboarding")
  }

  const uniqueOrganizations = [...new Set(configurations.flatMap(c => c.organizations))]
  const uniqueStatuses = [...new Set(configurations.map(c => c.status))]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'In Progress':
        return <Settings className="h-4 w-4 text-blue-500 animate-spin" />
      case 'Partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'Partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="px-8 py-12 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">
                    Vendor Configurations
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                    Overview of your Autotask vendor configurations and services
                  </p>
                </div>
              </div>
              
              <button
                onClick={startNewConfiguration}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search organizations, contracts, or services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <select
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Organizations</option>
                  {uniqueOrganizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                <button
                  onClick={exportData}
                  disabled={configurations.length === 0}
                  className="inline-flex items-center px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Organizations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrganizations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Contracts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalContracts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Selected Services</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalServices}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configurations Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Loading configurations...</span>
                </div>
              ) : configurations.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No configurations found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Get started by creating your first vendor configuration.
                  </p>
                  <button
                    onClick={startNewConfiguration}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Configuration
                  </button>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Configuration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Organizations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contracts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Services
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredConfigurations.map((config) => (
                      <React.Fragment key={config.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(config.status)}
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {config.type}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {config.id.split('-')[0]}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(config.status)}`}>
                              {config.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {config.organizations.length} organizations
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {config.totalContracts} contracts
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {config.totalServices} services
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {config.dateCreated}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => toggleRowExpansion(config.id)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-3"
                            >
                              <ChevronDown 
                                className={`h-4 w-4 transition-transform ${
                                  expandedRows.has(config.id) ? 'rotate-180' : ''
                                }`} 
                              />
                            </button>
                          </td>
                        </tr>
                        
                        {expandedRows.has(config.id) && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                              <div className="space-y-4">
                                {/* Organizations */}
                                {config.organizations.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Organizations</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {config.organizations.map((org, index) => (
                                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                          <Users className="h-3 w-3 mr-1" />
                                          {org}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Contracts */}
                                {config.contracts.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Contracts</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {config.contracts.map((contract, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                              {contract.contractName || "Unnamed Contract"}
                                            </h5>
                                          </div>
                                          <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {contract.autotaskCompany}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Revenue: ${Number.parseFloat(contract.estimatedRevenue || 0).toLocaleString()}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Services */}
                                {config.services.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Selected Services</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                      {config.services.map((service, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-2">
                                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {service.serviceName}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            ${Number.parseFloat(service.unitPrice || 0).toFixed(2)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Empty State */}
          {!loading && filteredConfigurations.length === 0 && configurations.length > 0 && (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No configurations match your filters</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default VendorOverviewPage