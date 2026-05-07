/**
 * GET /api/points — Get user's point balance and transaction history
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user balance
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { pointsBalance: true },
    });

    // Get transaction history
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    type Tx = (typeof transactions)[number];

    // Calculate totals
    const totalEarned = transactions
      .filter((t: Tx) => t.type === "EARN")
      .reduce((sum: number, t: Tx) => sum + t.amount, 0);

    const totalRedeemed = transactions
      .filter((t: Tx) => t.type === "REDEEM")
      .reduce((sum: number, t: Tx) => sum + Math.abs(t.amount), 0);

    return NextResponse.json({
      data: {
        balance: currentUser?.pointsBalance || 0,
        totalEarned,
        totalRedeemed,
        transactions,
      },
    });
  } catch (error) {
    console.error("Get points error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
