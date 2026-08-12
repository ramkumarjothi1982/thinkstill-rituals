import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function ThinkStillNowEmbed(props: { appUrl?: string }) {
    const appUrl = props.appUrl || ""
    if (!appUrl) {
        return (
            <div style={{width:"100%",height:"100%",minHeight:640,display:"grid",placeItems:"center",background:"#05070b",color:"#fff",fontFamily:"Inter, sans-serif",borderRadius:24,padding:24,textAlign:"center"}}>
                <div><strong>ThinkStill NOW</strong><br/><span style={{opacity:.65}}>Set the GitHub Pages App URL in Framer properties.</span></div>
            </div>
        )
    }
    return <iframe title="ThinkStill NOW" src={appUrl} style={{width:"100%",height:"100%",minHeight:720,border:0,borderRadius:24,background:"#05070b"}} allow="microphone" />
}

addPropertyControls(ThinkStillNowEmbed, {
    appUrl: { type: ControlType.String, title: "App URL", placeholder: "https://yourname.github.io/repo/" },
})
