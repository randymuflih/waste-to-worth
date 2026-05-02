"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/batches", label: "Batches" },
  { href: "/admin/dropboxes", label: "Dropboxes" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/rewards", label: "Rewards" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-slate-800 text-white">
        <div className="p-6">
          <h2 className="text-lg font-bold text-emerald-400">W2W Admin</h2>
        </div>
        <nav className="px-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href} className={`block px-4 py-2 rounded text-sm ${pathname === item.href ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-slate-700"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
