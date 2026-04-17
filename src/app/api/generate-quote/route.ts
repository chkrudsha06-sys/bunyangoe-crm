import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

// Vercel 함수 최대 실행시간 설정
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      property, quoteDate,
      clientAddr, clientName, clientBizNo, clientCeo, clientMgr, clientPhone,
      recipientMgr, recipientPhone,   // 수급인(을) 담당자/HP 추가
      items,
    } = body;

    // 1. 템플릿 Excel 열기
    const templatePath = path.join(process.cwd(), "public", "quote_template.xlsx");
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "템플릿 파일이 없습니다" }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const ws = workbook.worksheets[0];

    const set = (row: number, col: number, val: any) => {
      ws.getCell(row, col).value = val;
    };

    // 2. 기본 정보 + 위탁인(갑) 세팅
    set(3, 3, property);
    set(4, 3, clientAddr);
    set(4, 7, clientBizNo);
    set(5, 3, clientName);
    set(5, 7, clientCeo);
    set(6, 3, clientMgr);
    set(6, 7, clientPhone);

    // 3. 수급인(을) 담당자/HP 동적 반영 (비어있으면 템플릿 기본값 유지)
    if (recipientMgr) set(9, 3, recipientMgr);       // C9 = 수급인 담당자
    if (recipientPhone) set(9, 7, recipientPhone);   // G9 = 수급인 HP

    // 4. 견적일자
    set(10, 7, quoteDate);

    // 5. 광고 항목 (첫 번째 항목만 반영 - 현재 템플릿 구조 기준)
    let totalAmount = 0;
    if (items && items.length > 0) {
      const it = items[0];
      set(12, 2, it.media);
      set(12, 3, it.type);
      set(12, 4, it.targeting);
      set(12, 5, Number(it.quantity) || 0);
      set(12, 6, Number(it.unitPrice) || 0);

      // 금액을 수식 결과 캐시 대신 "직접 계산한 값"으로 덮어쓰기
      // → LibreOffice의 수식 재계산 누락 문제 해결
      const itemAmount = Number(it.amount) || (Number(it.quantity) * Number(it.unitPrice)) || 0;
      set(12, 7, itemAmount);  // G12 = 금액

      set(13, 3, it.ageGroup);
      set(13, 6, it.sendType);
      set(14, 3, it.region1);
      set(15, 3, it.region3);
      set(16, 3, it.region2);
    }

    // 6. 전체 금액 계산 + VAT 포함 합계 직접 세팅
    totalAmount = (items || []).reduce(
      (sum: number, item: any) => sum + (Number(item.amount) || 0),
      0
    );
    const totalVat = Math.round(totalAmount * 1.1);
    set(17, 7, totalVat);  // G17 = VAT 포함 합계 (수식 덮어쓰기)

    // 7. Excel → Buffer → Base64
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBase64 = Buffer.from(excelBuffer).toString("base64");

    // 8. CloudConvert API 키 확인
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "CLOUDCONVERT_API_KEY 환경변수가 없습니다" }, { status: 500 });
    }

    // 9. Job 생성 (폰트 업로드 없음 - LibreOffice 기본 한글 폰트 사용)
    const tasks: Record<string, any> = {
      "upload-file": {
        operation: "import/base64",
        file: excelBase64,
        filename: "quote.xlsx",
      },
      "convert-file": {
        operation: "convert",
        input: ["upload-file"],
        input_format: "xlsx",
        output_format: "pdf",
        engine: "libreoffice",
      },
      "export-file": {
        operation: "export/url",
        input: "convert-file",
      },
    };

    const jobRes = await fetch("https://sync.api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tasks }),
    });

    if (!jobRes.ok) {
      const errBody = await jobRes.text();
      console.error("CloudConvert HTTP 오류:", errBody);
      return NextResponse.json({ error: "CloudConvert 변환 실패: " + errBody }, { status: 500 });
    }

    const job = await jobRes.json();

    // 10. 결과에서 PDF URL 추출
    const jobTasks = job.data?.tasks || job.tasks || [];
    const taskArr: any[] = Array.isArray(jobTasks) ? jobTasks : Object.values(jobTasks);

    const exportTask = taskArr.find(
      (t: any) => t.name === "export-file" || t.operation === "export/url"
    );

    const pdfUrl = exportTask?.result?.files?.[0]?.url
      || exportTask?.result?.url
      || (typeof exportTask?.result?.files?.[0] === "string" ? exportTask.result.files[0] : null);

    if (!pdfUrl) {
      const failedTasks = taskArr
        .filter((t: any) => t.status === "error")
        .map((t: any) => ({
          name: t.name,
          operation: t.operation,
          code: t.code,
          message: t.message,
        }));

      console.error("PDF URL 없음. 실패한 태스크:", failedTasks);

      return NextResponse.json({
        error: "PDF 변환에 실패했습니다.",
        failedTasks,
        hint: failedTasks.length > 0
          ? `실패 단계: ${failedTasks.map(t => t.name).join(", ")}`
          : "모든 태스크는 성공했으나 PDF URL을 찾을 수 없습니다.",
      }, { status: 500 });
    }

    // 11. PDF 다운로드
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      return NextResponse.json({ error: "PDF 다운로드 실패" }, { status: 500 });
    }

    const pdfBuffer = await pdfRes.arrayBuffer();

    // 12. 파일명 생성: 20260417_LMS_BC카드_2200000.pdf
    //     - quoteDate의 하이픈 제거
    //     - 첫 번째 항목의 매체/발송지면유형 사용
    //     - 슬래시/백슬래시 등 파일명 금지문자 제거
    const dateStr = (quoteDate || "").replace(/-/g, "");
    const firstItem = (items && items.length > 0) ? items[0] : {};
    const sanitize = (s: string) => (s || "").toString().replace(/[\/\\:*?"<>|]/g, "");
    const mediaName = sanitize(firstItem.media);
    const typeName  = sanitize(firstItem.type);
    const filename = `${dateStr}_${mediaName}_${typeName}_${totalVat}.pdf`;
    const encoded = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      },
    });

  } catch (e: any) {
    console.error("견적서 생성 오류:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
