/**
 * GET  /api/redemptions — List user's redemptions or all (admin)
 * POST /api/redemptions — Request a reward redemption (citizen)
 *                         or approve/deliver a redemption (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// ─── GET: List redemptions ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where =
      user.role === "ADMIN"
        ? {} // Admin sees all
        : { userId: user.userId }; // Citizen sees own

    const redemptions = await prisma.redemption.findMany({
      where,
      include: {
        reward: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: redemptions });
  } catch (error) {
    console.error("Get redemptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create or process redemption ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // ── Admin: Approve/deliver redemption ────────────────────────
    if (body.action && user.role === "ADMIN") {
      const { redemptionId, action, rewardCode } = body;

      if (!redemptionId || !action) {
        return NextResponse.json(
          { error: "redemptionId and action required" },
          { status: 400 }
        );
      }

      const redemption = await prisma.redemption.findUnique({
        where: { id: redemptionId },
      });

      if (!redemption) {
        return NextResponse.json(
          { error: "Redemption not found" },
          { status: 404 }
        );
      }

      if (action === "approve") {
        if (redemption.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only approve PENDING redemptions" },
            { status: 400 }
          );
        }

        if (!rewardCode) {
          return NextResponse.json(
            { error: "rewardCode is required for approval" },
            { status: 400 }
          );
        }

        const updated = await prisma.redemption.update({
          where: { id: redemptionId },
          data: { status: "APPROVED", rewardCode },
        });

        return NextResponse.json({ data: updated });
      }

      if (action === "deliver") {
        if (redemption.status !== "APPROVED") {
          return NextResponse.json(
            { error: "Can only deliver APPROVED redemptions" },
            { status: 400 }
          );
        }

        const updated = await prisma.redemption.update({
          where: { id: redemptionId },
          data: { status: "DELIVERED" },
        });

        return NextResponse.json({ data: updated });
      }

      return NextResponse.json(
        { error: "Invalid action. Use: approve, deliver" },
        { status: 400 }
      );
    }

    // ── Citizen: Request redemption ─────────────────────────────
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: "rewardId is required" },
        { status: 400 }
      );
    }

    // Get reward and user
    const [reward, currentUser] = await Promise.all([
      prisma.reward.findUnique({ where: { id: rewardId } }),
      prisma.user.findUnique({ where: { id: user.userId } }),
    ]);

    if (!reward || !reward.isActive) {
      return NextResponse.json(
        { error: "Reward not found or inactive" },
        { status: 404 }
      );
    }

    if (reward.stock <= 0) {
      return NextResponse.json(
        { error: "Reward is out of stock" },
        { status: 400 }
      );
    }

    if (!currentUser || currentUser.pointsBalance < reward.pointsRequired) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    // Create redemption in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redemption = await prisma.$transaction(async (tx: any) => {
      // Deduct points
      await tx.user.update({
        where: { id: user.userId },
        data: { pointsBalance: { decrement: reward.pointsRequired } },
      });

      // Create point transaction
      await tx.pointTransaction.create({
        data: {
          userId: user.userId,
          amount: -reward.pointsRequired,
          type: "REDEEM",
        },
      });

      // Decrement stock
      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } },
      });

      // Create redemption
      return tx.redemption.create({
        data: {
          userId: user.userId,
          rewardId,
          status: "PENDING",
        },
        include: { reward: true },
      });
    });

    return NextResponse.json(
      { message: "Redemption requested", data: redemption },
      { status: 201 }
    );
  } catch (error) {
    console.error("Redemption error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
