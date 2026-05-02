/**
 * GET  /api/rewards — List available rewards
 * POST /api/rewards — Create/update a reward (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// ─── GET: List rewards ──────────────────────────────────────────
export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsRequired: "asc" },
    });

    return NextResponse.json({ data: rewards });
  } catch (error) {
    console.error("Get rewards error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a reward (admin) ─────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      pointsRequired,
      stock,
      bengkelName,
      bengkelAddress,
      bengkelPhone,
    } = body;

    if (!name || !type || !pointsRequired) {
      return NextResponse.json(
        { error: "name, type, and pointsRequired are required" },
        { status: 400 }
      );
    }

    // Validate reward type
    const validTypes = ["TOKEN_LISTRIK", "TRANSUM", "VOUCHER_BENGKEL"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        type,
        pointsRequired: parseInt(pointsRequired),
        stock: parseInt(stock) || 0,
        bengkelName: type === "VOUCHER_BENGKEL" ? bengkelName : null,
        bengkelAddress: type === "VOUCHER_BENGKEL" ? bengkelAddress : null,
        bengkelPhone: type === "VOUCHER_BENGKEL" ? bengkelPhone : null,
      },
    });

    return NextResponse.json(
      { message: "Reward created", data: reward },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create reward error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
