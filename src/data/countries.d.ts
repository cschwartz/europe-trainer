export interface Country {
  /** Stable short key used in storage, geometry ids and SRS item keys. */
  id: string;
  /** Natural Earth ADM0_A3 code — used only by the geo build script. */
  ne: string;
  /** Canonical German country name shown to the learner. */
  name: string;
  /** Accepted alternative country spellings for free-text answers. */
  altName?: string[];
  /** Canonical German capital name shown to the learner. */
  cap: string;
  /** Accepted alternative capital spellings for free-text answers. */
  altCap?: string[];
}

export const COUNTRIES: Country[];
export const MICROSTATES: Set<string>;
export const BY_ID: Record<string, Country>;
