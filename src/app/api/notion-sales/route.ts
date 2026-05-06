import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NOTION_API = "https://api.notion.com/v1";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const DATABASES: { name: string; dbId: string }[] = [
  { name: "조승현", dbId: "31c4416c5bcb81d28bbbd851fbf8a508" },
  { name: "백선중", dbId: "31c4416c5bcb8160b945c9ead41316d1" },
  { name: "박나라", dbId: "31c4416c5bcb81d299edcd8a1e623720" },
  { name: "박민경", dbId: "31c4416c5bcb815f904dce2e4b1bdd85" },
  { name: "강아름", dbId: "31c4416c5bcb819c8006cd61c6c784ec" },
  { name: "전정훈", dbId: "31c4416c5bcb8184a05ae4c3417193ba" },
];

function getTextProp(page: any, name: string): string {
  const p = page.properties[name];
  if (!p) return "";
  if (p.type === "title") return p.title?.map((t: any) => t.plain_text).join("") || "";
  if (p.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join("") || "";
  if (p.type === "select") return p.select?.name || "";
  if (p.type === "multi_select") return (p.multi_select || []).map((s: any) => s.name).join(", ");
  if (p.type === "number") return p.number != null ? String(p.number) : "";
  return "";
}

async function queryNotionDB(dbId: string, token: string) {
  const rows: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;
  while (hasMore) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify(body),
    });
    if (!res.ok) break;
    const data = await res.json();
    for (const page of data.results || []) {
      rows.push({
        월: getTextProp(page, "월"),
        주차: getTextProp(page, "주차"),
        매출예정: getTextProp(page, "매출 예정 (현장명_고객명 입력)"),
        구분: getTextProp(page, "구분"),
        고객경로: getTextProp(page, "고객경로"),
        추가경로: getTextProp(page, "추가경로"),
        고객명: getTextProp(page, "고객명"),
        결제유형: getTextProp(page, "결제유형"),
        금액: page.properties["금액"]?.number ?? null,
        확률: getTextProp(page, "확률"),
        입금: getTextProp(page, "입금"),
        컨설턴트특이사항: getTextProp(page, "컨설턴트 특이사항"),
      });
    }
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  return rows;
}

// GET: Notion에서 직접 조회 (키 있을 때) 또는 Supabase 캐시 조회
export async function GET() {
  const notionKey = process.env.NOTION_API_KEY;

  // Notion API 키가 있으면 직접 조회
  if (notionKey) {
    try {
      const allData: any[] = [];
      for (const db of DATABASES) {
        const rows = await queryNotionDB(db.dbId, notionKey);
        allData.push({ consultant: db.name, rows });
      }
      return NextResponse.json({ data: allData, source: "notion", updatedAt: new Date().toISOString() });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Notion 키 없으면 Supabase 캐시에서 조회
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: rows } = await supabase.from("notion_sales").select("*").order("id");
    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [], source: "supabase", updatedAt: null, message: "데이터 없음. 노션 동기화 필요." });
    }
    // consultant별 그룹핑
    const grouped: Record<string, any[]> = {};
    rows.forEach(r => {
      if (!grouped[r.consultant]) grouped[r.consultant] = [];
      grouped[r.consultant].push({
        월: r.month, 주차: r.week, 매출예정: r.sales_target, 구분: r.division,
        고객경로: r.customer_route, 추가경로: r.additional_route, 고객명: r.customer_name,
        결제유형: r.payment_type, 금액: r.amount, 확률: r.probability,
        입금: r.deposit_status, 컨설턴트특이사항: r.consultant_note,
      });
    });
    const allData = Object.entries(grouped).map(([consultant, rows]) => ({ consultant, rows }));
    const lastSync = rows[0]?.synced_at || null;
    return NextResponse.json({ data: allData, source: "supabase", updatedAt: lastSync });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Notion에서 동기화하여 Supabase에 저장 (최신화 버튼용)
export async function POST() {
  const notionKey = process.env.NOTION_API_KEY;
  if (!notionKey) {
    return NextResponse.json({ error: "NOTION_API_KEY 환경변수가 설정되지 않았습니다. 관리자에게 Internal Integration 키를 요청해주세요." }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // 기존 데이터 삭제
    await supabase.from("notion_sales").delete().neq("id", 0);

    for (const db of DATABASES) {
      const rows = await queryNotionDB(db.dbId, notionKey);
      const inserts = rows.filter(r => r.매출예정 || r.고객명).map(r => ({
        consultant: db.name, month: r.월, week: r.주차, sales_target: r.매출예정,
        division: r.구분, customer_route: r.고객경로, additional_route: r.추가경로,
        customer_name: r.고객명, payment_type: r.결제유형, amount: r.금액 || 0,
        probability: r.확률, deposit_status: r.입금, consultant_note: r.컨설턴트특이사항,
        synced_at: new Date().toISOString(),
      }));
      if (inserts.length > 0) {
        await supabase.from("notion_sales").insert(inserts);
      }
    }
    return NextResponse.json({ success: true, message: "동기화 완료" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: 외부에서 데이터를 직접 업로드 (수동 동기화용)
export async function PUT(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { data: rows, replace } = body;
    
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "rows 배열이 필요합니다" }, { status: 400 });
    }

    // replace=true면 기존 데이터 삭제
    if (replace) {
      await supabase.from("notion_sales").delete().neq("id", 0);
    }

    // 100건씩 배치 삽입
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((r: any) => ({
        consultant: r.consultant || "",
        month: r.month || r["월"] || "",
        week: r.week || r["주차"] || "",
        sales_target: r.sales_target || r["매출예정"] || r["매출 예정 (현장명_고객명 입력)"] || r["현장명"] || "",
        division: r.division || r["구분"] || "",
        customer_route: r.customer_route || r["고객경로"] || "",
        additional_route: r.additional_route || (r["추가경로"] || "").replace(/[\[\]"]/g, ""),
        customer_name: r.customer_name || r["고객명"] || "",
        payment_type: r.payment_type || r["결제유형"] || "",
        amount: r.amount || r["금액"] || 0,
        probability: r.probability || r["확률"] || "",
        deposit_status: r.deposit_status || r["입금"] || "",
        consultant_note: r.consultant_note || r["컨설턴트 특이사항"] || "",
        synced_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("notion_sales").insert(batch);
      if (error) console.error("Insert error:", error);
      else inserted += batch.length;
    }

    return NextResponse.json({ success: true, inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
