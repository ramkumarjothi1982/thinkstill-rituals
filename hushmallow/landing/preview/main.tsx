import * as React from "react"
import { createRoot } from "react-dom/client"
import HushmallowLanding from "../../framer/HushmallowLanding"

// Local art instead of the CDN defaults; ?signup=… etc. simulate configured URLs.
const q = new URLSearchParams(location.search)
const art = (n: string) => `assets/${n}.webp`
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
    assetBase: "assets/",
}
createRoot(document.getElementById("root")!).render(<HushmallowLanding {...props} />)
