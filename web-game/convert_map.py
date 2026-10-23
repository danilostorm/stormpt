#!/usr/bin/env python3
"""StormPT SMD Stage 0.72 -> minimal WebGL mesh preview.
Reads owner's local game assets; never publishes original SMD/SQL/source.
Layout determined from StormPT 32-bit smStage3d.h and smType.h.
"""
from pathlib import Path
import struct, json, gzip, collections, hashlib, sys

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "private" / "pilai.smd"
SITE = ROOT / "site"
SCALE=256.
HEADER_SIZE=556
STAGE_STRUCT_SIZE=262260
STAGE_COUNTS_OFFSET=262196
VERTEX_SIZE=28
FACE_SIZE=28
OUT_STRUCT=struct.Struct('<fffBBBB')
def u32(b, off):
    return struct.unpack_from('<I',b,off)[0]

def main():
    raw=SOURCE.read_bytes()
    if not raw.startswith(b"SMD Stage data Ver 0.72\0"):
        raise ValueError('Unrecognized SMD Stage header')
    mat_count = u32(raw,28)
    if not (1<=mat_count<=5000):
        raise ValueError("Bad material count")
    nvertices,nfaces,ntexlinks,nlights = struct.unpack_from('<4I',raw,HEADER_SIZE+STAGE_COUNTS_OFFSET)
    if nvertices>1_000_000 or nfaces>1_000_000 or nvertices<3 or nfaces<1:
        raise ValueError("Implausible vertex/face count")
    # Original SaveFile writes the in-memory stage structure before materials.
    # Header.First_ObjInfoPoint was computed without sizeof(smSTAGE3D).
    start=STAGE_STRUCT_SIZE+u32(raw,36)
    faces_start=start + nvertices*VERTEX_SIZE
    if faces_start+nfaces*FACE_SIZE>len(raw):
        raise ValueError("Truncated mesh")
    verts=[]
    for i in range(nvertices):
        off=start+i*VERTEX_SIZE
        x,y,z,r,g,b,a=struct.unpack_from('<iii4h',raw,off+8)
        verts.append((x/SCALE,y/SCALE,z/SCALE,max(0,min(255,r)),max(0,min(255,g)),max(0,min(255,b))))
    mins=[min(v[k] for v in verts) for k in range(3)]
    maxs=[max(v[k] for v in verts) for k in range(3)]
    center=[(mins[k]+maxs[k])/2 for k in range(3)]
    output=bytearray()
    materials=collections.Counter()
    for i in range(nfaces):
        a,b,c,mat=struct.unpack_from('<4H',raw,faces_start+i*FACE_SIZE+8)
        if max(a,b,c)>=nvertices:
            raise ValueError(f'Out of bounds face {i}')
        materials[mat]+=1
        for index in (a,b,c):
            x,y,z,r,g,bv=verts[index]
            # Preserve authentic baked vertex shading; visually separate materials
            # without claiming that final material/texture translation is complete.
            tint=((mat*23)%31)-15
            col=(max(0,min(255,r+tint)),max(0,min(255,g+tint//2)),max(0,min(255,bv+tint//3)))
            output+=OUT_STRUCT.pack(x-center[0], y-center[1], z-center[2], *col, 255)
    SITE.mkdir(parents=True,exist_ok=True)
    (SITE/'pillai.bin').write_bytes(output)
    with gzip.open(SITE/'pillai.bin.gz','wb',compresslevel=6) as f:
        f.write(output)
    meta={
        "map":"Pillai", "source_file":"Field/forever-fall/pilai.smd",
        "format":"SMD Stage data Ver 0.72", "stage_vertices":nvertices,
        "stage_faces":nfaces, "stage_texlinks":ntexlinks,
        "materials_declared":mat_count, "materials_referenced":len(materials),
        "triangle_vertices":nfaces*3, "stride":16,
        "bounds":{"min":mins,"max":maxs,"center":center},
        "size":[maxs[k]-mins[k] for k in range(3)],
        "asset_revision":hashlib.sha256(raw).hexdigest()[:12],
        "status":"Geometria original convertida; texturas, personagens e multiplayer pendentes."
    }
    (SITE/'manifest.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf8')
    print(json.dumps({"stage_vertices":nvertices,"faces":nfaces,"materials":len(materials),"output_size":len(output),"gzip_size":(SITE/'pillai.bin.gz').stat().st_size,"bounds":meta["bounds"]},ensure_ascii=False))
if __name__=='__main__': main()
