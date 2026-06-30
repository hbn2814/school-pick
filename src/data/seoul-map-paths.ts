import raw from "./seoul-map-paths.json";

export type SeoulDistrictPath = {
  name: string;
  sggCode: string;
  d: string;
  cx: number;
  cy: number;
};

export const seoulMapPaths: SeoulDistrictPath[] = raw;

export const SEOUL_MAP_WIDTH = 600;
export const SEOUL_MAP_HEIGHT = 600;
