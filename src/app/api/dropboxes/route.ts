/**
 * GET  /api/dropboxes — List all dropbox locations
 * POST /api/dropboxes — Create a new dropbox location (admin only)
 *
 * Includes capacity status and box availability.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// ─── GET: List dropbox locations ────────────────────────────────
export async function GET() {
  try {
    const dropboxes = await prisma.dropboxLocation.findMany({
      include: {
        boxes: {
          select: {
            id: true,
            boxNumber: true,
            isAvailable: true,
          },
        },
        _count: {
          select: { batches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Add capacity info
    const data = dropboxes.map((d) => ({
      ...d,
      capacityPercent: Math.round((d.currentBoxCount / d.maxCapacity) * 100),
      isFull: d.currentBoxCount >= d.maxCapacity,
      isWarning: d.currentBoxCount >= d.maxCapacity * 0.75,
      availableBoxes: d.boxes.filter((b) => b.isAvailable),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Get dropboxes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new dropbox (admin) ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, lat, lng, qrCode, boxCount } = body;

    if (!name || !address || !lat || !lng || !qrCode) {
      return NextResponse.json(
        { error: "name, address, lat, lng, and qrCode are required" },
        { status: 400 }
      );
    }

    // Create dropbox with boxes
    const dropbox = await prisma.dropboxLocation.create({
      data: {
        name,
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        qrCode,
        boxes: {
          create: Array.from({ length: boxCount || 10 }, (_, i) => ({
            boxNumber: `${qrCode}-${String(i + 1).padStart(3, "0")}`,
          })),
        },
      },
      include: { boxes: true },
    });

    return NextResponse.json(
      { message: "Dropbox created", data: dropbox },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create dropbox error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
