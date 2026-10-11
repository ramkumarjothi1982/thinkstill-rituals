// Names the mobile shell uses from the desktop source (shared payload scope) and the payload factory params.
declare const motion: any
declare const FramerMotionNS: any
declare const addPropertyControls: (component: any, controls: any) => void
declare const ControlType: any
declare const ThinkStillReleaseArcadePixar: any
declare const ThinkStillReleaseArcade: any
declare const EOS_STORE: { get: () => any; set: (patch: any) => void; sub?: (fn: () => void) => () => void }
declare const EOS_PROP_DEFAULTS: any
declare const GAMES: any[]
declare function emotionSrc(bubble: string, mood: number): string
declare function eosPrefs(): any
declare function eosSetPref(key: string, value: any): void
declare function eosApi(name: string): any
declare function vibrate(pattern: number | number[]): void
declare const EOS_EMO: any
// hero rituals 112-114 (native): the desktop word pickers, sessions and safety, from the shared scope
declare function eosWords(entries: string[], n?: number): string[]
declare function eosVolcanoWords(list: string[]): string[]
declare function eosGroundWords(entries: string[]): string[]
declare function eosLanWords(entries: string[], fit?: (phrase: string) => boolean): string[]
declare function eosLanFitter(font: string, maxW: number, maxLines: number): (phrase: string) => boolean
declare function eosSessions(): any[]
declare function eosSafetyStrong(type: any): boolean
declare function EosSafetyScan(text: any): any
declare function eosDayPart(d?: Date): string
