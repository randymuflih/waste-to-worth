/**
 * Prisma Seed Script
 * Seeds the database with initial data for Waste to Worth platform.
 *
 * Data seeded:
 * - 3 Districts (Tamalanrea, Panakkukang, Rappocini)
 * - 2 Dropbox locations in Makassar with lat/lng
 * - 10 Boxes per dropbox (WTW-MKS01-001..010, WTW-MKS02-001..010)
 * - 3 Point rules (smartphone, laptop, kabel)
 * - 3 Rewards (token_listrik, transum, voucher_bengkel)
 * - 1 Admin user (admin@waste2worth.id / admin123)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Districts ────────────────────────────────────────────────
  const districts = await Promise.all(
    ["Tamalanrea", "Panakkukang", "Rappocini"].map((name) =>
      prisma.district.upsert({
        where: { id: name.toLowerCase() },
        update: {},
        create: { id: name.toLowerCase(), name },
      })
    )
  );
  console.log(`✅ Seeded ${districts.length} districts`);

  // ─── Dropbox Locations ────────────────────────────────────────
  const dropboxes = [
    {
      id: "dropbox-mks01",
      name: "Dropbox Tamalanrea",
      address: "Jl. Perintis Kemerdekaan KM 10, Tamalanrea, Makassar",
      lat: -5.1324,
      lng: 119.4881,
      qrCode: "WTW-MKS01",
      districtId: "tamalanrea",
    },
    {
      id: "dropbox-mks02",
      name: "Dropbox Panakkukang",
      address: "Jl. Boulevard, Panakkukang, Makassar",
      lat: -5.1523,
      lng: 119.4384,
      qrCode: "WTW-MKS02",
      districtId: "panakkukang",
    },
  ];

  for (const dropbox of dropboxes) {
    await prisma.dropboxLocation.upsert({
      where: { id: dropbox.id },
      update: { districtId: dropbox.districtId },
      create: dropbox,
    });
  }
  console.log(`✅ Seeded ${dropboxes.length} dropbox locations`);

  // ─── Boxes (10 per dropbox) ───────────────────────────────────
  let boxCount = 0;
  for (const dropbox of dropboxes) {
    for (let i = 1; i <= 10; i++) {
      const boxNumber = `${dropbox.qrCode}-${String(i).padStart(3, "0")}`;
      await prisma.box.upsert({
        where: { boxNumber },
        update: {},
        create: {
          boxNumber,
          dropboxId: dropbox.id,
          isAvailable: true,
        },
      });
      boxCount++;
    }
  }
  console.log(`✅ Seeded ${boxCount} boxes`);

  // ─── Point Rules ──────────────────────────────────────────────
  const pointRules = [
    { itemType: "smartphone", pointsPerKg: 100 },
    { itemType: "laptop", pointsPerKg: 150 },
    { itemType: "kabel", pointsPerKg: 50 },
  ];

  for (const rule of pointRules) {
    await prisma.pointRule.upsert({
      where: { itemType: rule.itemType },
      update: { pointsPerKg: rule.pointsPerKg },
      create: rule,
    });
  }
  console.log(`✅ Seeded ${pointRules.length} point rules`);

  // ─── Rewards ──────────────────────────────────────────────────
  const rewards = [
    {
      name: "Token Listrik 50.000",
      type: "TOKEN_LISTRIK" as const,
      pointsRequired: 500,
      stock: 50,
    },
    {
      name: "Kredit Trans Urban Makassar",
      type: "TRANSUM" as const,
      pointsRequired: 200,
      stock: 100,
    },
    {
      name: "Voucher Bengkel Elektronik",
      type: "VOUCHER_BENGKEL" as const,
      pointsRequired: 300,
      stock: 30,
      bengkelName: "Bengkel Elektronik Jaya",
      bengkelAddress: "Jl. AP Pettarani No. 18, Makassar",
      bengkelPhone: "08114567890",
    },
  ];

  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: { id: reward.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: reward.name.toLowerCase().replace(/\s+/g, "-"),
        ...reward,
      },
    });
  }
  console.log(`✅ Seeded ${rewards.length} rewards`);

  // ─── District Admins ──────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminData = [
    {
      name: "Admin Tamalanrea",
      email: "admin.tamalanrea@waste2worth.id",
      districtId: "tamalanrea",
    },
    {
      name: "Admin Panakkukang",
      email: "admin.panakkukang@waste2worth.id",
      districtId: "panakkukang",
    },
    {
      name: "Admin Rappocini",
      email: "admin.rappocini@waste2worth.id",
      districtId: "rappocini",
    },
  ];

  for (const admin of adminData) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: { districtId: admin.districtId },
      create: {
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: "ADMIN",
        districtId: admin.districtId,
        phone: `0811000000${adminData.indexOf(admin) + 1}`,
      },
    });
  }
  console.log(`✅ Seeded ${adminData.length} district admins`);

  // ─── Regular Users (Citizens/Students) ────────────────────────
  const usersData = [
    {
      name: "Budi Mahasiswa",
      email: "budi@student.unhas.ac.id",
      districtId: "tamalanrea",
      phone: "081234567890",
    },
    {
      name: "Siti Pengguna",
      email: "siti@gmail.com",
      districtId: "panakkukang",
      phone: "081234567891",
    },
    {
      name: "Andi Umum",
      email: "andi@outlook.com",
      districtId: null,
      phone: "081234567892",
    },
  ];

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { districtId: user.districtId },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword, // admin123
        role: "CITIZEN",
        districtId: user.districtId,
        phone: user.phone,
        pointsBalance: 100, // Beri saldo awal 100 poin untuk testing
      },
    });
  }
  console.log(`✅ Seeded ${usersData.length} regular users`);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
