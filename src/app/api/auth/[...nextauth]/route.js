import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  providers: [
    // Microsoft OAuth
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID, // from .env
      authorization: {
        params: {
          scope: "openid email profile offline_access User.Read",
        },
      },
    }),

    // Hardcoded credentials
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Received credentials in authorize:", credentials)

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }

        const users = [
          { id: "1", email: "admin@example.com", password: "password123", name: "Admin User" },
          { id: "2", email: "user@example.com", password: "userpass", name: "Regular User" },
        ]

        const user = users.find(
          u => u.email === credentials.email && u.password === credentials.password
        )

        if (user) {
          console.log("User authenticated:", user)
          return { id: user.id, email: user.email, name: user.name }
        }

        throw new Error("Invalid email or password")
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET, // required for JWT
  pages: {
    signIn: "/login",
    error: "/login", // Will redirect with ?error=...
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || "credentials"
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.provider = token.provider
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
