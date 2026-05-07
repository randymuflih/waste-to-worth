"use client";

import { useEffect, useState } from "react";
import { SidebarCitizen } from "@/components/citizen/SidebarCitizen";
import Link from "next/link";
import {
  Zap,
  Bus,
  Wrench,
  CheckCircle2,
  Gift,
  Clock,
  Plus,
  Minus,
  X,
  Copy,
  Info,
} from "lucide-react";

interface Reward {
  id: string;
  name: string;
  type: "TOKEN_LISTRIK" | "TRANSUM" | "VOUCHER_BENGKEL";
  pointsRequired: number;
  stock: number;
  bengkelName: string | null;
}

interface Redemption {
  id: string;
  status: "PENDING" | "APPROVED" | "DELIVERED";
  rewardCode: string | null;
  createdAt: string;
  reward: Reward;
}

interface PointTx {
  id: string;
  amount: number;
  type: "EARN" | "REDEEM";
  createdAt: string;
  referenceId: string | null;
}

const REWARD_META: Record<string, { icon: typeof Zap; desc: string; color: string }> = {
  TOKEN_LISTRIK: { icon: Zap, desc: "Digital utility credit for household electricity.", color: "#f59e0b" },
  TRANSUM: { icon: Bus, desc: "Add balance to your city transit card for eco-friendly travel.", color: "#3b82f6" },
  VOUCHER_BENGKEL: { icon: Wrench, desc: "Professional maintenance service for household appliances.", color: "#6b7280" },
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [pointsTx, setPointsTx] = useState<PointTx[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Success state
  const [successRedemption, setSuccessRedemption] = useState<Redemption | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, rdRes, dRes, ptRes] = await Promise.all([
        fetch("/api/rewards", { cache: "no-store" }),
        fetch("/api/redemptions", { cache: "no-store" }),
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/points", { cache: "no-store" }),
      ]);
      const [rData, rdData, dData, ptData] = await Promise.all([
        rRes.json(), rdRes.json(), dRes.json(), ptRes.json(),
      ]);
      setRewards(rData?.data || []);
      setRedemptions(rdData?.data || []);
      setBalance(dData?.user?.pointsBalance || 0);
      setTotalKg(dData?.stats?.totalSubmittedKg || 0);
      setPointsTx((ptData?.data || []).slice(0, 5));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRedeem = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const res = await fetch("/api/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: selectedReward.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Redemption failed");
      setSelectedReward(null);
      setSuccessRedemption(data?.data || null);
      await fetchData();
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { month: "short", day: "numeric" }) +
    " • " +
    new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // Success view
  if (successRedemption) {
    const meta = REWARD_META[successRedemption.reward.type] || REWARD_META.TOKEN_LISTRIK;
    const Icon = meta.icon;
    return (
      <div className="flex min-h-screen" style={{ background: "#f0fdf4" }}>
        <SidebarCitizen />
        <main className="flex-1 ml-64 min-h-screen flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto px-8 py-16 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#16C47F" }}>
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-w2w-base mb-1">Reward Approved ✔</h1>
            <p className="text-sm text-slate-500 mb-8">
              Your reward is now ready to use. Thank you for your contribution to a cleaner planet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
              {/* Code card */}
              <div className="rounded-2xl border p-6 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Redemption Code</p>
                <div className="rounded-xl px-6 py-5 text-center mb-4" style={{ background: "linear-gradient(135deg, #16C47F, #0d9668)" }}>
                  <p className="text-2xl font-mono font-bold text-white tracking-widest">
                    {successRedemption.rewardCode || "PENDING"}
                  </p>
                </div>
                {successRedemption.rewardCode && (
                  <button
                    onClick={() => handleCopy(successRedemption.rewardCode!)}
                    className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "#16C47F" }}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                )}
                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                  <span>This code is valid for 30 days and can be used once on the provider portal.</span>
                </div>
              </div>

              {/* Reward info */}
              <div className="rounded-2xl border p-6 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: `${meta.color}20` }}>
                    <Icon className="h-5 w-5" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <p className="font-bold">{successRedemption.reward.name}</p>
                    <p className="text-xs" style={{ color: "#16C47F" }}>
                      {successRedemption.reward.pointsRequired} pts redeemed
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-3"><strong>Description</strong><br />{meta.desc}</p>
                <p className="text-xs text-slate-600"><strong>How to Use</strong></p>
                <ol className="text-xs text-slate-500 list-decimal ml-4 mt-1 space-y-1">
                  <li>Login to the provider app or go to an ATM.</li>
                  <li>Select the relevant service and enter your ID.</li>
                  <li>Paste the redemption code into the token field.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => { setSuccessRedemption(null); }}
                className="w-full max-w-sm mx-auto py-3 rounded-xl text-sm font-bold text-white block"
                style={{ background: "#16C47F" }}
              >
                Back to Rewards
              </button>
              <Link href="/history" className="block w-full max-w-sm mx-auto py-3 rounded-xl text-sm font-semibold text-center border border-slate-300 hover:bg-slate-50">
                View History
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAF9" }}>
      <SidebarCitizen />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-w2w-base">Rewards</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage your points, rewards, and redemption activity.
              </p>
            </div>
            <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#d1fae5", color: "#065f46" }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified Reward System
            </span>
          </div>

          {/* Points balance card */}
          <div className="rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #16C47F 0%, #0d9668 100%)" }}>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
              <Gift className="h-32 w-32 text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Available Points</p>
            <p className="text-5xl font-bold text-white mb-1">
              {loading ? "—" : balance.toLocaleString()} <span className="text-xl font-normal">pts</span>
            </p>
            <p className="text-sm text-white/70 mb-1">Earned through verified e-waste contributions.</p>
            <p className="text-xs text-white/50 mb-4">≈ Equivalent to: {totalKg}kg verified e-waste</p>
            <div className="flex gap-3">
              <a href="#rewards-grid" className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-emerald-700">
                Redeem Rewards
              </a>
              <Link href="/history" className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/40 text-white hover:bg-white/10">
                View History
              </Link>
            </div>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: Zap, title: "Electricity Token", desc: "Redeem points for PLN electricity credit." },
              { icon: Bus, title: "Public Transport", desc: "Use points for city transportation credit." },
              { icon: Wrench, title: "Service Voucher", desc: "Redeem repair discounts from partner workshops." },
            ].map((cat) => (
              <div key={cat.title} className="rounded-2xl border bg-white p-5">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "#f0fdf4" }}>
                  <cat.icon className="h-5 w-5" style={{ color: "#16C47F" }} />
                </div>
                <p className="font-bold text-w2w-base mb-1">{cat.title}</p>
                <p className="text-xs text-slate-500">{cat.desc}</p>
              </div>
            ))}
          </div>

          {/* Available Rewards */}
          <div id="rewards-grid" className="mb-8">
            <h2 className="text-xl font-bold text-w2w-base mb-4">Available Rewards</h2>
            {loading ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : rewards.length === 0 ? (
              <p className="text-slate-400 text-sm">No rewards available yet.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {rewards.map((r) => {
                  const meta = REWARD_META[r.type] || REWARD_META.TOKEN_LISTRIK;
                  const Icon = meta.icon;
                  const canAfford = balance >= r.pointsRequired;
                  return (
                    <div key={r.id} className="rounded-2xl border bg-white overflow-hidden">
                      <div className="relative h-32 flex items-center justify-center" style={{ background: `${meta.color}12` }}>
                        <Icon className="h-16 w-16" style={{ color: meta.color, opacity: 0.5 }} />
                        <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#d1fae5", color: "#065f46" }}>
                          {r.pointsRequired} pts
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-sm text-w2w-base mb-0.5">{r.name}</p>
                        <p className="text-xs text-slate-500 mb-3">{meta.desc.slice(0, 50)}...</p>
                        <button
                          onClick={() => { setSelectedReward(r); setRedeemError(null); }}
                          disabled={!canAfford || r.stock <= 0}
                          className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
                          style={{ background: "#16C47F" }}
                        >
                          Redeem
                        </button>
                        <p className="text-xs text-center text-slate-400 mt-1">
                          {r.stock <= 0 ? "Out of stock" : "Available instantly after approval"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: Active Redemptions + Points Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Active Redemptions */}
            <div>
              <h2 className="text-lg font-bold text-w2w-base mb-3">Active Redemptions</h2>
              {redemptions.length === 0 ? (
                <p className="text-sm text-slate-400">No redemptions yet.</p>
              ) : (
                <div className="space-y-2">
                  {redemptions.slice(0, 4).map((rd) => {
                    return (
                      <div key={rd.id} className="rounded-xl border bg-white p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: rd.status === "APPROVED" ? "#d1fae5" : "#fef9c3" }}>
                              {rd.status === "APPROVED" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{rd.reward.name}</p>
                              <p className="text-xs text-slate-400">
                                {rd.status === "APPROVED" ? "Approved" : "Submitted"} {formatDate(rd.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded"
                            style={{
                              background: rd.status === "APPROVED" ? "#d1fae5" : rd.status === "DELIVERED" ? "#dbeafe" : "#fef9c3",
                              color: rd.status === "APPROVED" ? "#065f46" : rd.status === "DELIVERED" ? "#1e40af" : "#92400e",
                            }}
                          >
                            {rd.status === "PENDING" ? "Pending Approval" : rd.status}
                          </span>
                        </div>
                        {rd.rewardCode && (
                          <div className="mt-2 rounded-lg px-3 py-2 bg-slate-50 border flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold">Voucher Code: {rd.rewardCode}</p>
                              {rd.reward.bengkelName && (
                                <p className="text-xs text-slate-400">Partner: {rd.reward.bengkelName}</p>
                              )}
                            </div>
                            <button onClick={() => handleCopy(rd.rewardCode!)} className="text-slate-400 hover:text-slate-600">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Points Activity */}
            <div>
              <h2 className="text-lg font-bold text-w2w-base mb-3">Points Activity</h2>
              {pointsTx.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {pointsTx.map((tx) => (
                    <div key={tx.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: tx.amount > 0 ? "#d1fae5" : "#fee2e2" }}>
                          {tx.amount > 0 ? <Plus className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {tx.type === "EARN" ? "Verified Submission" : "Redeemed Reward"}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: tx.amount > 0 ? "#16C47F" : "#ef4444" }}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount} pts
                        </p>
                        <p className="text-xs text-slate-400">COMPLETED</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-2xl p-5 flex items-center justify-between" style={{ background: "#d1fae5", border: "1px solid #a7f3d0" }}>
            <div>
              <p className="font-bold text-w2w-base">Earn More Points?</p>
              <p className="text-sm text-slate-600">Schedule a pickup for your sorted waste today and get 2x points on all plastic and metal recyclables.</p>
            </div>
            <Link href="/submit/pickup" className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition whitespace-nowrap">
              Schedule Pickup
            </Link>
          </div>
        </div>
      </main>

      {/* Redeem modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 relative">
            <button onClick={() => setSelectedReward(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-w2w-base">Redeem Reward</h3>
              <p className="text-sm font-semibold" style={{ color: "#16C47F" }}>{selectedReward.name}</p>
            </div>
            <div className="rounded-xl border-2 border-dashed px-6 py-4 text-center mb-4">
              <p className="text-4xl font-bold" style={{ color: "#16C47F" }}>
                {selectedReward.pointsRequired}
              </p>
              <p className="text-sm text-slate-500">pts</p>
            </div>
            <p className="text-xs text-center text-slate-500 mb-4">
              Redeem your verified points for {selectedReward.name.toLowerCase()}.
            </p>
            <div className="rounded-xl border p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Current Balance</span>
                <span className="font-semibold">{balance.toLocaleString()} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">After Redemption</span>
                <span className="font-semibold" style={{ color: "#16C47F" }}>
                  {(balance - selectedReward.pointsRequired).toLocaleString()} pts
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Reward code will be generated instantly and sent to your registered email.</span>
            </div>
            {redeemError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 border border-red-200">{redeemError}</p>
            )}
            <button
              onClick={handleRedeem}
              disabled={redeeming || balance < selectedReward.pointsRequired}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 mb-2"
              style={{ background: "#16C47F" }}
            >
              {redeeming ? "Processing..." : "Confirm Redemption"}
            </button>
            <button onClick={() => setSelectedReward(null)} className="w-full py-2 text-sm text-slate-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
