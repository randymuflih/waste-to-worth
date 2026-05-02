/**
 * GET  /api/batches — List all batches (admin) or user's batches
 * POST /api/batches — Update batch status (admin only)
 *
 * Manages batch lifecycle: OPEN → COLLECTING → VERIFYING → COMPLETED
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { calculatePoints } from "@/lib/points";

// ─── GET: Fetch batches ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Build filter
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const batches = await prisma.batch.findMany({
      where,
      include: {
        dropbox: true,
        pickupSchedule: { include: { district: true } },
        submissions: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            submissionItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: batches });
  } catch (error) {
    console.error("Get batches error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Update batch status (admin) ──────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { batchId, action, verificationData } = body;

    if (!batchId || !action) {
      return NextResponse.json(
        { error: "batchId and action are required" },
        { status: 400 }
      );
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { submissions: { include: { submissionItems: true } } },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Handle batch status transitions
    switch (action) {
      case "collect": {
        // OPEN → COLLECTING
        if (batch.status !== "OPEN") {
          return NextResponse.json(
            { error: "Batch must be OPEN to start collecting" },
            { status: 400 }
          );
        }
        const updated = await prisma.batch.update({
          where: { id: batchId },
          data: { status: "COLLECTING" },
        });
        return NextResponse.json({ data: updated });
      }

      case "verify": {
        // COLLECTING → VERIFYING
        if (batch.status !== "COLLECTING") {
          return NextResponse.json(
            { error: "Batch must be COLLECTING to start verification" },
            { status: 400 }
          );
        }
        const updated = await prisma.batch.update({
          where: { id: batchId },
          data: { status: "VERIFYING", collectedAt: new Date() },
        });

        // Reset dropbox capacity if applicable
        if (batch.type === "DROPBOX" && batch.dropboxId) {
          await prisma.dropboxLocation.update({
            where: { id: batch.dropboxId },
            data: { currentBoxCount: 0 },
          });
          // Mark boxes as available again
          await prisma.box.updateMany({
            where: { dropboxId: batch.dropboxId },
            data: { isAvailable: true },
          });
        }

        return NextResponse.json({ data: updated });
      }

      case "complete": {
        // VERIFYING → COMPLETED (with weight verification and point assignment)
        if (batch.status !== "VERIFYING") {
          return NextResponse.json(
            { error: "Batch must be VERIFYING to complete" },
            { status: 400 }
          );
        }

        // verificationData: [{ submissionId, items: [{ itemId, weightKg }], approved }]
        if (!verificationData || !Array.isArray(verificationData)) {
          return NextResponse.json(
            { error: "verificationData is required for completion" },
            { status: 400 }
          );
        }

        await prisma.$transaction(async (tx) => {
          for (const entry of verificationData) {
            const { submissionId, items, approved } = entry;

            if (!approved) {
              // Reject submission
              await tx.submission.update({
                where: { id: submissionId },
                data: {
                  status: "REJECTED",
                  verifiedAt: new Date(),
                  verifiedBy: user.userId,
                },
              });
              continue;
            }

            // Update item weights and calculate points
            let totalPoints = 0;
            for (const item of items) {
              const points = await calculatePoints(item.itemType, item.weightKg);
              await tx.submissionItem.update({
                where: { id: item.itemId },
                data: { weightKg: item.weightKg, pointsEarned: points },
              });
              totalPoints += points;
            }

            // Mark submission as verified
            await tx.submission.update({
              where: { id: submissionId },
              data: {
                status: "VERIFIED",
                totalPointsEarned: totalPoints,
                verifiedAt: new Date(),
                verifiedBy: user.userId,
              },
            });

            // Get submission to find userId
            const sub = await tx.submission.findUnique({
              where: { id: submissionId },
            });

            if (sub && totalPoints > 0) {
              // Create point transaction
              await tx.pointTransaction.create({
                data: {
                  userId: sub.userId,
                  amount: totalPoints,
                  type: "EARN",
                  referenceId: submissionId,
                },
              });

              // Update user points balance
              await tx.user.update({
                where: { id: sub.userId },
                data: { pointsBalance: { increment: totalPoints } },
              });
            }
          }

          // Mark batch as completed
          await tx.batch.update({
            where: { id: batchId },
            data: { status: "COMPLETED" },
          });
        });

        return NextResponse.json({ message: "Batch completed and points assigned" });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: collect, verify, complete" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Batch action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
