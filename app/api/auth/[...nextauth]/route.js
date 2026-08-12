import NextAuth from "next-auth";
import { authConfig } from "../../../../auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function handler(req, ctx) {
  // Prisma 7.x with PostgreSQL adapter
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const { handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
  });

  // JavaScript cleanly processes the dynamic Next.js execution context parameter natively
  if (req.method === "GET") {
    return await handlers.GET(req, ctx);
  } else {
    return await handlers.POST(req, ctx);
  }
}

export { handler as GET, handler as POST };