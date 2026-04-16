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
    const dateObj = new Date(quoteDate);
    set(10, 7, dateObj);
    ws.getCell(10, 7).numFmt = "yyyy-mm-dd";

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

    // 2. Excel → Buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBase64 = Buffer.from(excelBuffer).toString("base64");

    // 3. CloudConvert API로 Excel → PDF 변환
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API 키가 없습니다" }, { status: 500 });
    }

    // Job 생성
    const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "upload-file": {
            operation: "import/base64",
            file: excelBase64,
            filename: "quote.xlsx",
          },
          "convert-file": {
            operation: "convert",
            input: "upload-file",
            input_format: "xlsx",
            output_format: "pdf",
            engine: "libreoffice",
          },
          "export-file": {
            operation: "export/url",
            input: "convert-file",
          },
        },
        tag: "bunyangoe-crm",
      }),
    });

    const job = await jobRes.json();

    if (!jobRes.ok) {
      console.error("CloudConvert job 생성 실패:", job);
      return NextResponse.json({ error: "변환 작업 생성 실패" }, { status: 500 });
    }

    const jobId = job.data.id;

    // 4. 완료 대기 (최대 30초 폴링)
    let pdfUrl = "";
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const status = await statusRes.json();
      const exportTask = status.data?.tasks?.find((t: any) => t.name === "export-file");
      if (exportTask?.status === "finished") {
        pdfUrl = exportTask.result?.files?.[0]?.url;
        break;
      }
      if (status.data?.status === "error") {
        return NextResponse.json({ error: "변환 중 오류 발생" }, { status: 500 });
      }
    }

    if (!pdfUrl) {
      return NextResponse.json({ error: "변환 시간 초과" }, { status: 500 });
    }

    // 5. PDF 다운로드 후 클라이언트에 전달
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
