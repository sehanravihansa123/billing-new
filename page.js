"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout.js"
import { 
  Eye, Search, Filter, Building2, Package, ChevronDown, 
  RefreshCw, Download, Plus, Settings, ExternalLink, 
  FileText, CheckCircle, AlertTriangle, Users, DollarSign, Trash2
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

  // Load all configurations from storage
  useEffect(() => {
    const loadConfigurations = () => {
      setLoading(true)
      try {
        const configurations = []
        
        // Get stored configurations history
        const storedConfigs = localStorage.getItem("vendorConfigurationsHistory")
        if (storedConfigs) {
          const parsedConfigs = JSON.parse(storedConfigs)
          configurations.push(...parsedConfigs)
        }

        // Also check current session data and add if not already in history
        const currentConfigs = getCurrentSessionConfigurations()
        
        // Add current session configs if they don't exist in stored history
        currentConfigs.forEach(currentConfig => {
          const exists = configurations.some(config => 
            config.id === currentConfig.id || 
            (config.type === currentConfig.type && 
             Math.abs(new Date(config.dateCreated) - new Date(currentConfig.dateCreated)) < 60000) // within 1 minute
          )
          if (!exists) {
            configurations.push(currentConfig)
          }
        })
        
        // Sort by date created (newest first)
        configurations.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        
        // Calculate stats
        const stats = calculateStats(configurations)
        
        setConfigurations(configurations)
        setFilteredConfigurations(configurations)
        setStats(stats)
        
        // Update localStorage with current configurations
        localStorage.setItem("vendorConfigurationsHistory", JSON.stringify(configurations))
        
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

  // Get current session configurations
  const getCurrentSessionConfigurations = () => {
    const configurations = []
    const currentTime = new Date()
    
    // Check for completed configurations
    const finalServicesConfig = sessionStorage.getItem("finalServicesConfiguration")
    const finalContractConfig = sessionStorage.getItem("finalContractConfiguration") 
    const organizationMappings = sessionStorage.getItem("organizationMappings")
    
    if (finalServicesConfig) {
      const servicesData = JSON.parse(finalServicesConfig)
      
      // Enhanced processing to show all selected services by contract and organization
      const servicesByContract = {}
      const contractsByOrg = {}
      
      // Process selected services and group by contract
      if (servicesData.serviceSelectionSummary) {
        servicesData.serviceSelectionSummary.forEach(service => {
          const contractId = service.contractId
          const orgName = service.organizationName
          
          if (!servicesByContract[contractId]) {
            servicesByContract[contractId] = []
          }
          servicesByContract[contractId].push(service)
          
          if (!contractsByOrg[orgName]) {
            contractsByOrg[orgName] = []
          }
          
          // Add contract info if not already added
          const existingContract = contractsByOrg[orgName].find(c => c.contractId === contractId)
          if (!existingContract) {
            contractsByOrg[orgName].push({
              contractId: contractId,
              contractName: service.contractName,
              services: []
            })
          }
        })
        
        // Populate services for each contract
        Object.keys(contractsByOrg).forEach(orgName => {
          contractsByOrg[orgName].forEach(contract => {
            contract.services = servicesByContract[contract.contractId] || []
          })
        })
      }
      
      configurations.push({
        id: `services-${currentTime.getTime()}`,
        type: "Services Configuration",
        status: "Completed",
        dateCreated: currentTime.toISOString(),
        organizations: Object.keys(servicesData.selectedContracts || {}),
        contracts: Object.values(servicesData.selectedContracts || {}),
        services: servicesData.serviceSelectionSummary || [],
        totalServices: servicesData.summary?.totalSelectedServices || 0,
        totalContracts: servicesData.summary?.totalContracts || 0,
        contractsByOrganization: contractsByOrg, // NEW: Detailed breakdown
        servicesByContract: servicesByContract, // NEW: Services by contract
        data: servicesData
      })
    }
    
    if (finalContractConfig && !finalServicesConfig) {
      const contractData = JSON.parse(finalContractConfig)
      configurations.push({
        id: `contracts-${currentTime.getTime() + 1}`,
        type: "Contract Configuration", 
        status: "In Progress",
        dateCreated: currentTime.toISOString(),
        organizations: Object.keys(contractData.selectedContracts || {}),
        contracts: Object.values(contractData.selectedContracts || {}),
        services: [],
        totalServices: 0,
        totalContracts: contractData.summary?.selectedContracts || 0,
        contractsByOrganization: {},
        servicesByContract: {},
        data: contractData
      })
    }
    
    if (organizationMappings && !finalContractConfig && !finalServicesConfig) {
      const mappingData = JSON.parse(organizationMappings)
      configurations.push({
        id: `mappings-${currentTime.getTime() + 2}`,
        type: "Organization Mapping",
        status: "Partial",
        dateCreated: currentTime.toISOString(), 
        organizations: Object.keys(mappingData || {}),
        contracts: [],
        services: [],
        totalServices: 0,
        totalContracts: 0,
        contractsByOrganization: {},
        servicesByContract: {},
        data: { organizationMappings: mappingData }
      })
    }
    
    return configurations
  }

  // Calculate statistics
  const calculateStats = (configurations) => {
    const uniqueOrgs = new Set()
    
    return configurations.reduce((acc, config) => {
      // Add unique organizations
      config.organizations.forEach(org => uniqueOrgs.add(org))
      
      return {
        totalOrganizations: uniqueOrgs.size,
        totalContracts: acc.totalContracts + config.totalContracts,
        totalServices: acc.totalServices + config.totalServices,
        totalRevenue: acc.totalRevenue + config.services.reduce((sum, service) => 
          sum + (parseFloat(service.unitPrice) || 0), 0)
      }
    }, { totalOrganizations: 0, totalContracts: 0, totalServices: 0, totalRevenue: 0 })
  }

  // Delete configuration
  const deleteConfiguration = (configId) => {
    const updatedConfigurations = configurations.filter(config => config.id !== configId)
    setConfigurations(updatedConfigurations)
    setFilteredConfigurations(updatedConfigurations.filter(config => {
      // Apply current filters
      let matches = true
      
      if (searchTerm) {
        matches = matches && (
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
        matches = matches && config.organizations.includes(selectedOrganization)
      }

      if (selectedStatus !== "all") {
        matches = matches && config.status === selectedStatus
      }

      return matches
    }))
    
    // Update localStorage
    localStorage.setItem("vendorConfigurationsHistory", JSON.stringify(updatedConfigurations))
    
    // Recalculate stats
    const newStats = calculateStats(updatedConfigurations)
    setStats(newStats)
    
    // Collapse expanded row if it was deleted
    if (expandedRows.has(configId)) {
      const newExpandedRows = new Set(expandedRows)
      newExpandedRows.delete(configId)
      setExpandedRows(newExpandedRows)
    }
  }

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
    // Reload from storage
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
    // Clear existing session data and start fresh
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

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (error) {
      return dateString
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
                            {formatDate(config.dateCreated)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => toggleRowExpansion(config.id)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Toggle details"
                              >
                                <ChevronDown 
                                  className={`h-4 w-4 transition-transform ${
                                    expandedRows.has(config.id) ? 'rotate-180' : ''
                                  }`} 
                                />
                              </button>
                              <button
                                onClick={() => deleteConfiguration(config.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete configuration"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {expandedRows.has(config.id) && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                              <div className="space-y-6">
                                {/* Organizations with their contracts and services */}
                                {Object.keys(config.contractsByOrganization || {}).length > 0 ? (
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                      Detailed Configuration by Organization
                                    </h4>
                                    
                                    {Object.entries(config.contractsByOrganization).map(([orgName, contracts]) => (
                                      <div key={orgName} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center mb-3">
                                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                                          <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                                            {orgName}
                                          </h5>
                                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full">
                                            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        
                                        {contracts.map((contract, contractIndex) => (
                                          <div key={contractIndex} className="ml-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center">
                                                <FileText className="h-4 w-4 text-green-600 mr-2" />
                                                <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {contract.contractName}
                                                </h6>
                                              </div>
                                              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded-full">
                                                {contract.services.length} service{contract.services.length !== 1 ? 's' : ''}
                                              </span>
                                            </div>
                                            
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                              Contract ID: {contract.contractId}
                                            </div>
                                            
                                            {contract.services.length > 0 ? (
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {contract.services.map((service, serviceIndex) => (
                                                  <div key={serviceIndex} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-2">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                      {service.serviceName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                      ${Number.parseFloat(service.unitPrice || 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                      ID: {service.serviceId}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                No services selected for this contract
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  // Fallback to original display format for older configurations
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
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">All Selected Services</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                          {config.services.map((service, index) => (
                                            <div key={index} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-2">
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {service.serviceName}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                ${Number.parseFloat(service.unitPrice || 0).toFixed(2)}
                                              </div>
                                              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                {service.organizationName}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Configuration Summary */}
                                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Configuration Summary</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Organizations:</span>
                                      <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                        {config.organizations.length}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Contracts:</span>
                                      <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                        {config.totalContracts}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Services:</span>
                                      <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                        {config.totalServices}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Total Value:</span>
                                      <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                        ${config.services.reduce((sum, service) => sum + (parseFloat(service.unitPrice) || 0), 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
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