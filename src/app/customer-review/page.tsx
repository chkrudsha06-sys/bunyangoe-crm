"use client";
import { getCurrentUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function CustomerReview() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(getCurrentUser()); }, []);
  if (!user) return null;
  return (
    <div className="p-6 space-y-5">
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "4px solid #8b5cf6" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>📋 고객별심사결과</h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>기능 준비 중입니다.</p>
      </div>
      <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
        <p className="text-sm">추후 구성 예정</p>
      </div>
    </div>
  );
}
