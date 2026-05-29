"use client";

import { useEffect, useState } from "react";

interface Registration {
  id: string;
  address: string;
  userName: string;
  userEmail: string;
  status: string;
  items: { itemType: string; quantity: number }[];
}

interface Schedule {
  id: string;
  districtId: string;
  districtName: string;
  scheduledDate: string;
  status: string;
  registrations: Registration[];
}

interface District {
  id: string;
  name: string;
}

export default function AdminPickupPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New schedule form
  const [showForm, setShowForm] = useState(false);
  const [newDistrictId, setNewDistrictId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [creating, setCreating] = useState(false);

  // Expanded schedule
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, distRes] = await Promise.all([
        fetch("/api/admin/pickup-schedules", { cache: "no-store" }),
        fetch("/api/districts", { cache: "no-store" }),
      ]);
      const schedData = await schedRes.json();
      const distData = await distRes.json();
      setSchedules(schedData?.data || []);
      const dList = distData?.data || [];
      setDistricts(dList);
      if (dList.length > 0 && !newDistrictId) setNewDistrictId(dList[0].id);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newDistrictId || !newDate) return;
    setCreating(true);
    setError(null);
    try {
      const scheduledDate = `${newDate}T${newTime}:00`;
      const res = await fetch("/api/admin/pickup-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId: newDistrictId, scheduledDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSuccess("Jadwal pickup berhasil dibuat!");
      setShowForm(false);
      setNewDate("");
      setNewTime("09:00");
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (scheduleId: string, status: string) => {
    setActionLoading(scheduleId);
    setError(null);
    try {
      const res = await fetch("/api/admin/pickup-schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSuccess(`Status diubah ke ${status}`);
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const statusColor = (s: string) => {
    if (s === "UPCOMING") return { bg: "#fef9c3", text: "#92400e" };
    if (s === "IN_PROGRESS") return { bg: "#dbeafe", text: "#1e40af" };
    return { bg: "#d1fae5", text: "#065f46" };
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pickup Schedules</h1>
          <p className="text-gray-600">Buat jadwal pickup dan lihat pendaftar.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-4 py-2 rounded bg-slate-200 text-sm font-medium" disabled={loading}>
            Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded text-white text-sm font-semibold" style={{ background: "#10b981" }}>
            {showForm ? "Cancel" : "+ New Schedule"}
          </button>
        </div>
      </header>

      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}
      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">{success}</div>}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold">Create Pickup Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">District</label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={newDistrictId}
                onChange={(e) => setNewDistrictId(e.target.value)}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Tanggal</label>
              <input
                type="date"
                className="w-full rounded border px-3 py-2 text-sm"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Jam</label>
              <input
                type="time"
                className="w-full rounded border px-3 py-2 text-sm"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={creating || !newDate}
                className="w-full py-2 rounded text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: "#10b981" }}
              >
                {creating ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : schedules.length === 0 ? (
        <p className="text-gray-400 text-sm">Belum ada jadwal pickup. Klik &quot;+ New Schedule&quot; untuk membuat.</p>
      ) : (
        <div className="space-y-4">
          {schedules.map((sched) => {
            const sc = statusColor(sched.status);
            const isExpanded = expandedId === sched.id;
            return (
              <div key={sched.id} className="rounded-xl border bg-white overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sched.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-bold text-base">{sched.districtName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sched.scheduledDate).toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                      {" • "}
                      {new Date(sched.scheduledDate).toLocaleTimeString("id-ID", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500">
                      {sched.registrations.length} pendaftar
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {sched.status}
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4">
                    {/* Status actions */}
                    <div className="flex gap-2">
                      {sched.status === "UPCOMING" && (
                        <button
                          onClick={() => handleStatusChange(sched.id, "IN_PROGRESS")}
                          disabled={actionLoading === sched.id}
                          className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 disabled:opacity-50"
                        >
                          {actionLoading === sched.id ? "..." : "Mulai Pickup"}
                        </button>
                      )}
                      {sched.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => handleStatusChange(sched.id, "COMPLETED")}
                          disabled={actionLoading === sched.id}
                          className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 disabled:opacity-50"
                        >
                          {actionLoading === sched.id ? "..." : "Selesai Pickup"}
                        </button>
                      )}
                    </div>

                    {/* Registrations */}
                    {sched.registrations.length === 0 ? (
                      <p className="text-sm text-gray-400">Belum ada yang mendaftar.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Daftar Pendaftar:</p>
                        {sched.registrations.map((reg) => (
                          <div key={reg.id} className="rounded-lg border p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <p className="font-semibold text-sm">{reg.userName}</p>
                                <p className="text-xs text-gray-400">{reg.userEmail}</p>
                              </div>
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded"
                                style={{
                                  background: reg.status === "VERIFIED" ? "#d1fae5" : reg.status === "REJECTED" ? "#fee2e2" : "#fef9c3",
                                  color: reg.status === "VERIFIED" ? "#065f46" : reg.status === "REJECTED" ? "#991b1b" : "#92400e",
                                }}
                              >
                                {reg.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">📍 {reg.address}</p>
                            <p className="text-xs text-gray-500">
                              Items: {reg.items.map((i) => `${i.itemType} x${i.quantity}`).join(", ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
