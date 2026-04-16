import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      property, quoteDate,
      clientAddr, clientName, clientBizNo, clientCeo, clientMgr, clientPhone,
      items,
    } = body;

    const templatePath = path.join(process.cwd(), "public", "quote_template.xlsx");
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "템플릿 파일이 없습니다" }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const ws = workbook.worksheets[0];

    const set = (row: number, col: number, val: any) => {
      const cell = ws.getCell(row, col);
      cell.value = val;
    };

    // 대상물건 (C3)
    set(3, 3, property);

    // 위탁인(갑)
    set(4, 3, clientAddr);       // 주소 C4
    set(4, 7, clientBizNo);      // 사업자번호 G4
    set(5, 3, clientName);       // 계약자 C5
    set(5, 7, clientCeo);        // 대표자 G5
    set(6, 3, clientMgr);        // 담당자 C6
    set(6, 7, clientPhone);      // HP G6

    // 견적일자 G10
    set(10, 7, new Date(quoteDate));
    ws.getCell(10, 7).numFmt = "yyyy-mm-dd";

    // 광고 항목 (최대 첫 번째 항목 → row 12)
    // 다중 항목이면 행을 추가해야 하지만 우선 첫 번째 항목 처리
    if (items && items.length > 0) {
      const it = items[0];
      set(12, 2, it.media);
      set(12, 3, it.type);
      set(12, 4, it.targeting);
      set(12, 5, Number(it.quantity) || 0);
      set(12, 6, Number(it.unitPrice) || 0);
      // G12는 수식 =E12*F12 이므로 그대로 두면 자동 계산

      // 타겟팅 상세
      set(13, 3, it.ageGroup);    // 연령대 C13
      set(13, 6, it.sendType);    // 발송유형 F13
      set(14, 3, it.region1);     // 지역① C14
      set(15, 3, it.region3);     // 지역③ C15
      set(16, 3, it.region2);     // 지역② C16
    }

    // 다중 항목 처리 (2번째 항목부터 행 삽입)
    if (items && items.length > 1) {
      for (let i = 1; i < items.length; i++) {
        const it = items[i];
        const targetRow = 12 + i;
        ws.insertRow(targetRow, []);
        set(targetRow, 1, i + 1);
        set(targetRow, 2, it.media);
        set(targetRow, 3, it.type);
        set(targetRow, 4, it.targeting);
        set(targetRow, 5, Number(it.quantity) || 0);
        set(targetRow, 6, Number(it.unitPrice) || 0);
        set(targetRow, 7, { formula: `=E${targetRow}*F${targetRow}` });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `광고인_견적서_${property}_${quoteDate}.xlsx`;
    const encoded = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (e: any) {
    console.error("견적서 생성 오류:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
