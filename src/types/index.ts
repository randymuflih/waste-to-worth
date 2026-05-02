/**
 * Shared TypeScript Types
 *
 * Interfaces for all main entities used across the application.
 */

// ─── User ───────────────────────────────────────────────────────

export type Role = "CITIZEN" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  pointsBalance: number;
  createdAt: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

// ─── District ───────────────────────────────────────────────────

export interface District {
  id: string;
  name: string;
  createdAt: string;
}

// ─── Dropbox ────────────────────────────────────────────────────

export interface DropboxLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  qrCode: string;
  maxCapacity: number;
  currentBoxCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface Box {
  id: string;
  boxNumber: string;
  dropboxId: string;
  isAvailable: boolean;
  createdAt: string;
}

// ─── Schedule ───────────────────────────────────────────────────

export type ScheduleStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED";

export interface PickupSchedule {
  id: string;
  districtId: string;
  scheduledDate: string;
  status: ScheduleStatus;
  createdAt: string;
  district?: District;
}

// ─── Batch ──────────────────────────────────────────────────────

export type BatchType = "DROPBOX" | "PICKUP";
export type BatchStatus = "OPEN" | "COLLECTING" | "VERIFYING" | "COMPLETED";

export interface Batch {
  id: string;
  type: BatchType;
  dropboxId?: string | null;
  pickupScheduleId?: string | null;
  status: BatchStatus;
  collectedAt?: string | null;
  createdAt: string;
  submissions?: Submission[];
}

// ─── Submission ─────────────────────────────────────────────────

export type SubmissionMethod = "DROPBOX" | "PICKUP";
export type SubmissionStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface Submission {
  id: string;
  userId: string;
  batchId: string;
  method: SubmissionMethod;
  status: SubmissionStatus;
  totalPointsEarned: number;
  submittedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  notes?: string | null;
  submissionItems?: SubmissionItem[];
  user?: User;
}

export interface SubmissionItem {
  id: string;
  submissionId: string;
  itemType: string;
  quantity: number;
  weightKg?: number | null;
  pointsEarned: number;
  createdAt: string;
}

// ─── Points ─────────────────────────────────────────────────────

export type TransactionType = "EARN" | "REDEEM";

export interface PointRule {
  id: string;
  itemType: string;
  pointsPerKg: number;
  createdAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  referenceId?: string | null;
  createdAt: string;
}

// ─── Rewards ────────────────────────────────────────────────────

export type RewardType = "TOKEN_LISTRIK" | "TRANSUM" | "VOUCHER_BENGKEL";
export type RedemptionStatus = "PENDING" | "APPROVED" | "DELIVERED";

export interface Reward {
  id: string;
  name: string;
  type: RewardType;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  bengkelName?: string | null;
  bengkelAddress?: string | null;
  bengkelPhone?: string | null;
  createdAt: string;
}

export interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  status: RedemptionStatus;
  rewardCode?: string | null;
  createdAt: string;
  reward?: Reward;
}

// ─── Impact Dashboard ──────────────────────────────────────────

export interface ImpactStats {
  totalWeightKg: number;
  totalContributors: number;
  totalSubmissions: number;
  districtBreakdown: {
    district: string;
    weightKg: number;
    submissions: number;
  }[];
}

// ─── API Response Types ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
