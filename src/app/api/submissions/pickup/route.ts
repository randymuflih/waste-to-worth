/**
 * POST /api/submissions/pickup — Create a pickup submission
 * GET  /api/submissions/pickup — Get pickup submissions for the authenticated user
 *
 * Handles the pickup submission flow:
 * 1. Citizen fills pickup form with address + district
 * 2. System shows available pickup schedule for that district
 * 3. Citizen confirms submission
 * 4. System links submission to the pickup batch
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// ─── GET: Fetch user's pickup submissions ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.userId,
        method: "PICKUP",
      },
      include: {
        submissionItems: true,
        pickupSubmissionDetail: {
          include: { district: true, pickupSchedule: true },
        },
        batch: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ data: submissions });
  } catch (error) {
    console.error("Get pickup submissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new pickup submission ───────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { districtId, pickupScheduleId, address, items } = body;

    // Validate required fields
    if (!districtId || !pickupScheduleId || !address || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "districtId, pickupScheduleId, address, and items are required" },
        { status: 400 }
      );
    }

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId },
    });

    if (!district) {
      return NextResponse.json(
        { error: "District not found" },
        { status: 404 }
      );
    }

    // Verify pickup schedule exists and is valid
    const schedule = await prisma.pickupSchedule.findUnique({
      where: { id: pickupScheduleId },
    });

    if (!schedule || schedule.districtId !== districtId) {
      return NextResponse.json(
        { error: "Invalid pickup schedule for this district" },
        { status: 400 }
      );
    }

    if (schedule.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This pickup schedule has already been completed" },
        { status: 400 }
      );
    }

    // Find or create an open batch for this pickup schedule
    let batch = await prisma.batch.findFirst({
      where: {
        pickupScheduleId,
        type: "PICKUP",
        status: { in: ["OPEN", "COLLECTING"] },
      },
    });

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          type: "PICKUP",
          pickupScheduleId,
          status: "OPEN",
        },
      });
    }

    // Create submission with items
    const submission = await prisma.submission.create({
      data: {
        userId: user.userId,
        batchId: batch.id,
        method: "PICKUP",
        status: "PENDING",
        submissionItems: {
          create: items.map((item: { itemType: string; quantity: number }) => ({
            itemType: item.itemType,
            quantity: item.quantity,
          })),
        },
        pickupSubmissionDetail: {
          create: {
            pickupScheduleId,
            address,
            districtId,
          },
        },
      },
      include: {
        submissionItems: true,
        pickupSubmissionDetail: true,
      },
    });

    return NextResponse.json(
      { message: "Pickup submission created successfully", data: submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create pickup submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
