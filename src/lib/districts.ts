import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SchoolSummary } from "@/app/api/schools/route";
import { seoulDistricts } from "@/data/seoul-districts";

export type SchoolKind = "middle" | "high";

function districtDocId(sggCode: string, kind: SchoolKind) {
  return `${sggCode}_${kind}`;
}

export async function getCachedDistrictSchools(
  sggCode: string,
  kind: SchoolKind
): Promise<SchoolSummary[] | null> {
  const ref = doc(db, "districts", districtDocId(sggCode, kind));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return (snap.data().schools as SchoolSummary[]) ?? [];
}

export async function cacheDistrictSchools(
  sggCode: string,
  sggName: string,
  kind: SchoolKind,
  schools: SchoolSummary[]
) {
  const ref = doc(db, "districts", districtDocId(sggCode, kind));
  await setDoc(ref, {
    sggCode,
    sggName,
    schoolKind: kind,
    schools,
    fetchedAt: serverTimestamp(),
    source: "schoolinfo",
  });
}

export async function fetchDistrictSchools(
  sggCode: string,
  kind: SchoolKind
): Promise<SchoolSummary[]> {
  const res = await fetch(`/api/schools?sggCode=${sggCode}&kind=${kind}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "학교 목록을 불러오지 못했습니다.");
  }
  return data.schools as SchoolSummary[];
}

export async function getDistrictSchools(
  sggCode: string,
  sggName: string,
  kind: SchoolKind
): Promise<SchoolSummary[]> {
  const cached = await getCachedDistrictSchools(sggCode, kind);
  if (cached) return cached;

  const schools = await fetchDistrictSchools(sggCode, kind);
  await cacheDistrictSchools(sggCode, sggName, kind, schools);
  return schools;
}

export type SchoolWithDistrict = SchoolSummary & { districtName: string };

export async function searchSchoolsCityWide(
  kind: SchoolKind,
  name: string
): Promise<SchoolWithDistrict[]> {
  const lists = await Promise.all(
    seoulDistricts.map(async (d) => {
      const schools = await getDistrictSchools(d.sggCode, d.name, kind);
      return schools.map((s) => ({ ...s, districtName: d.name }));
    })
  );

  const all = lists.flat();
  const trimmed = name.trim();
  if (!trimmed) return all;
  return all.filter((s) => s.name.includes(trimmed));
}
