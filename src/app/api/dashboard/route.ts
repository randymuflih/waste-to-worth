/**
 * GET /api/dashboard
 *
 * Returns all data needed for the citizen dashboard:
 * - User info (name, points)
 * - Stats (total submitted kg, active submissions, points earned this month)
 * - Active submissions with items & progress
 * - Community impact (platform totals, district activity)
 */

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

    // ── User info ──────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, pointsBalance: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Points earned this month ───────────────────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pointsThisMonth = await prisma.pointTransaction.aggregate({
      where: {
        userId,
        type: "EARN",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // ── Total submitted weight (kg) — all verified submissions ─
    const totalWeight = await prisma.submissionItem.aggregate({
      where: {
        submission: { userId, status: "VERIFIED" },
      },
      _sum: { weightKg: true },
    });

    // ── Active submissions (PENDING status) ────────────────────
    const activeSubmissions = await prisma.submission.findMany({
      where: { userId, status: "PENDING" },
      include: {
        submissionItems: true,
        dropboxSubmissionDetail: {
          include: { dropbox: true },
        },
        pickupSubmissionDetail: {
          include: { district: true },
        },
        batch: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    });

    const activeCount = await prisma.submission.count({
      where: { userId, status: "PENDING" },
    });

    // ── Personal impact (total weight of verified items) ───────
    const personalImpact = await prisma.submissionItem.aggregate({
      where: {
        submission: { userId, status: "VERIFIED" },
      },
      _sum: { weightKg: true },
    });

    // ── Community: total platform collection ───────────────────
    const platformCollection = await prisma.submissionItem.aggregate({
      where: {
        submission: { status: "VERIFIED" },
      },
      _sum: { weightKg: true },
    });

    // ── Community: total contributors ──────────────────────────
    const contributorCount = await prisma.user.count({
      where: { role: "CITIZEN" },
    });

    // ── Community: district activity ───────────────────────────
    const districtActivity = await prisma.district.findMany({
      include: {
        pickupSubmissionDetails: {
          include: {
            submission: {
              include: { submissionItems: true },
            },
          },
        },
      },
    });

    type DistAct = (typeof districtActivity)[number];
    type DPSD = DistAct["pickupSubmissionDetails"][number];
    type DSItem = DPSD["submission"]["submissionItems"][number];
    type ActiveSub = (typeof activeSubmissions)[number];
    type ActiveSubItem = ActiveSub["submissionItems"][number];

    const districtStats = districtActivity.map((d: DistAct) => {
      const totalKg = d.pickupSubmissionDetails.reduce((sum: number, psd: DPSD) => {
        const itemWeight = psd.submission.submissionItems.reduce(
          (s: number, item: DSItem) => s + (item.weightKg || 0),
          0
        );
        return sum + itemWeight;
      }, 0);
      return { name: d.name, totalKg: Math.round(totalKg * 10) / 10 };
    });

    // Sort by totalKg descending
    districtStats.sort((a: { name: string; totalKg: number }, b: { name: string; totalKg: number }) => b.totalKg - a.totalKg);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        pointsBalance: user.pointsBalance,
      },
      stats: {
        totalPoints: user.pointsBalance,
        pointsThisMonth: pointsThisMonth._sum.amount || 0,
        totalSubmittedKg: Math.round((totalWeight._sum.weightKg || 0) * 10) / 10,
        activeSubmissions: activeCount,
        personalImpactKg: Math.round((personalImpact._sum.weightKg || 0) * 10) / 10,
      },
      activeSubmissions: activeSubmissions.map((s: ActiveSub) => ({
        id: s.id,
        method: s.method,
        status: s.status,
        submittedAt: s.submittedAt,
        batchStatus: s.batch?.status || null,
        items: s.submissionItems.map((item: ActiveSubItem) => ({
          itemType: item.itemType,
          quantity: item.quantity,
          weightKg: item.weightKg,
        })),
        location:
          s.method === "DROPBOX"
            ? s.dropboxSubmissionDetail?.dropbox?.name || "Dropbox"
            : s.pickupSubmissionDetail?.district?.name || "Pickup",
      })),
      community: {
        platformCollectionKg:
          Math.round((platformCollection._sum.weightKg || 0) * 10) / 10,
        contributorCount,
        districtActivity: districtStats.slice(0, 4),
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
