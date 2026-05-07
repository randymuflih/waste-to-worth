import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const districts = await prisma.district.findMany({
      include: {
        pickupSchedules: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { scheduledDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: districts });
  } catch (error) {
    console.error("Get districts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
