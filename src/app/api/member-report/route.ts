import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET() {
  // 1. 분양회 회원 (계약완료/예약완료)
  const { data: members } = await supabase.from("contacts")
    .select("id,name,title,intake_route,assigned_to,consultant,contract_date,reservation_date,meeting_result,bunyanghoe_number")
    .in("meeting_result", ["계약완료", "예약완료"])
    .order("bunyanghoe_number");

  // 2. 광고 집행 내역
  const { data: execs } = await supabase.from("ad_executions")
    .select("member_name,channel,execution_amount,vat_amount,refund_amount,payment_date,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward");

  if (!members || !execs) return NextResponse.json({ error: "데이터 조회 실패" }, { status: 500 });

  const eff = (e: any) => (e.vat_amount && e.vat_amount !== e.execution_amount) ? (e.vat_amount || 0) : (e.execution_amount || 0);

  const rows = members.map(m => {
    const myExecs = execs.filter(e => e.member_name === m.name);
    const ht = myExecs.filter(e => e.channel === "하이타겟" && !(e.refund_amount > 0));
    const hog = myExecs.filter(e => (e.channel || "").startsWith("호갱노노") && !(e.refund_amount > 0));
    const lms = myExecs.filter(e => e.channel === "LMS" && !(e.refund_amount > 0));

    return {
      넘버링: m.bunyanghoe_number,
      고객명: m.name,
      직급: m.title,
      유입경로: m.intake_route,
      대협팀담당: m.assigned_to,
      담당컨설턴트: m.consultant,
      계약상태: m.meeting_result,
      "계약/예약일": m.contract_date || m.reservation_date,
      하이타겟_집행액: ht.reduce((s, e) => s + eff(e), 0),
      하이타겟_건수: ht.length,
      하이타겟_상세: ht.map(e => `${eff(e).toLocaleString()}원(${e.payment_date})`).join(" / "),
      HT마일리지: ht.reduce((s, e) => s + (e.hightarget_mileage || 0), 0),
      HT리워드: ht.reduce((s, e) => s + (e.hightarget_reward || 0), 0),
      호갱노노_집행액: hog.reduce((s, e) => s + eff(e), 0),
      호갱노노_건수: hog.length,
      호갱노노_상세: hog.map(e => `${e.channel}:${eff(e).toLocaleString()}원(${e.payment_date})`).join(" / "),
      호갱노노리워드: hog.reduce((s, e) => s + (e.hogaengnono_reward || 0), 0),
      LMS_집행액: lms.reduce((s, e) => s + eff(e), 0),
      LMS_건수: lms.length,
      LMS_상세: lms.map(e => `${eff(e).toLocaleString()}원(${e.payment_date})`).join(" / "),
      LMS리워드: lms.reduce((s, e) => s + (e.lms_reward || 0), 0),
    };
  });

  return NextResponse.json({ total: rows.length, rows });
}
