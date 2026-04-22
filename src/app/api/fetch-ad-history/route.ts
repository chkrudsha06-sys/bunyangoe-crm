import { NextResponse } from "next/server";

const SHEET_ID = "1TmBP2k54P-XkS3X5z0tKMRFSfjB5SvQG0AFG9d8OfUo";
const TABS = [
  { label: "2026", gid: "2076389318" },
  // 2025 탭은 gid 확인 후 추가
];

interface Campaign {
  물건: string; 광고기간: string; 지역: string; 현장명원본: string;
  현장명: string; 캠페인번호: string; 광고주: string; 광고비: number;
  광고비텍스트: string; 담당자: string; 분류: string; 물건분류: string;
  콜: number; 관심: number; 연도: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(s: string): number {
  if (!s) return 0;
  return Number(s.replace(/[₩,원\s]/g, "")) || 0;
}

// 현장명에서 기본 이름과 캠페인 번호 분리
// "리아츠인천9" → { base: "리아츠인천", campaign: "9" }
// "진접더퍼스트2_2" → { base: "진접더퍼스트", campaign: "2_2" }
// "더마크원20_2" → { base: "더마크원", campaign: "20_2" }
function parseSiteName(name: string): { base: string; campaign: string } {
  const match = name.match(/^(.+?)(\d+(?:_\d+)?)$/);
  if (match) {
    return { base: match[1], campaign: match[2] };
  }
  return { base: name, campaign: "1" };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const yearFilter = url.searchParams.get("year") || "2026";

    const allCampaigns: Campaign[] = [];

    for (const tab of TABS) {
      if (yearFilter !== "all" && tab.label !== yearFilter) continue;

      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${tab.gid}`;

      try {
        const res = await fetch(csvUrl, { next: { revalidate: 300 } });
        if (!res.ok) continue;
        const csvText = await res.text();
        const lines = csvText.split("\n").map(l => parseCSVLine(l));

        // 첫 행 = 헤더, 나머지 = 데이터
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i];
          if (!cols[3]) continue; // 현장명 없으면 스킵

          const rawName = cols[3] || "";
          const { base, campaign } = parseSiteName(rawName);

          allCampaigns.push({
            물건: cols[0] || "",
            광고기간: cols[1] || "",
            지역: cols[2] || "",
            현장명원본: rawName,
            현장명: base,
            캠페인번호: campaign,
            광고주: cols[4] || "",
            광고비: parseAmount(cols[5]),
            광고비텍스트: cols[5] || "",
            담당자: cols[6] || "",
            분류: cols[7] || "",
            물건분류: cols[8] || "",
            콜: Number(cols[9]) || 0,
            관심: Number(cols[10]) || 0,
            연도: tab.label,
          });
        }
      } catch {}
    }

    // 현장별 그룹핑
    const siteMap = new Map<string, Campaign[]>();
    for (const c of allCampaigns) {
      const key = c.현장명;
      if (!siteMap.has(key)) siteMap.set(key, []);
      siteMap.get(key)!.push(c);
    }

    // 현장별 요약
    const sites = Array.from(siteMap.entries()).map(([name, campaigns]) => {
      campaigns.sort((a, b) => Number(a.캠페인번호.split("_")[0]) - Number(b.캠페인번호.split("_")[0]));
      const totalCalls = campaigns.reduce((s, c) => s + c.콜, 0);
      const totalInterest = campaigns.reduce((s, c) => s + c.관심, 0);
      const totalBudget = campaigns.reduce((s, c) => s + c.광고비, 0);
      const regions = Array.from(new Set(campaigns.map(c => c.지역)));

      return {
        현장명: name,
        지역: regions.join(", "),
        캠페인수: campaigns.length,
        총콜: totalCalls,
        총관심: totalInterest,
        총광고비: totalBudget,
        물건: campaigns[0]?.물건 || "",
        물건분류: campaigns[0]?.물건분류 || "",
        캠페인: campaigns,
      };
    });

    // 캠페인 수 + 총콜 기준 내림차순 정렬
    sites.sort((a, b) => b.캠페인수 - a.캠페인수 || b.총콜 - a.총콜);

    return NextResponse.json({
      sites,
      summary: {
        totalSites: sites.length,
        totalCampaigns: allCampaigns.length,
        totalCalls: allCampaigns.reduce((s, c) => s + c.콜, 0),
        totalInterest: allCampaigns.reduce((s, c) => s + c.관심, 0),
        totalBudget: allCampaigns.reduce((s, c) => s + c.광고비, 0),
      },
      lastSync: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "알 수 없는 오류", sites: [] }, { status: 200 });
  }
}
