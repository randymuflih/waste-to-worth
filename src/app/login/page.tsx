"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CITIZEN" | "ADMIN">("CITIZEN");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#F8FAF9" }}
    >
      <div
        className="max-w-md w-full p-8 rounded-2xl"
        style={{
          background: "#fff",
          border: "1px solid #E5EDE9",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold"
            style={{
              color: "#1A2E27",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            Waste <span style={{ color: "#16C47F" }}>to</span> Worth
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8BAF9E" }}>
            Sign in to your account
          </p>
        </div>

        {error && (
          <div
            className="text-sm mb-4 p-3 rounded-xl text-center"
            style={{
              background: "rgba(231,76,60,0.08)",
              color: "#E74C3C",
              border: "1px solid rgba(231,76,60,0.15)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "#5A8A78" }}
            >
              Login as
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("CITIZEN")}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background:
                    role === "CITIZEN"
                      ? "rgba(22,196,127,0.10)"
                      : "#F8FAF9",
                  color: role === "CITIZEN" ? "#16C47F" : "#8BAF9E",
                  border:
                    role === "CITIZEN"
                      ? "1.5px solid #16C47F"
                      : "1.5px solid #E5EDE9",
                }}
              >
                🏠 Citizen
              </button>
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background:
                    role === "ADMIN"
                      ? "rgba(52,152,219,0.10)"
                      : "#F8FAF9",
                  color: role === "ADMIN" ? "#3498DB" : "#8BAF9E",
                  border:
                    role === "ADMIN"
                      ? "1.5px solid #3498DB"
                      : "1.5px solid #E5EDE9",
                }}
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "#5A8A78" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
              style={{
                border: "1.5px solid #E5EDE9",
                color: "#1A2E27",
                background: "#F8FAF9",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#16C47F";
                e.currentTarget.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5EDE9";
                e.currentTarget.style.background = "#F8FAF9";
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "#5A8A78" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
              style={{
                border: "1.5px solid #E5EDE9",
                color: "#1A2E27",
                background: "#F8FAF9",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#16C47F";
                e.currentTarget.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5EDE9";
                e.currentTarget.style.background = "#F8FAF9";
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #16C47F, #0EA572)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(22,196,127,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(22,196,127,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(22,196,127,0.3)";
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: "#E5EDE9" }} />
            <span className="text-xs" style={{ color: "#8BAF9E" }}>atau akses demo</span>
            <div className="flex-1 h-px" style={{ background: "#E5EDE9" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: "rgba(22,196,127,0.08)",
                color: "#16C47F",
                border: "1.5px solid #16C47F",
              }}
            >
              🏠 Demo User
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: "rgba(52,152,219,0.08)",
                color: "#3498DB",
                border: "1.5px solid #3498DB",
              }}
            >
              🛡️ Demo Admin
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#8BAF9E" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold"
            style={{ color: "#16C47F" }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
