import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRentReminder } from "@/lib/email";

/**
 * 🕒 RENT DUE REMINDERS (cron endpoint)
 *
 * Document requirement: lease listings send automatic reminders to the
 * tenant that the rent is due the following month.
 *
 * Schedule this route with any scheduler (e.g. daily):
 *   GET /api/cron/rent-reminders
 *   Header: x-cron-secret: <RENT_REMINDER_SECRET>   (optional but recommended)
 *
 * Each lease fires one reminder 7 days before its next due date, then the
 * due date rolls forward one month so reminders repeat monthly.
 */

function addMonths(date, count = 1) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}

export async function GET(request) {
  try {
    const secret = process.env.RENT_REMINDER_SECRET;
    if (secret) {
      const provided =
        request.headers.get("x-cron-secret") ||
        new URL(request.url).searchParams.get("secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const assets = await prisma.asset.findMany({
      where: { salesType: "PROPERTY" },
      select: {
        id: true,
        title: true,
        location: true,
        attributes: true,
        createdBy: { select: { name: true } },
      },
    });

    const now = new Date();
    const results = { scanned: 0, remindersSent: 0, rolledForward: 0, errors: 0 };

    for (const asset of assets) {
      const attrs =
        asset.attributes && typeof asset.attributes === "object" && !Array.isArray(asset.attributes)
          ? { ...asset.attributes }
          : null;
      if (!attrs || attrs.listingType !== "LEASE") continue;
      if (!attrs.leaseTenantEmail || !attrs.nextRentDue) continue;
      results.scanned += 1;

      let changed = false;
      const due = new Date(attrs.nextRentDue);
      if (isNaN(due.getTime())) continue;

      // Fire one reminder 7 days before the due date.
      const remindAt = addMonths(due, 0);
      remindAt.setDate(remindAt.getDate() - 7);
      if (now >= remindAt && attrs.lastRentReminderFor !== attrs.nextRentDue) {
        try {
          const outcome = await sendRentReminder({
            title: asset.title,
            location: asset.location,
            tenantName: attrs.leaseTenantName || "Valued Tenant",
            tenantEmail: attrs.leaseTenantEmail,
            monthlyRent: Number(attrs.monthlyRent) || 0,
            dueDate: attrs.nextRentDue,
            auctioneerName: asset.createdBy?.name || "Verified Auctioneer",
          });
          if (outcome.sent) results.remindersSent += 1;
          else results.errors += 1;
        } catch {
          results.errors += 1;
        }
        attrs.lastRentReminderFor = attrs.nextRentDue;
        changed = true;
      }

      // Roll the due date forward one month at a time once it has passed.
      if (now > due) {
        let next = addMonths(due, 1);
        let guard = 0;
        while (next <= now && guard < 60) {
          next = addMonths(next, 1);
          guard += 1;
        }
        attrs.nextRentDue = next.toISOString();
        attrs.lastRentReminderFor = null;
        changed = true;
        results.rolledForward += 1;
      }

      if (changed) {
        await prisma.asset.update({
          where: { id: asset.id },
          data: { attributes: attrs },
        });
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("[Rent reminders cron]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process rent reminders." },
      { status: 500 }
    );
  }
}
