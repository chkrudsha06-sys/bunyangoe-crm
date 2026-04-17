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
      items,
    } = body;

    // 1. 템플릿 Excel 데이터 채우기
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

    set(3, 3, property);
    set(4, 3, clientAddr);
    set(4, 7, clientBizNo);
    set(5, 3, clientName);
    set(5, 7, clientCeo);
    set(6, 3, clientMgr);
    set(6, 7, clientPhone);
    set(10, 7, quoteDate);

    if (items && items.length > 0) {
      const it = items[0];
      set(12, 2, it.media);
      set(12, 3, it.type);
      set(12, 4, it.targeting);
      set(12, 5, Number(it.quantity) || 0);
      set(12, 6, Number(it.unitPrice) || 0);
      set(13, 3, it.ageGroup);
      set(13, 6, it.sendType);
      set(14, 3, it.region1);
      set(15, 3, it.region3);
      set(16, 3, it.region2);
    }

    // 2. Excel → Buffer → Base64
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBase64 = Buffer.from(excelBuffer).toString("base64");

    // 3. CloudConvert API 키 확인
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "CLOUDCONVERT_API_KEY 환경변수가 없습니다" }, { status: 500 });
    }

    // 4. 맑은 고딕 폰트 파일 Base64 인코딩
    const fontPath = path.join(process.cwd(), "public", "malgun.ttf");
    let fontBase64 = "";
    if (fs.existsSync(fontPath)) {
      fontBase64 = fs.readFileSync(fontPath).toString("base64");
    }

    // 5. Job 생성 (synchronous 방식 + 폰트 업로드)
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

    // 폰트 파일이 있으면 함께 업로드
    if (fontBase64) {
      tasks["upload-font"] = {
        operation: "import/base64",
        file: fontBase64,
        filename: "malgun.ttf",
      };
      tasks["convert-file"].input = ["upload-file", "upload-font"];
    }

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
      console.error("CloudConvert 오류:", errBody);
      return NextResponse.json({ error: "CloudConvert 변환 실패: " + errBody }, { status: 500 });
    }

    const job = await jobRes.json();

    // 5. 결과에서 PDF URL 추출 (다양한 응답 구조 처리)
    const tasks = job.data?.tasks || job.tasks || [];
    const exportTask = Array.isArray(tasks)
      ? tasks.find((t: any) => t.name === "export-file" || t.operation === "export/url")
      : Object.values(tasks as Record<string, any>).find((t: any) => t.operation === "export/url");

    const pdfUrl = exportTask?.result?.files?.[0]?.url
      || exportTask?.result?.url
      || exportTask?.result?.files?.[0];

    if (!pdfUrl) {
      const debugInfo = JSON.stringify(job).substring(0, 500);
      console.error("PDF URL 없음. 응답:", debugInfo);
      return NextResponse.json({ error: `PDF URL을 찾을 수 없습니다. 응답: ${debugInfo}` }, { status: 500 });
    }

    // 6. PDF 다운로드 후 클라이언트에 전달
    const pdfRes = await fetch(pdfUrl);
    const pdfBuffer = await pdfRes.arrayBuffer();

    const filename = `광고인_견적서_${property}_${quoteDate}.pdf`;
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
