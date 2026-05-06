import { NextResponse } from "next/server";

const NOTION_API = "https://api.notion.com/v1";

// 담당자별 노션 데이터베이스 ID 매핑
const DATABASES: { name: string; dbId: string }[] = [
  { name: "조승현", dbId: "31c4416c5bcb81d28bbbd851fbf8a508" },
  { name: "백선중", dbId: "31c4416c5bcb8160b945c9ead41316d1" },
  { name: "박나라", dbId: "31c4416c5bcb81d299edcd8a1e623720" },
  // 아래 3명은 노션 페이지 공유 후 DB ID 추가 필요
  // { name: "박민경", dbId: "" },
  // { name: "강아름", dbId: "" },
  // { name: "전정훈", dbId: "" },
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

async function queryDatabase(dbId: string, token: string) {
  const rows: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Notion query failed for ${dbId}: ${res.status}`);
      break;
    }

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
        컨설턴트특이사항: getTextProp(page, "컨설턴트 특이사항"),
        입금: getTextProp(page, "입금"),
      });
    }

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  return rows;
}

export async function GET() {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "NOTION_API_KEY 환경변수가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const allData: { consultant: string; rows: any[] }[] = [];

    for (const db of DATABASES) {
      if (!db.dbId) continue;
      const rows = await queryDatabase(db.dbId, token);
      allData.push({ consultant: db.name, rows });
    }

    return NextResponse.json({ data: allData, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("Notion API error:", err);
    return NextResponse.json({ error: err.message || "Notion API 오류" }, { status: 500 });
  }
}
