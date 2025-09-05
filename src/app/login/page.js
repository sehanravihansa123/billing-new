"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Handle credentials login
  const handleCredentialsLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    if (result?.error) {
      setError(result.error || "Invalid email or password")
    } else if (result?.ok) {
      router.push("/home") // redirect to your home page
    }

    setIsLoading(false)
  }

  // Handle Microsoft login
  const handleMicrosoftLogin = async () => {
    setIsLoading(true)
    await signIn("azure-ad", { callbackUrl: "/home" })
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-bold text-gray-900">Billing Reconciliation</h2>
        <p className="mt-2 text-sm text-gray-800">Sign in to your account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-6" onSubmit={handleCredentialsLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">Or sign in with Microsoft</p>
          <button
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="mt-2 w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in with Microsoft"}
          </button>
        </div>
      </div>
    </div>
  )
}
