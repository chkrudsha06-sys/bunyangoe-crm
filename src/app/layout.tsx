import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "분양회 CRM | 광고인㈜ 대외협력팀",
  description: "분양회 VIP 멤버십 영업관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-brand-navy">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
