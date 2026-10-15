// Types for the verbatim copy of the app's risk screener (risk-screen.js must stay byte-identical to
// hushmallow/src/beyond/risk-screen.js, so it is described here instead of being annotated).
export type ScreenLevel = 'care' | 'check' | null;
export type ScreenHit = { readonly id: string; readonly cat: string; readonly w: number; readonly at: number; readonly end: number; readonly sentence: number; readonly text: string };
export type ScreenResult = {
  readonly level: ScreenLevel; readonly score: number; readonly cats: Readonly<Record<string, number>>;
  readonly hits: readonly ScreenHit[]; readonly context: boolean; readonly normalised: string;
};
export declare const VERSION: string;
export declare const SCREEN_LEVELS: readonly ['check', 'care'];
export declare const CARE_AT: number;
export declare const CHECK_AT: number;
export declare const HISTORY: number;
export declare function normalise(text: string): string;
export declare function canonical(norm: string): string;
export declare function frames(norm: string): { hits: ScreenHit[]; cats: Record<string, number>; canonical: string };
export declare function scoreOf(cats: Record<string, number>): number;
export declare function riskScreen(text: string, opts?: { history?: readonly string[] }): ScreenResult;
