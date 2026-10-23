using System;
using System.IO;
using System.Text;
using System.Reflection;
class NativeIssuerQA {
 static object Call(string name, params object[] args) {
  return typeof(StormPTBrowserTicket).GetMethod(name,BindingFlags.NonPublic|BindingFlags.Static).Invoke(null,args);
 }
 static void Main() {
  string key="StormPT-QA-ONLY-Not-A-Production-Key-20261023";
  string json="{\"aud\":\"stormpt-gameserver\",\"account\":\"webqatest\",\"exp\":1792756845,\"nonce\":\"AAECAwQFBgcICQoLDA0ODw\",\"sid\":\"0123456789abcdef0123456789abcdef\"}";
  string p=(string)Call("Base64Url",Encoding.UTF8.GetBytes(json));
  string sig=(string)Call("Base64Url",(object)(byte[])Call("Hmac",key,p));
  File.WriteAllText("csharp-ticket.txt",p+"."+sig);
  Console.WriteLine("ASP.NET issuer helper compiled and produced synthetic GameServer ticket");
 }
}