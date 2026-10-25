$ErrorActionPreference='Stop'
$d='C:/StormPTBrowserQA'
New-Item -ItemType Directory -Force $d|Out-Null
$cs=@'
using System;using System.Collections.Generic;using System.Runtime.InteropServices;
public class StormPTDxgi{
 [DllImport("dxgi.dll")]static extern int CreateDXGIFactory1(ref Guid iid,out IntPtr factory);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)]delegate int EnumFn(IntPtr self,uint index,out IntPtr adapter);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)]delegate int DescFn(IntPtr self,out Desc desc);
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct Desc{
 [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)]public string Name;
 public uint VendorId,DeviceId,SubSysId,Revision;
 public UIntPtr DedicatedVideoMemory,DedicatedSystemMemory,SharedSystemMemory;
 public uint Low;public int High;public uint Flags;}
 public static Desc[] Enumerate(){
 Guid id=new Guid("770AAE78-F26F-4DBA-A829-253C83D1B387");IntPtr f;Marshal.ThrowExceptionForHR(CreateDXGIFactory1(ref id,out f));
 var result=new List<Desc>();
 try{var en=(EnumFn)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(f),12*IntPtr.Size),typeof(EnumFn));
 for(uint i=0;i<16;i++){IntPtr a;if(en(f,i,out a)!=0)break;try{var desc=(DescFn)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(a),10*IntPtr.Size),typeof(DescFn));Desc d;Marshal.ThrowExceptionForHR(desc(a,out d));result.Add(d);}finally{Marshal.Release(a);}}
 }finally{Marshal.Release(f);}return result.ToArray();}
}
'@
Add-Type -TypeDefinition $cs
$gpu=[StormPTDxgi]::Enumerate()|Where-Object {$_.Name -like '*GTX 1650*' -and $_.VendorId -eq 4318}|Select-Object -First 1
if(!$gpu){throw 'Expected hardware GPU absent'}
$u=(Get-CimInstance Win32_ComputerSystem).UserName
if(!$u){throw 'Interactive user session required'}
& icacls.exe $d /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' ($u+':(OI)(CI)M')|Out-Null
if(Get-ScheduledTask StormPTBrowserGPUQA -ErrorAction SilentlyContinue){throw 'QA task already exists; stop previous test first'}
$luid=([string]$gpu.High)+','+([string]$gpu.Low)
$arguments='--headless=new --enable-gpu --use-angle=d3d11 --use-adapter-luid='+$luid+' --remote-debugging-port=9227 --remote-debugging-address=127.0.0.1 --user-data-dir=C:/StormPTBrowserQA/chrome-profile --no-first-run --no-default-browser-check about:blank'
$a=New-ScheduledTaskAction -Execute 'C:/Program Files/Google/Chrome/Application/chrome.exe' -Argument $arguments
$p=New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName StormPTBrowserGPUQA -Action $a -Principal $p|Out-Null
Start-ScheduledTask StormPTBrowserGPUQA
[pscustomobject]@{gpu=$gpu.Name;adapterLuid=$luid;debugBind='127.0.0.1:9227'}|ConvertTo-Json -Compress
