"use client"

import { useState } from "react"
import { FileText, Search, Calendar } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"

export default function CustomerBillingDataPage() {
  const [customerFilter, setCustomerFilter] = useState("")
  const [dateRangeFilter, setDateRangeFilter] = useState("")

  // Mock billing data
  const [billingData, setBillingData] = useState([
    {
      id: 1,
      customerName: "Acme Corp",
      invoiceNumber: "INV-1001",
      amount: "$1,200.00",
      date: "2023-10-01",
      status: "Pending",
      statusColor: "text-blue-600"
    },
    {
      id: 2,
      customerName: "Global Tech",
      invoiceNumber: "INV-1020", 
      amount: "$3,750.00",
      date: "2023-09-25",
      status: "Completed",
      statusColor: "text-green-600"
    },
    {
      id: 3,
      customerName: "Innovative Solutions",
      invoiceNumber: "INV-1035",
      amount: "$2,150.00", 
      date: "2023-09-30",
      status: "Pending",
      statusColor: "text-blue-600"
    },
    {
      id: 4,
      customerName: "NextGen Services",
      invoiceNumber: "INV-1040",
      amount: "$5,000.00",
      date: "2023-10-02", 
      status: "Completed",
      statusColor: "text-green-600"
    }
  ])

  const [filteredData, setFilteredData] = useState(billingData)

  const handleApplyFilters = () => {
    let filtered = billingData

    if (customerFilter) {
      filtered = filtered.filter(item => 
        item.customerName.toLowerCase().includes(customerFilter.toLowerCase())
      )
    }

    if (dateRangeFilter) {
      filtered = filtered.filter(item => 
        item.date.includes(dateRangeFilter)
      )
    }

    setFilteredData(filtered)
  }

  const clearFilters = () => {
    setCustomerFilter("")
    setDateRangeFilter("")
    setFilteredData(billingData)
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">BillingReconcilePro</h1>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <a href="/dashboard" className="hover:text-gray-900">Dashboard</a>
                <span className="font-medium text-gray-900">Customer Billing Data</span>
                <a href="/billing" className="hover:text-gray-900">Run Reconciliation</a>
                <a href="/settings" className="hover:text-gray-900">Settings</a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Filters Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
            
            <div className="space-y-6">
              {/* Customer Filter */}
              <div>
                <label htmlFor="customer-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="customer-filter"
                    placeholder="Search Customers"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm 
                               text-gray-900 font-medium placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="date-range-filter"
                    placeholder="Select Date Range"
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm 
                               text-gray-900 font-medium placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Try: 2023-10 or 2023-09
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleApplyFilters}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Customer Billing Reconciliation</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredData.length} of {billingData.length} records
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.length > 0 ? (
                      filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.customerName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.invoiceNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.amount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.date}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${item.statusColor}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No records found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Info */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Total Amount: <span className="font-medium">$12,100.00</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last updated: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
