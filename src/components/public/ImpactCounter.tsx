"use client";
export default function ImpactCounter({ label, value }: { label: string; value: number }) {
  return <div><h3>{label}</h3><p>{value}</p></div>;
}
