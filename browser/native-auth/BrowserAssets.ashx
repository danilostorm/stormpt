<%@ WebHandler Language="C#" Class="StormPTBrowserAssets" %>
using System;
using System.IO;
using System.Web;
using System.Web.SessionState;
public sealed class StormPTBrowserAssets : IHttpHandler, IReadOnlySessionState {
 public bool IsReusable {get{return false;}}
 private static void Fail(HttpContext c,int status){c.Response.StatusCode=status;c.Response.ContentType="text/plain";c.Response.Write("not_authorized");}
 public void ProcessRequest(HttpContext c){
  c.Response.TrySkipIisCustomErrors=true;c.Response.Cache.SetCacheability(HttpCacheability.Private);
  c.Response.Cache.SetNoStore();c.Response.Headers["X-Content-Type-Options"]="nosniff";
  c.Response.Headers["Referrer-Policy"]="no-referrer";
  if(c.Request.HttpMethod!="GET"&&c.Request.HttpMethod!="HEAD"){Fail(c,405);return;}
  if(c.Request.UserHostAddress!="192.168.30.10"||c.Request.Headers["X-Forwarded-Proto"]!="https"){Fail(c,403);return;}
  var origin=c.Request.Headers["Origin"];var site=c.Request.Headers["Sec-Fetch-Site"];
  if((origin!=null&&origin!="https://stormpt.hoststorm.com.br")||(site!=null&&site!="same-origin"&&site!="none")){Fail(c,403);return;}
  string account=c.Session==null?null:c.Session["StormPTPlayer"] as string,allowed=null;
  try{allowed=File.ReadAllText(@"C:\StormPT-2703\BrowserSecrets\qa-account.txt").Trim();}catch{Fail(c,503);return;}
  if(String.IsNullOrEmpty(account)){Fail(c,401);return;}
  bool permitted=false;foreach(string entry in allowed.Split(new char[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries))if(String.Equals(account,entry.Trim(),StringComparison.Ordinal))permitted=true;
  if(!permitted){Fail(c,403);return;}
  string filename;
  switch(c.Request.QueryString["asset"]){
   case "ricarten":filename="Ricarten.textured.glb";break;
   case "ricarten-music":filename="ricarten-original-music.wav";break;
   case "ricarten-ambient":filename="ricarten-original-ambient.wav";break;
   case "fighter-body":filename="tmbB01.bind.textured.glb";break;
   case "fighter-head":filename="tmh-B01.bind.textured.glb";break;
   case "fighter-body-animated":filename="tmbB01.skinned.textured.glb";break;
   case "fighter-head-animated":filename="tmh-B01.skinned.textured.glb";break;
   case "fighter-motion":filename="fighter-motion.ptan";break;
   case "npc-blacksmith":filename="TN-004.idle.textured.glb";break;
   case "npc-mix":filename="Teacher03.idle.textured.glb";break;
   case "npc-enzo":filename="enzo.idle.textured.glb";break;
   case "npc-craftsman":filename="TN-012.idle.textured.glb";break;
   case "npc-moriph":filename="MN-007.idle.textured.glb";break;
   case "npc-beauty":filename="maskedwoman.idle.textured.glb";break;
   case "npc-stones":filename="Bcn03.idle.textured.glb";break;
   case "npc-guard":filename="TN-010.idle.textured.glb";break;
   case "npc-bcn05":filename="Bcn05.idle.textured.glb";break;
   case "npc-cash":filename="cash.idle.textured.glb";break;
   case "npc-teacher2":filename="Teacher02.idle.textured.glb";break;
   case "npc-tn005":filename="TN-005.idle.textured.glb";break;
   case "npc-stella":filename="STELLA.idle.textured.glb";break;
   case "npc-dmeca":filename="dmeca.idle.textured.glb";break;
   default:Fail(c,404);return;
  }
  string path=Path.Combine(@"C:\StormPT-2703\BrowserAssets",filename);
  if(!File.Exists(path)){Fail(c,503);return;}
  c.Response.ContentType=filename.EndsWith(".wav",StringComparison.Ordinal)?"audio/wav":filename.EndsWith(".ptan",StringComparison.Ordinal)?"application/octet-stream":"model/gltf-binary";
  c.Response.AddHeader("Content-Length",new FileInfo(path).Length.ToString());
  if(c.Request.HttpMethod=="GET")c.Response.TransmitFile(path);
 }
}
