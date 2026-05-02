"use client";
export default function RewardCard({ name, points }: { name: string; points: number }) {
  return <div><h3>{name}</h3><p>{points} pts</p></div>;
}
