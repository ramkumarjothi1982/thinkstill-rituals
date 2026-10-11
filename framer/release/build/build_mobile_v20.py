#!/usr/bin/env python3
"""Build thinkstill-release-mobile-v20.js from the v19 engine.

Each patch is an exact string replacement that must match exactly once,
so a changed upstream bundle fails loudly instead of half-patching.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "thinkstill-release-screen-navigation-v19.js")
DST = os.path.join(HERE, "..", "thinkstill-release-mobile-v20.js")

s = open(SRC, encoding="utf-8").read()


def patch(name, old, new):
    global s
    n = s.count(old)
    if n != 1:
        sys.exit(f"patch {name}: expected 1 match, found {n}")
    s = s.replace(old, new)
    print(f"ok  {name}")


# 0. Header note.
patch(
    "header",
    "// ThinkStill Release Console app (30-game launch build). Loaded by the ThinkStillRelease Framer code file; do not edit.",
    "// ThinkStill Release Console app (30-game launch build) — v20 mobile fit: check-in layout sizes itself to\n"
    "// the screen (phone grid fits the height, landscape uses one row, tablets scale up). Loaded by the\n"
    "// ThinkStillRelease Framer code file; built from v19 by exact-match patches.",
)

# 1. Check-in layout. Phone grid: orb size solved from the available height so all
#    three rows, the chips and the links fit; spare room is shared out as gaps and the
#    grid is centred; the chips/links block is pinned to the bottom when it fits.
#    Short wide screens (landscape phones): one row of characters. Tablets: the ring
#    keeps its geometry but orbs may grow past the old 96px cap.
OLD_PHONE = (
    "if(a){const C=Math.min(132,(e-16)/3),N=p,m=[[\"panic\",\"anger\",\"anxiety\"],[\"overthinking\",\"auto\",\"overwhelm\"],[\"sad\",\"lonely\",\"shame\"]];"
    "let B=N;m.forEach((F,O)=>{const Y=n&&n[O]?n[O]:x,U=O===1?8/2:0;F.forEach((K,j)=>{f[K]={x:e/2+(j-1)*C,y:B+U+84/2+2,size:K===\"auto\"?92:84,show:!0}}),B+=84+2*U+Y+5});"
    "const S=B;Fa.forEach((F,O)=>{f[F]={x:e/2+(O-1)*C,y:S+68/2+2,size:68,show:!!r}});"
    "const A=n&&n[3]?n[3]:Math.min(x,30);w=S+(r?68+A+8:0)+l,k=w-l/2,g=Math.max(o,w+c-12)}else{"
)
NEW_PHONE = (
    "if(a){const C=Math.min(132,(e-16)/3),m=[[\"panic\",\"anger\",\"anxiety\"],[\"overthinking\",\"auto\",\"overwhelm\"],[\"sad\",\"lonely\",\"shame\"]],"
    "Lb=O=>n&&n[O]?n[O]:x,A=r?n&&n[3]?n[3]:Math.min(x,30):0,nR=r?4:3,avail=Math.max(0,o-p-c-l-6),gap0=de(avail*.02,4,12),"
    "labSum=Lb(0)+Lb(1)+Lb(2)+A;"
    "let Z=(avail-labSum-(nR-1)*gap0)/(3.1+(r?.8:0));Z=Math.round(de(Z,52,Math.min(C*.8,112)));"
    "const U1=Math.round(Z*.05),rS=Math.round(Z*.8),Hr=3*Z+2*U1+labSum+(r?rS:0),"
    "gap=gap0+de((avail-Hr-(nR-1)*gap0)/(nR+1),0,20);"
    "let B=p+Math.max(0,(avail-Hr-(nR-1)*gap)/2);"
    "m.forEach((F,O)=>{const U=O===1?U1:0;F.forEach((K,j)=>{f[K]={x:e/2+(j-1)*C,y:B+U+Z/2+2,size:K===\"auto\"?Math.round(Z*1.1):Z,show:!0}}),B+=Z+2*U+Lb(O)+gap});"
    "const S=B;Fa.forEach((F,O)=>{f[F]={x:e/2+(O-1)*C,y:S+rS/2+2,size:rS,show:!!r}});"
    "const gB=S+(r?rS+A+gap:0);w=Math.max(gB+l,o-c),k=w-l/2,g=Math.max(o,w+c-12)}"
    "else if(o<520){const L=Ga.slice(0,4).concat([\"auto\"],Ga.slice(4),r?Fa:[]),N=L.length,cw=Math.min(150,(e-24)/N),"
    "av=Math.max(0,o-p-c-6);let Z=Math.round(de(Math.min(av-x-8,cw*.82),40,112));"
    "const cy=p+Math.max(0,(av-Z-x)/2)+Z/2+2;"
    "L.forEach((K,j)=>{f[K]={x:e/2+(j-(N-1)/2)*cw,y:cy,size:K===\"auto\"?Math.round(Z*1.08):Z,show:!0}});"
    "r||Fa.forEach(F=>{f[F]={x:e/2,y:cy,size:Z,show:!1}});"
    "w=Math.max(p+Z+x+10,o-c),k=w-l/2,g=Math.max(o,w+c-12)}else{"
)
patch("checkin-layout-phone-and-strip", OLD_PHONE, NEW_PHONE)

patch(
    "checkin-layout-ring-scale",
    "C=Math.round(de(D/2.88-x,64,96)),N=Math.round(C*1.15),m=Math.min(76,C);",
    "C=Math.round(de(D/2.88-x,64,de(Math.min(e,o*1.25)*.13,96,136))),N=Math.round(C*1.15),m=Math.min(Math.round(C*.8),104);",
)

# 2. Step-2 side rails on short wide screens: shrink, and hide when they cannot fit.
patch(
    "step2-rails",
    "f[T]={x:S?Y:e-Y,y:O+A*F,size:60,show:!0,rail:!0};return}",
    "f[T]={x:S?Y:e-Y,y:O+A*F,size:Math.round(de(F-10,34,60)),show:F>=36,rail:!0};return}",
)

# 3. Step-2 big orb: scale with the stage height instead of a fixed 140 / 120 floor.
patch(
    "step2-big-orb",
    "function $u(e,o){return o?140:Math.round(de(e*.24,120,180))}",
    "function $u(e,o){return o?Math.round(de(e*.2,88,140)):Math.round(de(e*.24,e<520?72:120,180))}",
)

# 4. Expose the layout mode and fit to CSS (strip for short wide screens, tight phones).
patch(
    "checkin-layout-attrs",
    "\"data-eos-layout\":v?\"grid\":\"ring\"",
    "\"data-eos-layout\":v?\"grid\":k.h>0&&k.h<520?\"strip\":\"ring\",\"data-eos-fit\":k.h>0&&k.h<(v?660:520)?\"tight\":\"roomy\"",
)

# 5. The "TAP HOW YOU FEEL" lane pill duplicates the subtitle; the skin hides it,
#    so the layout must not reserve its 44px either.
patch(
    "lane-off",
    "M=Ot&&x===1&&!Nt&&!L?44:0",
    "M=0",
)

open(DST, "w", encoding="utf-8").write(s)
print("wrote", DST, len(s))
