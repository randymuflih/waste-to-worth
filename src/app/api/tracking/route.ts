import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.userId;

    // All user submissions
    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        submissionItems: true,
        dropboxSubmissionDetail: {
          include: { dropbox: true, box: true },
        },
        pickupSubmissionDetail: {
          include: { district: true, pickupSchedule: true },
        },
        batch: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    type Sub = (typeof submissions)[number];
    type SubItem = Sub["submissionItems"][number];

    // Stats
    const inVerification = submissions.filter((s: Sub) => s.status === "PENDING").length;
    const completed = submissions.filter((s: Sub) => s.status === "VERIFIED").length;
    const pendingPoints = submissions
      .filter((s: Sub) => s.status === "PENDING")
      .reduce((sum: number, s: Sub) => sum + s.totalPointsEarned, 0);

    const data = submissions.map((s: Sub) => ({
      id: s.id,
      method: s.method,
      status: s.status,
      totalPointsEarned: s.totalPointsEarned,
      submittedAt: s.submittedAt,
      verifiedAt: s.verifiedAt,
      notes: s.notes,
      batchId: s.batchId,
      batchStatus: s.batch?.status || null,
      batchCollectedAt: s.batch?.collectedAt || null,
      items: s.submissionItems.map((item: SubItem) => ({
        itemType: item.itemType,
        quantity: item.quantity,
        weightKg: item.weightKg,
        pointsEarned: item.pointsEarned,
      })),
      // Dropbox details
      dropboxName: s.dropboxSubmissionDetail?.dropbox?.name || null,
      boxNumber: s.dropboxSubmissionDetail?.box?.boxNumber || null,
      // Pickup details
      pickupDistrict: s.pickupSubmissionDetail?.district?.name || null,
      pickupAddress: s.pickupSubmissionDetail?.address || null,
      pickupDate: s.pickupSubmissionDetail?.pickupSchedule?.scheduledDate || null,
    }));

    return NextResponse.json({
      stats: { inVerification, completed, pendingPoints },
      submissions: data,
    });
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
