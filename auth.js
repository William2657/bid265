import Google from "next-auth/providers/google";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

// Global declaration to prevent open database handle leaks during Next.js Hot Reloads
const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  const dbUrl = new URL(connectionString);

  // CRITICAL FIX: PrismaMariaDb accepts connection options including allowPublicKeyRetrieval
  const dbAdapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),

    // FIX: Allow public key retrieval for RSA authentication
    allowPublicKeyRetrieval: true,

    // Connection pool settings to prevent timeouts
    connectionLimit: 10,
    acquireTimeout: 10000,
    connectTimeout: 5000,
    idleTimeout: 300000,

    // SSL disabled for local development
    ssl: false,
  });

  const client = new PrismaClient({ adapter: dbAdapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const authConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } }
    }),
    Credentials({
      name: "credentials",
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const prisma = getPrismaClient();

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) return null;
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) return null;

        return {
          id: String(user.id), 
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const prisma = getPrismaClient();

      if (user) {
        token.id = user.id; 
        token.role = user.role;
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.id = String(dbUser.id);
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);