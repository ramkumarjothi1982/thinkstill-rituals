// Types for the verbatim copy of the app's safety lexicon (shared-lexicon.js
// must stay byte-identical to hushmallow/src/data/safety-lexicon.js, so it is
// described here instead of being annotated).
export declare const HARM_LEXICON: {
  readonly idiomGuards: readonly string[];
  readonly crisis: readonly string[];
  readonly crisisOther: readonly string[];
  readonly care: Readonly<Record<'abuse' | 'violence' | 'threat' | 'harassment' | 'discrimination' | 'unsafe', readonly string[]>>;
};
type Resource = { readonly label: string; readonly detail: string };
type Copy = { readonly title: string; readonly message: string };
export declare const HARM_COPY: {
  readonly crisis: Copy & { readonly resources: readonly Resource[] };
  readonly crisisOther: Copy & { readonly resources: readonly Resource[] };
  readonly care: Readonly<Record<string, Copy>>;
  readonly careResources: readonly Resource[];
  readonly stillHere: string;
};
export declare const CONCERN_LEXICON: readonly string[];
