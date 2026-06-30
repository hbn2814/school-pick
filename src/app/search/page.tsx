"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { seoulDistricts } from "@/data/seoul-districts";
import { getDistrictSchools, type SchoolKind } from "@/lib/districts";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import type { SchoolSummary } from "@/app/api/schools/route";
import SeoulMap from "@/components/SeoulMap";

export default function SearchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [kind, setKind] = useState<SchoolKind>("middle");
  const [selectedDistrict, setSelectedDistrict] = useState(
    seoulDistricts[0]
  );
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<{
    savedMiddle: string[];
    savedHigh: string[];
  }>({ savedMiddle: [], savedHigh: [] });

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

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

  const filteredSchools = useMemo(() => {
    if (!query.trim()) return schools;
    return schools.filter((s) => s.name.includes(query.trim()));
  }, [schools, query]);

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
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

      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-3">
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

      <main className="grid flex-1 grid-cols-1 gap-6 p-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">
            서울 25개 구
          </h2>
          <SeoulMap
            selectedSggCode={selectedDistrict?.sggCode}
            onSelect={(sggCode) => {
              const d = seoulDistricts.find((d) => d.sggCode === sggCode);
              if (d) setSelectedDistrict(d);
            }}
          />
        </section>

        <section className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-500">
              {selectedDistrict?.name} 학교 목록
            </h2>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="학교 이름 검색"
            className="mb-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />

          {schoolsLoading && (
            <p className="text-sm text-zinc-400">불러오는 중...</p>
          )}
          {schoolsError && (
            <p className="text-sm text-amber-600">{schoolsError}</p>
          )}

          {!schoolsLoading && !schoolsError && (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {filteredSchools.length === 0 && (
                <li className="text-sm text-zinc-400">학교가 없습니다.</li>
              )}
              {filteredSchools.map((s) => (
                <li
                  key={s.schoolCode}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {s.name}
                    </p>
                    <p className="text-xs text-zinc-400">{s.address}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(s.schoolCode)}
                    aria-label="즐겨찾기"
                    className="text-xl"
                  >
                    {favoriteSet.has(s.schoolCode) ? "★" : "☆"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
