import { NextRequest, NextResponse } from "next/server";

const SCHOOLINFO_BASE_URL = "https://www.schoolinfo.go.kr/openApi.do";

type SchoolKind = "middle" | "high";

const SCHUL_KND_CODE: Record<SchoolKind, string> = {
  middle: "03",
  high: "04",
};

export type SchoolSummary = {
  schoolCode: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string;
  foundType: string;
  coedu: string;
  tel: string;
  homepage: string;
};

export async function GET(req: NextRequest) {
  const sggCode = req.nextUrl.searchParams.get("sggCode");
  const kind = req.nextUrl.searchParams.get("kind") as SchoolKind | null;

  if (!sggCode || !kind || !(kind in SCHUL_KND_CODE)) {
    return NextResponse.json(
      { error: "sggCode, kind(middle|high) 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.SCHOOLINFO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "SCHOOLINFO_API_KEY가 설정되지 않았습니다.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const url = new URL(SCHOOLINFO_BASE_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("apiType", "0");
  url.searchParams.set("sidoCode", "11");
  url.searchParams.set("sggCode", sggCode);
  url.searchParams.set("schulKndCode", SCHUL_KND_CODE[kind]);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `학교알리미 API 응답 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const list: unknown[] = Array.isArray(data?.list) ? data.list : [];

    const schools: SchoolSummary[] = list.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        schoolCode: String(row.SCHUL_CODE ?? ""),
        name: String(row.SCHUL_NM ?? ""),
        lat: row.LTTUD != null ? Number(row.LTTUD) : null,
        lng: row.LGTUD != null ? Number(row.LGTUD) : null,
        address: String(row.SCHUL_RDNMA ?? ""),
        foundType: String(row.FOND_SC_CODE ?? ""),
        coedu: String(row.COEDU_SC_CODE ?? ""),
        tel: String(row.USER_TELNO ?? ""),
        homepage: String(row.HMPG_ADRES ?? ""),
      };
    });

    return NextResponse.json({ schools });
  } catch {
    return NextResponse.json(
      { error: "학교알리미 API 호출에 실패했습니다." },
      { status: 502 }
    );
  }
}
