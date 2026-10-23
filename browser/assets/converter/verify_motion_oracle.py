#!/usr/bin/env python3
"""Compare exported matrices with a private oracle built from original C++."""
from pathlib import Path
import struct,json
ROOT=Path('/mnt/user/appdata/stormpt-browser')
def verify():
 native=(ROOT/'research/animation/oracle.bin').read_bytes()
 packed=(ROOT/'assets/converted/fighter-motion.ptan').read_bytes()
 magic,version,bones,clips=struct.unpack_from('<4I',packed)
 assert (magic,version,bones,clips)==(0x4e415450,1,64,2)
 offset=16+clips*32;data=packed[offset:]
 assert len(native)==len(data) and len(native)%64==0
 count=len(native)//4;a=struct.unpack('<'+str(count)+'i',native);b=struct.unpack('<'+str(count)+'f',data)
 order=[0,2,1,3]
 differences=[abs(a[p+order[r]*4+order[c]]-round(b[p+r*4+c]*256)) for p in range(0,count,16) for r in range(4) for c in range(4)]
 result=dict(samples=count//(bones*16),bones=bones,components=count,maxFixedPointDifference=max(differences),differentComponents=sum(x>0 for x in differences),largeDifferences=sum(x>1 for x in differences),allowedFixedPointDifference=1,passed=max(differences)<=1)
 (ROOT/'assets/validation/fighter-motion-native-comparison.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result));assert result['passed']
if __name__=='__main__':verify()
