"use client";

import { useEffect, useState } from "react";
import { SidebarCitizen } from "@/components/citizen/SidebarCitizen";
import { ChevronDown, MapPin, Plus, Trash2, Truck, CheckCircle2 } from "lucide-react";

const ITEM_OPTIONS = ["smartphone", "charger", "laptop", "kabel", "tablet"];

interface Schedule {
  id: string;
  scheduledDate: string;
  status: string;
}

interface District {
  id: string;
  name: string;
  pickupSchedules: Schedule[];
}

type FlowState = "form" | "review" | "verifying" | "completed";

interface DraftPickup {
  districtId: string;
  districtName: string;
  pickupScheduleId: string;
  scheduledDate: string;
  address: string;
  items: { itemType: string; quantity: number }[];
}

export default function PickupSubmitPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<{ itemType: string; quantity: number }[]>([
    { itemType: "smartphone", quantity: 1 },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<FlowState>("form");
  const [submissionId, setSubmissionId] = useState("");

  const selectedDistrict = districts.find((d) => d.id === districtId);
  const selectedSchedule = selectedDistrict?.pickupSchedules?.find((s) => s.id === scheduleId);

  useEffect(() => {
    fetch("/api/districts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data || [];
        setDistricts(list);
        if (list.length > 0) {
          setDistrictId(list[0].id);
          if (list[0].pickupSchedules?.length > 0) {
            setScheduleId(list[0].pickupSchedules[0].id);
          }
        }
      })
      .catch(() => setError("Gagal memuat data distrik"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedDistrict?.pickupSchedules?.length) {
      setScheduleId(selectedDistrict.pickupSchedules[0].id);
    } else {
      setScheduleId("");
    }
  }, [districtId, selectedDistrict]);

  const addItem = () => setItems((p) => [...p, { itemType: "tablet", quantity: 1 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: "itemType" | "quantity", val: string | number) =>
    setItems((p) => p.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));

  const draft: DraftPickup | null =
    districtId && scheduleId && address.trim()
      ? {
          districtId,
          districtName: selectedDistrict?.name || "",
          pickupScheduleId: scheduleId,
          scheduledDate: selectedSchedule?.scheduledDate || "",
          address: address.trim(),
          items,
        }
      : null;

  const handleSubmit = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          districtId: draft.districtId,
          pickupScheduleId: draft.pickupScheduleId,
          address: draft.address,
          items: draft.items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission gagal");
      setSubmissionId(data?.data?.id || "");
      setState("verifying");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission gagal");
    } finally {
      setSaving(false);
    }
  };

  const handleStartNew = () => {
    setState("form");
    setAddress("");
    setItems([{ itemType: "smartphone", quantity: 1 }]);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: "#F8FAF9" }}>
        <SidebarCitizen />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAF9" }}>
      <SidebarCitizen />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {state === "form" && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-w2w-accent mb-1">
                New Submission
              </p>
              <h1 className="text-4xl font-bold text-w2w-base mb-6">Schedule a Pickup</h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                  {/* District */}
                  <div>
                    <label className="text-sm font-semibold text-w2w-base block mb-2">District</label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 pr-10 text-sm text-w2w-base focus:outline-none focus:ring-2 focus:ring-w2w-accent/40"
                        value={districtId}
                        onChange={(e) => setDistrictId(e.target.value)}
                      >
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Pickup Schedule */}
                  <div>
                    <label className="text-sm font-semibold text-w2w-base block mb-2">Pickup Schedule</label>
                    {(selectedDistrict?.pickupSchedules?.length || 0) === 0 ? (
                      <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
                        Tidak ada jadwal pickup tersedia untuk distrik ini.
                      </p>
                    ) : (
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 pr-10 text-sm text-w2w-base focus:outline-none focus:ring-2 focus:ring-w2w-accent/40"
                          value={scheduleId}
                          onChange={(e) => setScheduleId(e.target.value)}
                        >
                          {selectedDistrict?.pickupSchedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {new Date(s.scheduledDate).toLocaleDateString("id-ID", {
                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                              })} — {s.status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-sm font-semibold text-w2w-base block mb-2">Alamat Lengkap Pickup</label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap untuk dijemput"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-w2w-base focus:outline-none focus:ring-2 focus:ring-w2w-accent/40 resize-none"
                    />
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-w2w-base">E-Waste Items</label>
                      <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-w2w-accent hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_36px] gap-2 items-end">
                          <div className="relative">
                            <select
                              className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 pr-10 text-sm text-w2w-base focus:outline-none focus:ring-2 focus:ring-w2w-accent/40"
                              value={item.itemType}
                              onChange={(e) => updateItem(idx, "itemType", e.target.value)}
                            >
                              {ITEM_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                            className="rounded-xl border border-slate-300 px-3 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-w2w-accent/40"
                          />
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="flex items-center justify-center h-[46px] text-red-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">{error}</p>
                  )}
                </div>

                {/* Summary sidebar */}
                <div className="border border-slate-200 bg-white rounded-2xl p-5 h-fit space-y-4">
                  <h3 className="font-semibold text-w2w-base">Pickup Summary</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">District</span>
                      <span className="font-medium">{selectedDistrict?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Schedule</span>
                      <span className="font-medium text-right text-xs">
                        {selectedSchedule
                          ? new Date(selectedSchedule.scheduledDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Items</span>
                      <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setState("review")}
                    disabled={!draft || !scheduleId}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition"
                    style={{ background: "#16C47F" }}
                  >
                    Review Submission
                  </button>
                </div>
              </div>
            </section>
          )}

          {state === "review" && draft && (
            <section className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-w2w-base mb-6">Review Pickup</h2>
              <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <MapPin className="h-5 w-5 text-w2w-accent" />
                  <div>
                    <p className="font-semibold">{draft.districtName}</p>
                    <p className="text-sm text-slate-500">{draft.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pb-3 border-b">
                  <Truck className="h-5 w-5 text-w2w-accent" />
                  <div>
                    <p className="font-semibold">Jadwal Pickup</p>
                    <p className="text-sm text-slate-500">
                      {new Date(draft.scheduledDate).toLocaleDateString("id-ID", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-2">Items</p>
                  {draft.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span className="capitalize">{item.itemType}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">{error}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setState("form")}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-300 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "#16C47F" }}
                  >
                    {saving ? "Submitting..." : "Confirm Pickup"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {state === "verifying" && (
            <section className="max-w-md mx-auto text-center py-16">
              <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-w2w-base mb-2">Pickup Submitted!</h2>
              <p className="text-sm text-slate-500 mb-2">
                Submission ID: <span className="font-mono font-semibold">{submissionId.slice(0, 12)}</span>
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Tim kami akan menjemput e-waste kamu sesuai jadwal. Pantau status di dashboard.
              </p>
              <button
                onClick={handleStartNew}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "#16C47F" }}
              >
                Submit Another Pickup
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
