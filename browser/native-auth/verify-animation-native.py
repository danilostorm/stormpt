from pathlib import Path
import sys,struct,json
sys.path.insert(0,'/mnt/user/appdata/stormpt-browser/assets/converter')
from animated_model_glb import bones,clips
from qga_dev import write,run
base=Path('/mnt/user/appdata/stormpt-browser/research/animation')
def function(source,signature):
 p=source.index(signature);o=source.index('{',p);depth=1;i=o+1
 while depth:
  if source[i]=='{':depth+=1
  if source[i]=='}':depth-=1
  i+=1
 return source[p:i]
math=(base/'smmatrix.cpp').read_text(encoding='latin1')
obj=(base/'smObj3d.cpp').read_text(encoding='latin1')
fields=','.join('_'+str(r)+str(c) for r in range(1,5) for c in range(1,5))
s='#include <windows.h>\n#include <cmath>\n#include <cstdio>\n#include <vector>\n#include <cstring>\n#include <functional>\n#define fONE 256\n#define FLOATNS 8\nconst float g_PI=3.14159265358979323846f;\n'
s+='struct smMATRIX {int '+fields+';};\nstruct smFMATRIX {float '+fields+';};\n'
s+='struct smTM_ROT{int frame;float x,y,z,w;};struct smTM_POS{int frame;float x,y,z;};struct smTM_SCALE{int frame,x,y,z;};struct smFRAME_POS{int StartFrame,EndFrame,PosNum,PosCnt;};struct SMotionStEndInfo{DWORD StartFrame,EndFrame;};\n'
s+='struct {int m_dwRenderType=0;} smRender;void smRotateXMatrix(smMATRIX&,int){}void smRotateYMatrix(smMATRIX&,int){}void smRotateZMatrix(smMATRIX&,int){}\n'
for name in ['void smIdentityMatrix(','void smMatrixMult(','VOID D3DMath_QuaternionSlerp(','void smFIdentityMatrix(','void smFMatrixMult(','void smFMatrixFromQuaternion(','void smFMatrixFromMatrix(','void smMatrixFromFMatrix(']:s+=function(math,name)+'\n'
s+='struct smOBJ3D {smMATRIX Tm,TmInvert,TmRotate,mWorld,mLocal;smFMATRIX TmResult;smOBJ3D*pParent=nullptr;int px,py,pz,TmRotCnt,TmPosCnt,TmScaleCnt,TmFrameCnt;smTM_ROT*TmRot;smTM_POS*TmPos;smTM_SCALE*TmScale;smFMATRIX*TmPrevRot;smFRAME_POS TmRotFrame[32],TmPosFrame[32],TmScaleFrame[32];int GetRotFrame(smFMATRIX&,smFMATRIX*,smTM_ROT*,int,SMotionStEndInfo*);int GetPosFrame(float&,float&,float&,smTM_POS*,int);int GetScaleFrame(int&,int&,int&,smTM_SCALE*,int);int GetTmFramePos(int);int GetTmFrameScale(int);int GetTmFrameRot(int);int TmAnimation(int,int,int,int,SMotionStEndInfo*);};\n'
for name in ['int smOBJ3D::GetRotFrame(','int smOBJ3D::GetPosFrame(','int smOBJ3D::GetScaleFrame(','int smOBJ3D::GetTmFramePos(','int smOBJ3D::GetTmFrameScale(','int smOBJ3D::GetTmFrameRot(','int smOBJ3D::TmAnimation(int frame, int ax, int ay, int az, SMotionStEndInfo *lpFrameInfo)']:s+=function(obj,name)+'\n'
s+=r"""
int main(){
 FILE*f=fopen("C:/StormPT-2703/Cliente/char/tmABCD/m1.smb","rb");if(!f)return 2;
 fseek(f,0,SEEK_END);int size=ftell(f);rewind(f);std::vector<char>b(size);fread(b.data(),1,size,f);fclose(f);
 auto I=[&](int p){int v;memcpy(&v,b.data()+p,4);return v;};
 int n=I(24);if(n!=64)return 3;std::vector<smOBJ3D>bs(n);std::vector<std::string> names(n),parents(n);
 for(int i=0;i<n;i++){
 int o=I(556+i*40+36);auto&v=bs[i];names[i]=b.data()+o+172;parents[i]=b.data()+o+204;
 memcpy(&v.Tm,b.data()+o+240,64);memcpy(&v.TmInvert,b.data()+o+304,64);memcpy(&v.TmRotate,b.data()+o+432,64);
 v.px=I(o+656);v.py=I(o+660);v.pz=I(o+664);v.TmRotCnt=I(o+684);v.TmPosCnt=I(o+688);v.TmScaleCnt=I(o+692);v.TmFrameCnt=I(o+2232);
 memcpy(v.TmRotFrame,b.data()+o+696,512);memcpy(v.TmPosFrame,b.data()+o+1208,512);memcpy(v.TmScaleFrame,b.data()+o+1720,512);
 int p=o+2236+I(o+84)*24+I(o+88)*36+I(o+92)*32;
 v.TmRot=(smTM_ROT*)(b.data()+p);p+=v.TmRotCnt*20;
 v.TmPos=(smTM_POS*)(b.data()+p);p+=v.TmPosCnt*16;
 v.TmScale=(smTM_SCALE*)(b.data()+p);p+=v.TmScaleCnt*16;
 v.TmPrevRot=(smFMATRIX*)(b.data()+p);
 }
 for(int i=0;i<n;i++)for(int j=0;j<n;j++)if(parents[i]==names[j])bs[i].pParent=&bs[j];
 FILE*out=fopen("C:/StormPT-2703/BrowserQA/animation-oracle.bin","wb");if(!out)return 4;
"""
s=s.replace('#include <functional>','#include <functional>\n#include <string>')
smb,_=bones()
for c in clips(smb):
 count=__import__('math').ceil((c['end']-c['start'])/5600*20)
 for i in range(count):
  frame=c['start']+int(i*(c['end']-c['start'])/count)
  s+='{SMotionStEndInfo info={'+str(c['start'])+','+str(c['end'])+'};bool done[64]={};std::function<void(int)>eval=[&](int i){if(done[i])return;if(bs[i].pParent)eval(int(bs[i].pParent-bs.data()));bs[i].TmAnimation('+str(frame)+',0,0,0,&info);done[i]=true;};for(int i=0;i<n;i++){eval(i);fwrite(&bs[i].mWorld,1,64,out);}}\n'
s+='fclose(out);puts("NATIVE_ANIMATION_ORACLE_OK");return 0;}'
write('C:/StormPT-2703/BrowserQA/animation-oracle.cpp',s.encode())
bat='@echo off\r\ncall C:\\Program\\VC\\Auxiliary\\Build\\vcvars32.bat >nul\r\ncd /d C:\\StormPT-2703\\BrowserQA\r\ncl /nologo /std:c++17 /EHsc /fp:precise animation-oracle.cpp /Fe:animation-oracle.exe > animation-oracle-build.log 2>&1\r\nif errorlevel 1 exit /b 1\r\nanimation-oracle.exe\r\n'
write('C:/StormPT-2703/BrowserQA/animation-oracle.cmd',bat.encode())
print(run("& cmd.exe /c 'C:/StormPT-2703/BrowserQA/animation-oracle.cmd'",wait=False))
