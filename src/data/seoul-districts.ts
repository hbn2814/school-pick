import raw from "../../docs/seoul-districts.json";

export type SeoulDistrict = {
  name: string;
  sggCode: string;
  sidoCode: string;
};

export const seoulDistricts: SeoulDistrict[] = raw;
