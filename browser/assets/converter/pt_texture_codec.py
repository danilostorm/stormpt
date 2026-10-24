#!/usr/bin/env python3
"""Decode original StormPT bitmap/TGA header obfuscation.
Verbatim algorithm from SrcGame/src/smLib3d/smTexture.cpp DecryptBMP/DecryptTGA;
does not alter source files. Only 14 or 18 header bytes are affected.
"""
from pathlib import Path
from io import BytesIO
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent/'vendor'))
from PIL import Image

def restored_bytes(source: bytes, extension:str):
 p=bytearray(source)
 ext=extension.lower().lstrip('.')
 if ext=='bmp':
  if len(p)<14:raise ValueError('BMP too short')
  if p[:2]!=b'BM':
   p[0:2]=b'BM'
   for c in range(2,14):p[c]=(p[c]-c*c)&255
  p[2:6]=bytes(4)
 elif ext in ('tga','png','sta'):
  if len(p)<18:raise ValueError('TGA too short')
  if p[:2]==b'G8':
   p[0:2]=b'\0\0'
   for c in range(2,18):p[c]=(p[c]-c*c)&255
 else:raise ValueError('Only BMP/TGA headers are supported')
 return bytes(p)

def to_png(src:Path):
 decoded=restored_bytes(src.read_bytes(),src.suffix)
 with Image.open(BytesIO(decoded)) as im:
  im.load()
  bands=im.getbands()
  rgba=im.convert('RGBA' if 'A' in bands or 'transparency' in im.info else 'RGB')
  out=BytesIO();rgba.save(out,format='PNG',compress_level=6)
 return out.getvalue(),{'source':str(src),'resolution':rgba.size,'mode':rgba.mode,'originalBytes':src.stat().st_size,'pngBytes':out.tell()}

if __name__=='__main__':
 import json
 for path in sys.argv[1:]:
  b,stats=to_png(Path(path))
  out=Path(path).with_suffix('.decoded.png')
  out.write_bytes(b)
  print(json.dumps(stats|{'output':str(out)}))
