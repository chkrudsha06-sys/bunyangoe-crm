import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({ params }: { params: { code: string } }) {
  let name = "", title = "";
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    const { data } = await supabase.from("contacts")
      .select("name,title").eq("bunyanghoe_number", params.code).single();
    if (data) { name = data.name || ""; title = data.title || ""; }
  } catch {}

  return {
    title: `분양회 | ${name} ${title} | VIP멤버십`,
    description: "분양회 VIP멤버십 대시보드",
    openGraph: {
      title: `분양회 | ${name} ${title}`,
      description: "분양회 VIP멤버십 대시보드",
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
