import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "분양회 CRM | 광고인㈜ 대외협력팀",
  description: "분양회 VIP 멤버십 영업관리 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            var s=localStorage.getItem("crm_dark_mode");
            if(s!=="false") document.documentElement.setAttribute("data-theme","dark");
          })();
        `}}/>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
