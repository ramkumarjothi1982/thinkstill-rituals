import * as React from "react"
import { createRoot } from "react-dom/client"
import HushmallowLanding from "../../framer/HushmallowLanding"

// Local art instead of the CDN defaults; ?signup=… etc. simulate configured URLs.
const q = new URLSearchParams(location.search)
// the one-file build (build.mjs --inline) provides the art as data URIs
const inlined: Record<string, string> | undefined = (window as any).__HM_ASSETS
const art = (n: string) => inlined?.[n] ?? `assets/${n}.webp`
const props: any = {
    logo: art("hushmallow-logo"),
    mascot: art("mascot"),
    noomi: art("noomi"),
    blubi: art("blubi"),
    pipzi: art("pipzi"),
    boppo: art("boppo"),
    zuzu: art("zuzu"),
    loomi: art("loomi"),
    glitzi: art("glitzi"),
    signUpUrl: q.get("signup") || "",
    loginUrl: q.get("login") || "",
    termsUrl: q.get("terms") || "",
    privacyUrl: q.get("privacy") || "",
    contactUrl: q.get("contact") || "",
    hushmatesUpdatesUrl: q.get("mates") || "",
    moodspellVideo: q.get("video") || "",
    moodspellPoster: q.get("poster") || "",
    assetBase: "assets/",
    lidImages: inlined ? { pipzi: art("pipzi-lids"), boppo: art("boppo-lids"), glitzi: art("glitzi-lids"), zuzu: art("zuzu-lids") } : undefined,
}
createRoot(document.getElementById("root")!).render(<HushmallowLanding {...props} />)
