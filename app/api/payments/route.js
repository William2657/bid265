import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { userId: parseInt(session.user.id) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[Payments GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}