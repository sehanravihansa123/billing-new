"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle,
  ExternalLink,
  Key,
  Globe,
  User,
  Lock,
  AlertCircle,
  Server,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

export default function AutotaskIntegrationPage() {
  const [formData, setFormData] = useState<{ [key: string]: string }>({
    "api-integration-code": "",
    username: "",
    secret: "",
    zone: "",
    host: "",
    timezone: "",
    "custom-zone-url": "",
  })
  const [viewMspId, setViewMspId] = useState("")
  const [viewServiceName, setViewServiceName] = useState("")
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [configData, setConfigData] = useState<any>(null)
  const [configError, setConfigError] = useState<string>("")
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    const defaultMspId = "msp-6ad4f1f1-4274-41ff-ad84-9fed354a3fac"
    setViewMspId(defaultMspId)
    fetchAvailableServices(defaultMspId)
  }, [])

  const fetchAvailableServices = async (mspId: string) => {
    setLoadingConfig(true)
    try {
      const response = await fetch(`/api/nocodb-services?msp_id=${mspId}`)
      if (response.ok) {
        const data = await response.json()
        const serviceNames = data.services.map((s: any) => s.name).filter(Boolean)

        // Auto-select first service if available
        if (serviceNames.length > 0) {
          const firstService = serviceNames[0]
          setViewServiceName(firstService)
          await fetchServiceConfig(firstService, mspId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch services:", error)
      setConfigError("Failed to load configuration. Please refresh the page.")
    } finally {
      setLoadingConfig(false)
    }
  }

  const fetchServiceConfig = async (serviceName: string, mspId?: string) => {
    const mspIdToUse = mspId || viewMspId

    if (!serviceName || !mspIdToUse) {
      return
    }

    setConfigError("")
    setConfigData(null)

    try {
      const params = new URLSearchParams({
        msp_id: mspIdToUse,
        name: serviceName,
      })

      const response = await fetch(`/api/service-config?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch configuration")
      }

      const data = await response.json()
      setConfigData(data)
      setConfigError("")

      // Auto-fill form with existing data
      fillFormWithExistingData(data)
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Unknown error")
      setConfigData(null)
    }
  }

  const fillFormWithExistingData = (data?: any) => {
    const configToUse = data || configData
    if (!configToUse || !configToUse.configuration) return

    const config = configToUse.configuration

    setFormData({
      "api-integration-code": config.integration_code || "",
      username: config.username || "",
      secret: config.secret || "",
      zone: config.zone_url || "",
      host: config.host || "",
      timezone: config.timezone || "",
      "custom-zone-url": config.custom_zone_url || "",
    })
  }

  const handleInputChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const requiredFields = ["api-integration-code", "username", "secret", "zone", "host", "timezone"]
  const allRequiredFieldsFilled = requiredFields.every((field) => formData[field]?.trim())

  const testConnection = async () => {
    const missingFields = requiredFields.filter((field) => !formData[field])

    if (missingFields.length > 0) {
      setConnectionStatus({
        success: false,
        message: "Please fill in all required fields before testing the connection.",
      })
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus(null)
    setSaveStatus(null)

    try {
      const endpoints = ["services", "contracts", "companies"]
      const results = await Promise.all(
        endpoints.map(async (api) => {
          const params = new URLSearchParams({
            api,
            apiCode: formData["api-integration-code"],
            username: formData["username"],
            secret: formData["secret"],
          })

          try {
            const response = await fetch(
              `https://n8n-oitlabs.eastus.cloudapp.azure.com/webhook/autotaskapi?${params.toString()}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )

            return {
              api: api.charAt(0).toUpperCase() + api.slice(1),
              success: response.ok,
              status: response.status,
              message: response.ok ? "Connected" : `Failed (${response.status})`,
            }
          } catch (err) {
            return {
              api: api.charAt(0).toUpperCase() + api.slice(1),
              success: false,
              status: 0,
              message: "Connection error",
            }
          }
        }),
      )

      const allSuccess = results.every((r) => r.success)
      const successCount = results.filter((r) => r.success).length
      const failedEndpoints = results.filter((r) => !r.success).map((r) => r.api)

      if (allSuccess) {
        setConnectionStatus({
          success: true,
          message: `Successfully connected to Autotask! All endpoints verified:\n✓ Services\n✓ Contracts\n✓ Companies`,
        })
      } else {
        setConnectionStatus({
          success: false,
          message: `Partial connection: ${successCount}/${endpoints.length} endpoints accessible.\nFailed: ${failedEndpoints.join(", ")}.\nCheck your API user permissions in Autotask.`,
        })
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const saveConfiguration = async () => {
    const missingFields = requiredFields.filter((field) => !formData[field])

    if (missingFields.length > 0) {
      setSaveStatus({
        success: false,
        message: "Please fill in all required fields before saving.",
      })
      return
    }

    if (!connectionStatus || !connectionStatus.success) {
      setSaveStatus({
        success: false,
        message: "Please test the connection successfully before saving.",
      })
      return
    }

    if (!viewServiceName) {
      setSaveStatus({
        success: false,
        message: "Service configuration error. Please refresh the page.",
      })
      return
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {
      const secretsToSave = [
        { name: "autotask-api-integration-code", value: formData["api-integration-code"] },
        { name: "autotask-username", value: formData["username"] },
        { name: "autotask-secret", value: formData["secret"] },
        { name: "autotask-zone", value: formData["zone"] },
        { name: "autotask-host", value: formData["host"] },
        { name: "autotask-timezone", value: formData["timezone"] },
      ]

      if (formData["custom-zone-url"]) {
        secretsToSave.push({ name: "autotask-custom-zone-url", value: formData["custom-zone-url"] })
      }

      for (const secret of secretsToSave) {
        const response = await fetch("/api/secrets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(secret),
        })

        if (!response.ok) {
          throw new Error(`Failed to save ${secret.name}`)
        }
      }

      // Send configuration data to webhook
      const webhookPayload = {
        msp_id: viewMspId,
        service_name: viewServiceName,
        integration_type: "autotask",
        configuration: {
          integration_code: formData["api-integration-code"],
          username: formData["username"],
          secret: formData["secret"],
          zone_url: formData["zone"],
          host: formData["host"],
          timezone: formData["timezone"],
          custom_zone_url: formData["custom-zone-url"] || null,
        },
        status: "active",
      }

      const webhookResponse = await fetch("/api/send-service-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      })

      if (!webhookResponse.ok) {
        throw new Error("Failed to send configuration data to webhook")
      }

      setSaveStatus({
        success: true,
        message: "Configuration saved successfully to Azure Key Vault and synced to database!",
      })
    } catch (error) {
      setSaveStatus({
        success: false,
        message: `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const requiredData = [
    {
      id: "api-integration-code",
      label: "API Integration Code",
      description: "Your Autotask API Integration Code (Tracking Identifier)",
      icon: Key,
      type: "text",
      required: true,
    },
    {
      id: "username",
      label: "Username",
      description: "Your Autotask API username (Generated Key)",
      icon: User,
      type: "text",
      required: true,
    },
    {
      id: "secret",
      label: "Secret",
      description: "Your Autotask API secret (Generated Password)",
      icon: Lock,
      type: "password",
      required: true,
    },
    {
      id: "host",
      label: "API Host",
      description: "The Autotask API host URL",
      icon: Server,
      type: "text",
      required: true,
    },
    {
      id: "zone",
      label: "Zone",
      description: "Select your Autotask zone",
      icon: Globe,
      type: "select",
      required: true,
      options: [
        "Pre-release",
        "Pre-release (UK)",
        "Limited Release",
        "Limited Release (UK)",
        "America East",
        "America East 2",
        "America East 3",
        "America West",
        "America West 2",
        "America West 3",
        "America West 4",
        "UK",
        "UK2",
        "UK3",
        "Australia / New Zealand",
        "Australia 2",
        "Pre-Release (Deutsch)",
        "Pre-Release (Español)",
        "German (Deutsch)",
        "EU1 (English Europe and Asia)",
        "Spanish (Español)",
        "Other (Custom URL)",
      ],
    },
    {
      id: "custom-zone-url",
      label: "Custom Zone URL",
      description: "Custom zone URL (only if 'Other (Custom URL)' is selected)",
      icon: Globe,
      type: "text",
      required: false,
    },
    {
      id: "timezone",
      label: "Timezone",
      description: "Select your timezone",
      icon: Globe,
      type: "select",
      required: true,
      options: [
        "Africa/Abidjan",
        "Africa/Accra",
        "Africa/Addis_Ababa",
        "Africa/Algiers",
        "Africa/Asmara",
        "Africa/Bamako",
        "Africa/Bangui",
        "Africa/Banjul",
        "Africa/Bissau",
        "Africa/Blantyre",
        "Africa/Brazzaville",
        "Africa/Bujumbura",
        "Africa/Cairo",
        "Africa/Casablanca",
        "Africa/Ceuta",
        "America/Adak",
        "America/Anchorage",
        "America/Anguilla",
        "America/Antigua",
        "America/Araguaina",
        "America/Argentina/Buenos_Aires",
        "America/Barbados",
        "America/Belem",
        "America/Belize",
        "America/Chicago",
        "America/Denver",
        "America/Detroit",
        "America/Edmonton",
        "America/Halifax",
        "America/Los_Angeles",
        "America/Mexico_City",
        "America/New_York",
        "America/Phoenix",
        "America/Toronto",
        "America/Vancouver",
        "Asia/Bangkok",
        "Asia/Colombo",
        "Asia/Dubai",
        "Asia/Hong_Kong",
        "Asia/Jakarta",
        "Asia/Jerusalem",
        "Asia/Karachi",
        "Asia/Kolkata",
        "Asia/Manila",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Asia/Singapore",
        "Asia/Tokyo",
        "Atlantic/Azores",
        "Atlantic/Bermuda",
        "Atlantic/Canary",
        "Atlantic/Cape_Verde",
        "Australia/Adelaide",
        "Australia/Brisbane",
        "Australia/Darwin",
        "Australia/Hobart",
        "Australia/Melbourne",
        "Australia/Perth",
        "Australia/Sydney",
        "Europe/Amsterdam",
        "Europe/Athens",
        "Europe/Berlin",
        "Europe/Brussels",
        "Europe/Budapest",
        "Europe/Copenhagen",
        "Europe/Dublin",
        "Europe/Helsinki",
        "Europe/Istanbul",
        "Europe/Lisbon",
        "Europe/London",
        "Europe/Madrid",
        "Europe/Moscow",
        "Europe/Oslo",
        "Europe/Paris",
        "Europe/Prague",
        "Europe/Rome",
        "Europe/Stockholm",
        "Europe/Vienna",
        "Europe/Warsaw",
        "Europe/Zurich",
        "Pacific/Auckland",
        "Pacific/Fiji",
        "Pacific/Guam",
        "Pacific/Honolulu",
        "Pacific/Pago_Pago",
        "UTC",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="px-8 py-12 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center p-3 border border-gray-200 dark:border-gray-700">
              <img
                src="/logos/Autotask-Logo-Registered.jpg"
                alt="Autotask logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-light text-gray-900 dark:text-white tracking-tight">Autotask Integration</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                Configure your Autotask API connection
              </p>
            </div>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Setup Guide</h2>
            {showGuide ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {showGuide && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Log in to your Autotask account
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Navigate to{" "}
                      <a
                        href="https://autotask.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        autotask.com
                      </a>{" "}
                      and sign in with your credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Navigate to API User Management
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Go to <strong>Admin → Resources (Users) → API Users</strong> to create or manage API credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Create a new API User</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Click <strong>New API User</strong> and configure the following:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1 ml-4">
                      <li>Set appropriate permissions for the integration</li>
                      <li>Generate API credentials (Username and Secret)</li>
                      <li>Note down the Tracking Identifier (Integration Code)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Enter your credentials below</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Fill in the configuration form with your API credentials, select your zone, and test the
                      connection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingConfig && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading configuration...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {configError && !loadingConfig && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Error Loading Configuration</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{configError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        {!loadingConfig && (
          <div
            id="configuration-form"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Configuration</h2>

            <div className="space-y-6">
              {requiredData.map((item) => {
                const Icon = item.icon
                const isCustomZoneUrl = item.id === "custom-zone-url"
                const showCustomZoneUrl = formData["zone"] === "Other (Custom URL)"

                if (isCustomZoneUrl && !showCustomZoneUrl) {
                  return null
                }

                return (
                  <div key={item.id} className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-900 dark:text-white">
                      <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span>{item.label}</span>
                      {item.required && <span className="text-red-500">*</span>}
                    </label>

                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>

                    {item.type === "select" ? (
                      <select
                        value={formData[item.id] || ""}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select {item.label}</option>
                        {item.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={item.type}
                        value={formData[item.id] || ""}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        placeholder={`Enter ${item.label}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Test Connection Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={testConnection}
                disabled={isTestingConnection || !allRequiredFieldsFilled}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isTestingConnection ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              {!allRequiredFieldsFilled && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Please fill in all required fields to test the connection
                </p>
              )}
            </div>

            {/* Connection Status */}
            {connectionStatus && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  connectionStatus.success
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {connectionStatus.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm whitespace-pre-line ${
                        connectionStatus.success
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {connectionStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Configuration Button */}
            {connectionStatus?.success && (
              <div className="mt-4">
                <button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Saving Configuration...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Save Status */}
            {saveStatus && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  saveStatus.success
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {saveStatus.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        saveStatus.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {saveStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
