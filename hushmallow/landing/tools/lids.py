# Builds blink "lid" layers for the open-eyed Mallows from the approved art.
# Run from hushmallow/:  python3 -I landing/tools/lids.py <preview-dir> pipzi boppo glitzi zuzu
# Writes landing/assets/<id>-lids.webp: skin-textured eyelids (colour-matched to
# the approved art) with a closed-eye crease, used for blinking and happy squints.
import sys, numpy as np
from PIL import Image, ImageFilter
SP=sys.argv[1]; names=sys.argv[2:]
def trim(im): return im.crop(im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox())
def dil(m,n):
    im=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(n)); return np.asarray(im)>127
def ero(m,n):
    im=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(n)); return np.asarray(im)>127
def fill(m):
    bg=~m; seed=np.zeros_like(bg); seed[0,:]=bg[0,:];seed[-1,:]=bg[-1,:];seed[:,0]=bg[:,0];seed[:,-1]=bg[:,-1]
    while True:
        d=seed.copy(); d[1:]|=seed[:-1]; d[:-1]|=seed[1:]; d[:,1:]|=seed[:,:-1]; d[:,:-1]|=seed[:,1:]; d&=bg
        if (d==seed).all(): break
        seed=d
    return ~seed
def comps(m):
    lab=np.zeros(m.shape,int); k=0; out=[]
    ys,xs=np.nonzero(m)
    seen=np.zeros_like(m)
    for y,x in zip(ys,xs):
        if seen[y,x]: continue
        k+=1; st=[(y,x)]; seen[y,x]=1; pts=[]
        while st:
            cy,cx=st.pop(); pts.append((cy,cx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=1; st.append((ny,nx))
        out.append(pts)
    return out
for n in names:
    web=Image.open(f'landing/assets/{n}.webp').convert('RGBA'); W,H=web.size
    A=np.asarray(web).astype(float); rgb=A[...,:3]
    mx=rgb.max(2); mn=rgb.min(2); sat=(mx-mn)/np.maximum(mx,1)
    reg=np.zeros((H,W),bool); reg[int(H*.22):int(H*.72), int(W*.08):int(W*.92)]=True
    if n=='zuzu':
        # cyan spiral eyes
        r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
        eye=(g>150)&(b>170)&(r<170)&reg
        eye=dil(eye,9); eye=fill(eye)
    else:
        white=(mn>175)&(sat<.22)&reg
        if n=='glitzi':
            r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
            iris=(r>170)&(b<140)&(g>40)&reg
            white=white|iris
            eye=fill(dil(white,11))
        else:
            eye=fill(dil(white,5))
    # keep the two biggest blobs
    cs=sorted(comps(eye),key=len,reverse=True)[:2]
    m=np.zeros((H,W),bool)
    for c in cs:
        for y,x in c: m[y,x]=True
    m=fill(m); m=dil(m,7)
    boxes=[]
    for c in cs:
        ys=[p[0] for p in c]; xs=[p[1] for p in c]
        boxes.append((min(xs),min(ys),max(xs),max(ys)))
    boxes.sort()
    # skin texture: the face-cleaned body layer, framed like the approved art and colour-matched
    body=trim(Image.open(f'assets/rig/{n}-body.png').convert('RGBA')).resize((W,H),Image.LANCZOS)
    B=np.asarray(body).astype(float)
    ring=dil(m,25)&~m&(A[...,3]>200)
    for ch in range(3):
        t=rgb[...,ch][ring]; s=B[...,ch][ring]
        B[...,ch]=np.clip((B[...,ch]-s.mean())*(t.std()/max(s.std(),1))+t.mean(),0,255)
    alpha=np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))).astype(float)
    out=np.dstack([B[...,:3],alpha]).astype(np.uint8)
    lid=Image.fromarray(out,'RGBA')
    from PIL import ImageDraw
    ink={'pipzi':(74,6,16),'boppo':(58,6,2),'glitzi':(8,10,40),'zuzu':(58,0,82)}[n]
    dr=ImageDraw.Draw(lid)
    for (x0,y0,x1,y1) in boxes:
        w=x1-x0; h=y1-y0; cx=(x0+x1)/2
        if n=='glitzi':
            y=y0+h*.55; dr.line([(cx-w*.36,y-2),(cx+w*.36,y+3)],fill=ink+(235,),width=11)
        else:
            y=y0+h*.52; bb=[cx-w*.36, y-h*.28, cx+w*.36, y+h*.28]
            dr.arc(bb,start=20,end=160,fill=ink+(240,),width=11)
    lid=lid.filter(ImageFilter.SMOOTH)
    lid.save(f'landing/assets/{n}-lids.webp','WEBP',quality=86,method=6)
    # preview: closed
    pv=web.copy(); pv.alpha_composite(lid)
    both=Image.new('RGBA',(W*2,H),(255,255,255,255)); both.alpha_composite(web,(0,0)); both.alpha_composite(pv,(W,0))
    both.convert('RGB').resize((W,H//2)).save(f'{SP}/lid-{n}.png')
    import json; json.dump({'top':min(b[1] for b in boxes)/H,'bottom':max(b[3] for b in boxes)/H},open(f'{SP}/lid-{n}.json','w')); print(n,'eyes',[(round(b[0]/W,3),round(b[1]/H,3),round(b[2]/W,3),round(b[3]/H,3)) for b in boxes])
