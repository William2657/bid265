import { NextResponse } from "next/server";

export async function POST(request) {
  const payload = await request.json();
  const { tx_ref, status, amount, currency } = payload;

  // Verify with PayChangu server-side
  const verifyRes = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      Accept: "application/json",
    },
  });
  const verifyData = await verifyRes.json();

  if (verifyData.data?.status === "success") {
    // Update your database
    // await db.payments.update({ tx_ref }, { status: "completed" });
  }

  return NextResponse.json({ received: true });
}