/**
 * Points Calculation Logic
 *
 * Calculates points earned based on item type and weight,
 * using configurable point rules from the database.
 */

import prisma from "./prisma";

/**
 * Calculate points for a given item type and weight.
 * Queries the PointRule table for the matching item type.
 *
 * @param itemType - e.g. "smartphone", "laptop", "kabel"
 * @param weightKg - weight in kilograms
 * @returns points earned, or 0 if no rule found
 */
export async function calculatePoints(
  itemType: string,
  weightKg: number
): Promise<number> {
  const rule = await prisma.pointRule.findUnique({
    where: { itemType: itemType.toLowerCase() },
  });

  if (!rule) {
    console.warn(`⚠️ No point rule found for item type: ${itemType}`);
    return 0;
  }

  // Points = pointsPerKg × weight, rounded down to integer
  return Math.floor(rule.pointsPerKg * weightKg);
}

/**
 * Calculate points for multiple items in a submission.
 *
 * @param items - array of { itemType, weightKg } pairs
 * @returns total points earned across all items
 */
export async function calculateSubmissionPoints(
  items: { itemType: string; weightKg: number }[]
): Promise<{ total: number; breakdown: { itemType: string; weightKg: number; points: number }[] }> {
  const breakdown = await Promise.all(
    items.map(async (item) => {
      const points = await calculatePoints(item.itemType, item.weightKg);
      return {
        itemType: item.itemType,
        weightKg: item.weightKg,
        points,
      };
    })
  );

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { total, breakdown };
}

/**
 * Get all point rules from the database.
 */
export async function getAllPointRules() {
  return prisma.pointRule.findMany({
    orderBy: { itemType: "asc" },
  });
}
