"use client";

import {
  seoulMapPaths,
  SEOUL_MAP_WIDTH,
  SEOUL_MAP_HEIGHT,
} from "@/data/seoul-map-paths";

type SeoulMapProps = {
  selectedSggCode: string | undefined;
  onSelect: (sggCode: string) => void;
};

export default function SeoulMap({ selectedSggCode, onSelect }: SeoulMapProps) {
  return (
    <svg
      viewBox={`0 0 ${SEOUL_MAP_WIDTH} ${SEOUL_MAP_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label="서울특별시 25개 자치구 지도"
    >
      {seoulMapPaths.map((district) => {
        const selected = district.sggCode === selectedSggCode;
        return (
          <g key={district.sggCode}>
            <path
              d={district.d}
              onClick={() => onSelect(district.sggCode)}
              className={`cursor-pointer stroke-white stroke-[1.5] transition-colors ${
                selected
                  ? "fill-zinc-900"
                  : "fill-zinc-200 hover:fill-zinc-400"
              }`}
            >
              <title>{district.name}</title>
            </path>
            <text
              x={district.cx}
              y={district.cy}
              textAnchor="middle"
              className={`pointer-events-none select-none text-[10px] ${
                selected ? "fill-white" : "fill-zinc-600"
              }`}
            >
              {district.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
