import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Clean JavaScript global object caching for development hot-reloads
const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Prisma 7.x with PostgreSQL adapter
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export async function POST(req) {
  try {
    const body = await req.json();
    // Destructure 'phone' from the frontend payload
    const { email, password, name, phone, role } = body;

    const prisma = getPrismaClient();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "BIDDER",
        phoneNumber: phone // FIXED: Maps the 'phone' variable to your schema's 'phoneNumber' field
      }
    });

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Registration Database Crash Details:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}