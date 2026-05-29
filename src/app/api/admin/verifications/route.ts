import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function getAdminDistrictScopeFromEmail(email: string): string | null {
  const localPart = email.split("@")[0]?.toLowerCase() || "";
  if (!localPart.startsWith("admin")) return null;
  const districtKey = normalizeText(localPart.replace(/^admin/, ""));
  return districtKey || null;
}

function getSubmissionDistrictKey(
  submission: {
    method: "DROPBOX" | "PICKUP";
    dropboxSubmissionDetail?: {
      dropbox?: { name: string; address: string };
    } | null;
    pickupSubmissionDetail?: {
      district?: { name: string };
    } | null;
  },
  districtKeys: string[]
): string | null {
  if (submission.method === "PICKUP") {
    const pickupDistrict = submission.pickupSubmissionDetail?.district?.name;
    return pickupDistrict ? normalizeText(pickupDistrict) : null;
  }

  const dropboxText = normalizeText(
    `${submission.dropboxSubmissionDetail?.dropbox?.name || ""} ${submission.dropboxSubmissionDetail?.dropbox?.address || ""}`
  );
  return districtKeys.find((districtKey) => dropboxText.includes(districtKey)) || null;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const pendingSubmissions = await prisma.submission.findMany({
      where: {
        status: "PENDING",
        batch: { status: "VERIFYING" },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        submissionItems: true,
        dropboxSubmissionDetail: {
          include: {
            dropbox: { select: { id: true, name: true, address: true } },
            box: { select: { id: true, boxNumber: true } },
          },
        },
        pickupSubmissionDetail: {
          include: {
            district: { select: { id: true, name: true } },
            pickupSchedule: true,
          },
        },
        batch: { select: { id: true, type: true, status: true, createdAt: true } },
      },
      orderBy: { submittedAt: "asc" },
    });

    const districts = await prisma.district.findMany({
      select: { name: true },
    });
    const districtKeys = districts.map((district: { name: string }) => normalizeText(district.name));
    const adminDistrictScope = getAdminDistrictScopeFromEmail(authUser.email);
    if (!adminDistrictScope) {
      return NextResponse.json(
        {
          error:
            "Admin account must be district-scoped (example: admin.tamalanrea@...)",
        },
        { status: 403 }
      );
    }

    type PendingSub = (typeof pendingSubmissions)[number];
    const scopedPendingSubmissions = pendingSubmissions.filter((submission: PendingSub) => {
      const submissionDistrict = getSubmissionDistrictKey(submission, districtKeys);
      return submissionDistrict === adminDistrictScope;
    });

    const pointRules = await prisma.pointRule.findMany({
      select: { itemType: true, pointsPerKg: true },
    });
    type PRule = (typeof pointRules)[number];
    const pointRulesMap = Object.fromEntries(
      pointRules.map((rule: PRule) => [rule.itemType.toLowerCase(), rule.pointsPerKg])
    );

    return NextResponse.json({
      data: scopedPendingSubmissions,
      meta: {
        pendingCount: scopedPendingSubmissions.length,
        hasPointRules: pointRules.length > 0,
        pointRulesMap,
        adminDistrictScope,
      },
    });
  } catch (error) {
    console.error("Get admin verifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { submissionId, action, notes, itemWeights } = body as {
      submissionId?: string;
      action?: "verify" | "reject";
      notes?: string;
      itemWeights?: { itemId: string; weightKg: number }[];
    };

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: "submissionId and action are required" },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        submissionItems: true,
        dropboxSubmissionDetail: {
          include: {
            dropbox: { select: { name: true, address: true } },
          },
        },
        pickupSubmissionDetail: {
          include: {
            district: { select: { name: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING submissions can be processed" },
        { status: 400 }
      );
    }

    const districts = await prisma.district.findMany({
      select: { name: true },
    });
    const districtKeys = districts.map((district: { name: string }) => normalizeText(district.name));
    const adminDistrictScope = getAdminDistrictScopeFromEmail(authUser.email);
    if (!adminDistrictScope) {
      return NextResponse.json(
        {
          error:
            "Admin account must be district-scoped (example: admin.tamalanrea@...)",
        },
        { status: 403 }
      );
    }
    const submissionDistrict = getSubmissionDistrictKey(submission, districtKeys);
    if (submissionDistrict !== adminDistrictScope) {
      return NextResponse.json(
        { error: "You can only verify submissions from your district scope" },
        { status: 403 }
      );
    }

    if (action === "reject") {
      const rejected = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: "REJECTED",
          verifiedAt: new Date(),
          verifiedBy: authUser.userId,
          notes: notes || "Rejected by admin",
        },
      });
      return NextResponse.json({ message: "Submission rejected", data: rejected });
    }

    if (!Array.isArray(itemWeights) || itemWeights.length === 0) {
      return NextResponse.json(
        { error: "itemWeights are required for verification" },
        { status: 400 }
      );
    }

    const itemWeightsMap = new Map(
      itemWeights.map((item: { itemId: string; weightKg: number }) => [item.itemId, Number(item.weightKg)])
    );

    const pointRules = await prisma.pointRule.findMany({
      select: { itemType: true, pointsPerKg: true },
    });
    const ruleMap = new Map(
      pointRules.map((rule: { itemType: string; pointsPerKg: number }) => [rule.itemType.toLowerCase(), rule.pointsPerKg])
    );

    const unknownRuleItem = submission.submissionItems.find(
      (item: { itemType: string }) => !ruleMap.has(item.itemType.toLowerCase())
    );
    if (unknownRuleItem) {
      return NextResponse.json(
        {
          error: `Missing point rule for item type '${unknownRuleItem.itemType}'. Please seed point rules first.`,
        },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verified = await prisma.$transaction(async (tx: any) => {
      let totalPoints = 0;

      for (const item of submission.submissionItems) {
        const weightKg = itemWeightsMap.get(item.id);
        if (typeof weightKg !== "number" || weightKg <= 0) {
          throw new Error(`Invalid weight for item '${item.itemType}'`);
        }
        const pointsPerKg = (ruleMap.get(item.itemType.toLowerCase()) ?? 0) as number;
        const earnedPoints = Math.floor(pointsPerKg * weightKg);
        totalPoints += earnedPoints;

        await tx.submissionItem.update({
          where: { id: item.id },
          data: {
            weightKg,
            pointsEarned: earnedPoints,
          },
        });
      }

      const updatedSubmission = await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: "VERIFIED",
          totalPointsEarned: totalPoints,
          verifiedAt: new Date(),
          verifiedBy: authUser.userId,
          notes: notes || null,
        },
      });

      if (totalPoints > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: submission.userId,
            amount: totalPoints,
            type: "EARN",
            referenceId: submissionId,
          },
        });

        await tx.user.update({
          where: { id: submission.userId },
          data: { pointsBalance: { increment: totalPoints } },
        });
      }

      return { ...updatedSubmission, totalPoints };
    });

    // Auto-complete batch if all submissions are verified/rejected
    if (submission.batchId) {
      const remainingPending = await prisma.submission.count({
        where: {
          batchId: submission.batchId,
          status: "PENDING",
        },
      });

      if (remainingPending === 0) {
        await prisma.batch.update({
          where: { id: submission.batchId },
          data: { status: "COMPLETED" },
        });
      }
    }

    return NextResponse.json({
      message: "Submission verified",
      data: verified,
    });
  } catch (error) {
    console.error("Verify submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
