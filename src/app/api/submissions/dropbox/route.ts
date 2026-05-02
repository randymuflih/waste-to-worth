/**
 * POST /api/submissions/dropbox — Create a dropbox submission
 * GET  /api/submissions/dropbox — Get dropbox submissions for the authenticated user
 *
 * Handles the dropbox submission flow:
 * 1. Citizen scans QR → identifies dropbox
 * 2. Inputs box number
 * 3. Declares item types and quantity
 * 4. System creates submission linked to the current open batch
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// ─── GET: Fetch user's dropbox submissions ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.userId,
        method: "DROPBOX",
      },
      include: {
        submissionItems: true,
        dropboxSubmissionDetail: {
          include: { dropbox: true, box: true },
        },
        batch: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ data: submissions });
  } catch (error) {
    console.error("Get dropbox submissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new dropbox submission ──────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dropboxId, boxNumber, items } = body;

    // Validate required fields
    if (!dropboxId || !boxNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "dropboxId, boxNumber, and items are required" },
        { status: 400 }
      );
    }

    // Verify dropbox exists and is active
    const dropbox = await prisma.dropboxLocation.findUnique({
      where: { id: dropboxId },
    });

    if (!dropbox || !dropbox.isActive) {
      return NextResponse.json(
        { error: "Dropbox not found or inactive" },
        { status: 404 }
      );
    }

    // Check dropbox capacity
    if (dropbox.currentBoxCount >= dropbox.maxCapacity) {
      return NextResponse.json(
        { error: "Dropbox is full. Please use another dropbox location." },
        { status: 400 }
      );
    }

    // Verify box exists and is available
    const box = await prisma.box.findUnique({
      where: { boxNumber },
    });

    if (!box || !box.isAvailable) {
      return NextResponse.json(
        { error: "Box not found or unavailable" },
        { status: 404 }
      );
    }

    // Find or create an open batch for this dropbox
    let batch = await prisma.batch.findFirst({
      where: {
        dropboxId,
        type: "DROPBOX",
        status: "OPEN",
      },
    });

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          type: "DROPBOX",
          dropboxId,
          status: "OPEN",
        },
      });
    }

    // Create submission with items in a transaction
    const submission = await prisma.$transaction(async (tx) => {
      // Create the submission
      const sub = await tx.submission.create({
        data: {
          userId: user.userId,
          batchId: batch!.id,
          method: "DROPBOX",
          status: "PENDING",
          submissionItems: {
            create: items.map((item: { itemType: string; quantity: number }) => ({
              itemType: item.itemType,
              quantity: item.quantity,
            })),
          },
          dropboxSubmissionDetail: {
            create: {
              dropboxId,
              boxId: box!.id,
            },
          },
        },
        include: {
          submissionItems: true,
          dropboxSubmissionDetail: true,
        },
      });

      // Mark box as unavailable
      await tx.box.update({
        where: { id: box!.id },
        data: { isAvailable: false },
      });

      // Increment dropbox box count
      await tx.dropboxLocation.update({
        where: { id: dropboxId },
        data: { currentBoxCount: { increment: 1 } },
      });

      return sub;
    });

    return NextResponse.json(
      { message: "Submission created successfully", data: submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create dropbox submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
