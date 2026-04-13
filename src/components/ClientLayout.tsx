"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CRMUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u && pathname !== "/login") {
      router.push("/login");
    } else {
      setUser(u);
      setChecked(true);
    }
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!checked || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-bg">
        <div className="w-8 h-8 border-2 border-brand-navy-2 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
