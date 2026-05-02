/**
 * GET /api/impact — Public impact dashboard data
 *
 * No authentication required.
 * Returns aggregate statistics for public display.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Total weight collected (from verified submissions)
    const weightResult = await prisma.submissionItem.aggregate({
      _sum: { weightKg: true },
      where: {
        submission: { status: "VERIFIED" },
      },
    });

    // Total unique contributors
    const contributorsResult = await prisma.submission.findMany({
      where: { status: "VERIFIED" },
      select: { userId: true },
      distinct: ["userId"],
    });

    // Total verified submissions
    const submissionCount = await prisma.submission.count({
      where: { status: "VERIFIED" },
    });

    // District breakdown (from pickup submissions)
    const districts = await prisma.district.findMany({
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

    const districtBreakdown = districts.map((d) => {
      const verifiedSubmissions = d.pickupSubmissionDetails.filter(
        (psd) => psd.submission.status === "VERIFIED"
      );
      const totalWeight = verifiedSubmissions.reduce((sum, psd) => {
        return (
          sum +
          psd.submission.submissionItems.reduce(
            (s, item) => s + (item.weightKg || 0),
            0
          )
        );
      }, 0);

      return {
        district: d.name,
        weightKg: Math.round(totalWeight * 100) / 100,
        submissions: verifiedSubmissions.length,
      };
    });

    // Environmental impact estimates
    const totalWeight = weightResult._sum.weightKg || 0;
    const environmentalImpact = {
      co2Prevented: Math.round(totalWeight * 2.5 * 100) / 100, // ~2.5 kg CO₂ per kg e-waste
      waterSaved: Math.round(totalWeight * 10 * 100) / 100, // ~10L water saved per kg
      landfillDiverted: Math.round(totalWeight * 100) / 100,
    };

    return NextResponse.json({
      data: {
        totalWeightKg: Math.round(totalWeight * 100) / 100,
        totalContributors: contributorsResult.length,
        totalSubmissions: submissionCount,
        districtBreakdown,
        environmentalImpact,
      },
    });
  } catch (error) {
    console.error("Impact data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
