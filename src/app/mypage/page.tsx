"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function MyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
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

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-4 border-b border-zinc-200 px-6 py-4">
        <button
          onClick={() => router.push("/search")}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← 검색으로
        </button>
        <h1 className="text-lg font-bold text-zinc-900">마이페이지</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">
            즐겨찾기한 중학교 ({favorites.savedMiddle.length})
          </h2>
          {favorites.savedMiddle.length === 0 ? (
            <p className="text-sm text-zinc-400">
              아직 즐겨찾기한 중학교가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-zinc-700">
              {favorites.savedMiddle.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">
            즐겨찾기한 고등학교 ({favorites.savedHigh.length})
          </h2>
          {favorites.savedHigh.length === 0 ? (
            <p className="text-sm text-zinc-400">
              아직 즐겨찾기한 고등학교가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-zinc-700">
              {favorites.savedHigh.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
