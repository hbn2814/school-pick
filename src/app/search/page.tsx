"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { seoulDistricts } from "@/data/seoul-districts";
import {
  getDistrictSchools,
  searchSchoolsCityWide,
  type SchoolKind,
  type SchoolWithDistrict,
} from "@/lib/districts";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import type { SchoolSummary } from "@/app/api/schools/route";
import SeoulMap from "@/components/SeoulMap";

const KIND_STORAGE_KEY = "schoolpick:selectedKind";
const SGG_STORAGE_KEY = "schoolpick:selectedSggCode";

function readStoredKind(): SchoolKind {
  if (typeof window === "undefined") return "middle";
  const stored = window.sessionStorage.getItem(KIND_STORAGE_KEY);
  return stored === "high" ? "high" : "middle";
}

function readStoredDistrict() {
  if (typeof window === "undefined") return seoulDistricts[0];
  const storedSgg = window.sessionStorage.getItem(SGG_STORAGE_KEY);
  return (
    seoulDistricts.find((d) => d.sggCode === storedSgg) ?? seoulDistricts[0]
  );
}

export default function SearchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [kind, setKind] = useState<SchoolKind>(readStoredKind);
  const [selectedDistrict, setSelectedDistrict] = useState(readStoredDistrict);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<{
    savedMiddle: string[];
    savedHigh: string[];
  }>({ savedMiddle: [], savedHigh: [] });

  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<SchoolWithDistrict[] | null>(
    null
  );
  const [citySearchLoading, setCitySearchLoading] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    window.sessionStorage.setItem(KIND_STORAGE_KEY, kind);
  }, [kind]);

  useEffect(() => {
    if (!selectedDistrict) return;
    window.sessionStorage.setItem(SGG_STORAGE_KEY, selectedDistrict.sggCode);
  }, [selectedDistrict]);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data();
      setFavorites({
        savedMiddle: data?.savedMiddle ?? [],
        savedHigh: data?.savedHigh ?? [],
      });
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedDistrict) return;
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setSchoolsLoading(true);
      setSchoolsError(null);
      try {
        const result = await getDistrictSchools(
          selectedDistrict.sggCode,
          selectedDistrict.name,
          kind
        );
        if (!cancelled) setSchools(result);
      } catch (err) {
        if (!cancelled) {
          setSchools([]);
          setSchoolsError((err as Error).message);
        }
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, selectedDistrict, kind]);

  useEffect(() => {
    if (!user) return;
    const trimmed = citySearch.trim();
    if (!trimmed) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCitySearchLoading(true);
      setCitySearchError(null);
      try {
        const result = await searchSchoolsCityWide(kind, trimmed);
        if (!cancelled) setCityResults(result);
      } catch (err) {
        if (!cancelled) {
          setCityResults([]);
          setCitySearchError((err as Error).message);
        }
      } finally {
        if (!cancelled) setCitySearchLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, kind, citySearch]);

  const favoriteSet = useMemo(
    () =>
      new Set(kind === "middle" ? favorites.savedMiddle : favorites.savedHigh),
    [favorites, kind]
  );

  async function toggleFavorite(schoolCode: string) {
    if (!user) return;
    if (favoriteSet.has(schoolCode)) {
      await removeFavorite(user.uid, kind, schoolCode);
    } else {
      await addFavorite(user.uid, kind, schoolCode);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  const isCitySearchActive = citySearch.trim().length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-900">SchoolPick</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {user.displayName ?? user.email}
          </span>
          <button
            onClick={() => router.push("/mypage")}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
          >
            마이페이지
          </button>
          <button
            onClick={() => signOut(auth)}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3">
        <div className="flex items-center gap-2">
          {(["middle", "high"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                kind === k
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {k === "middle" ? "중학교" : "고등학교"}
            </button>
          ))}
        </div>

        <input
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          placeholder="서울시 전체 학교 이름 검색"
          className="w-64 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
        />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-6 md:grid-cols-6">
        <section className="flex min-h-0 flex-col md:col-span-5">
          <h2 className="mb-3 shrink-0 text-sm font-semibold text-zinc-500">
            서울 25개 구
          </h2>
          <div className="min-h-0 flex-1">
            <SeoulMap
              selectedSggCode={selectedDistrict?.sggCode}
              onSelect={(sggCode) => {
                const d = seoulDistricts.find((d) => d.sggCode === sggCode);
                if (d) setSelectedDistrict(d);
              }}
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col md:col-span-1">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-500">
              {isCitySearchActive
                ? `'${citySearch}' 검색 결과`
                : `${selectedDistrict?.name} 학교 목록`}
            </h2>
          </div>

          {isCitySearchActive ? (
            <>
              {citySearchLoading && (
                <p className="text-sm text-zinc-400">검색 중...</p>
              )}
              {citySearchError && (
                <p className="text-sm text-amber-600">{citySearchError}</p>
              )}
              {!citySearchLoading && !citySearchError && (
                <ul className="flex flex-col gap-2 overflow-y-auto">
                  {(cityResults ?? []).length === 0 && (
                    <li className="text-sm text-zinc-400">
                      검색 결과가 없습니다.
                    </li>
                  )}
                  {(cityResults ?? []).map((s) => (
                    <li
                      key={s.schoolCode}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {s.districtName}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFavorite(s.schoolCode)}
                        aria-label="즐겨찾기"
                        className="shrink-0 text-xl"
                      >
                        {favoriteSet.has(s.schoolCode) ? "★" : "☆"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {schoolsLoading && (
                <p className="text-sm text-zinc-400">불러오는 중...</p>
              )}
              {schoolsError && (
                <p className="text-sm text-amber-600">{schoolsError}</p>
              )}
              {!schoolsLoading && !schoolsError && (
                <ul className="flex flex-col gap-2 overflow-y-auto">
                  {schools.length === 0 && (
                    <li className="text-sm text-zinc-400">학교가 없습니다.</li>
                  )}
                  {schools.map((s) => (
                    <li
                      key={s.schoolCode}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {s.name}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {s.address}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFavorite(s.schoolCode)}
                        aria-label="즐겨찾기"
                        className="shrink-0 text-xl"
                      >
                        {favoriteSet.has(s.schoolCode) ? "★" : "☆"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
