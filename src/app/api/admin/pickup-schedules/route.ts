import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET: List pickup schedules with registrations
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const schedules = await prisma.pickupSchedule.findMany({
      include: {
        district: { select: { id: true, name: true } },
        pickupSubmissionDetails: {
          include: {
            submission: {
              include: {
                user: { select: { name: true, email: true } },
                submissionItems: { select: { itemType: true, quantity: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    type ScheduleWithDetails = (typeof schedules)[number];
    type DetailWithSubmission = ScheduleWithDetails["pickupSubmissionDetails"][number];

    const data = schedules.map((s: ScheduleWithDetails) => ({
      id: s.id,
      districtId: s.districtId,
      districtName: s.district.name,
      scheduledDate: s.scheduledDate,
      status: s.status,
      createdAt: s.createdAt,
      registrations: s.pickupSubmissionDetails.map((d: DetailWithSubmission) => ({
        id: d.id,
        address: d.address,
        submissionId: d.submissionId,
        userName: d.submission.user.name,
        userEmail: d.submission.user.email,
        status: d.submission.status,
        items: d.submission.submissionItems,
      })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get pickup schedules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a new pickup schedule
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { districtId, scheduledDate } = body;

    if (!districtId || !scheduledDate) {
      return NextResponse.json(
        { error: "districtId and scheduledDate are required" },
        { status: 400 }
      );
    }

    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      return NextResponse.json({ error: "District not found" }, { status: 404 });
    }

    const schedule = await prisma.pickupSchedule.create({
      data: {
        districtId,
        scheduledDate: new Date(scheduledDate),
        status: "UPCOMING",
      },
      include: { district: { select: { name: true } } },
    });

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    console.error("Create pickup schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update schedule status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { scheduleId, status } = body;

    if (!scheduleId || !status) {
      return NextResponse.json({ error: "scheduleId and status required" }, { status: 400 });
    }

    if (!["UPCOMING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.pickupSchedule.update({
      where: { id: scheduleId },
      data: { status },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update pickup schedule error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
