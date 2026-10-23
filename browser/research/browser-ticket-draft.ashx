<%@ WebHandler Language="C#" Class="StormPTBrowserTicket" %>

using System;
using System.IO;
using System.Web;
using System.Web.SessionState;
using System.Text;
using System.Text.RegularExpressions;
using System.Security.Cryptography;

/*
 * NOT DEPLOYED. Intended for C:\inetpub\stormpt\BrowserTicket.ashx ONLY
 * after security review and a matching shared secret is configured in IIS.
 * Integrates the real game account session used by Conta.aspx:
 * Session["StormPTPlayer"] and Session["StormPTCsrf"].
 *
 * Does not read/write SQL and does not bypass the original GameServer login.
 * Must be HTTPS-only behind the trusted StormPT reverse proxy.
 */
public sealed class StormPTBrowserTicket : IHttpHandler, IReadOnlySessionState
{
    private static string LoadKey(string variable,string filename) {
        string value=Environment.GetEnvironmentVariable(variable);
        if(!String.IsNullOrEmpty(value))return value;
        try { return File.ReadAllText(@"C:\StormPT-2703\BrowserSecrets\"+filename).Trim(); }
        catch { return null; }
    }
    public bool IsReusable { get { return false; } }
    private const string Origin = "https://stormpt.hoststorm.com.br";
    private static string Base64Url(byte[] data) {
        return Convert.ToBase64String(data).TrimEnd('=').Replace('+','-').Replace('/','_');
    }
    private static byte[] Hmac(string key, string value) {
        using (var h = new HMACSHA256(Encoding.UTF8.GetBytes(key))) {
            return h.ComputeHash(Encoding.UTF8.GetBytes(value));
        }
    }
    private static bool Equal(string a,string b) {
        if(a==null||b==null)return false;
        byte[] x=Encoding.UTF8.GetBytes(a),y=Encoding.UTF8.GetBytes(b);
        int diff=x.Length^y.Length;
        for(int i=0;i<Math.Max(x.Length,y.Length);i++)
            diff|=(i<x.Length?x[i]:0)^(i<y.Length?y[i]:0);
        return diff==0;
    }
    private static string HexPrefix(byte[] bytes, int n) {
        var sb=new StringBuilder(n*2);
        for(int i=0;i<n;i++)sb.Append(bytes[i].ToString("x2"));
        return sb.ToString();
    }
    private static void Fail(HttpContext c,int code) {
        c.Response.StatusCode=code;
        c.Response.ContentType="application/json; charset=utf-8";
        c.Response.Write("{\"error\":\"not_authorized\"}");
    }
    public void ProcessRequest(HttpContext c) {
        c.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        c.Response.Cache.SetNoStore();
        c.Response.Headers["X-Content-Type-Options"]="nosniff";
        c.Response.Headers["Referrer-Policy"]="no-referrer";
        if(c.Request.HttpMethod!="POST") { Fail(c,405);return; }
        if(!Equal(c.Request.Headers["Origin"],Origin)) { Fail(c,403);return; }
        var session=c.Session;
        string account=session==null?null:session["StormPTPlayer"] as string;
        string csrf=session==null?null:session["StormPTCsrf"] as string;
        if(account==null || !Regex.IsMatch(account,@"^[A-Za-z][A-Za-z0-9_]{3,15}$") ||
           csrf==null || !Equal(csrf,c.Request.Headers["X-StormPT-Csrf"])) {
            Fail(c,401);return;
        }
        // Pilot: only the explicitly configured test account may request tickets.
        string allowed=null;
        try { allowed=File.ReadAllText(@"C:\StormPT-2703\BrowserSecrets\qa-account.txt").Trim(); }
        catch { Fail(c,503);return; }
        if(!Equal(account,allowed)) { Fail(c,403);return; }
        if(c.Request.UserHostAddress!="192.168.30.10" ||
           c.Request.Headers["X-Forwarded-Proto"]!="https") { Fail(c,403);return; }
        // Never hardcode this secret in a source file, GitHub, or web.config.
        string secret=LoadKey("STORMPT_BROWSER_HMAC","gateway.hmac");
        string gameSecret=LoadKey("STORMPT_GAMESERVER_HMAC","gameserver.hmac");
        if(String.IsNullOrEmpty(secret)||secret.Length<32 ||
           String.IsNullOrEmpty(gameSecret)||gameSecret.Length<32 || Equal(secret,gameSecret)) {
            Fail(c,503);return;
        }
        long expires=(long)(DateTime.UtcNow-new DateTime(1970,1,1)).TotalSeconds+45;
        byte[] nonceBytes=new byte[16];
        using(var rng=RandomNumberGenerator.Create())rng.GetBytes(nonceBytes);
        string nonce=Base64Url(nonceBytes);
        string sid=HexPrefix(Hmac(secret,session.SessionID),16);
        // Username is strict ASCII alphanumeric/underscore, so no JSON escape risk.
        string payload="{\"aud\":\"stormpt-browser-tcp\",\"account\":\""+account+
                       "\",\"exp\":"+expires+",\"nonce\":\""+nonce+
                       "\",\"sid\":\""+sid+"\"}";
        string encoded=Base64Url(Encoding.UTF8.GetBytes(payload));
        string ticket=encoded+"."+Base64Url(Hmac(secret,encoded));
        // Separate credential/key: a transport ticket must never authorize GameServer.
        string gamePayload=payload.Replace("stormpt-browser-tcp","stormpt-gameserver");
        string gameEncoded=Base64Url(Encoding.UTF8.GetBytes(gamePayload));
        string gameTicket=gameEncoded+"."+Base64Url(Hmac(gameSecret,gameEncoded));
        c.Response.ContentType="application/json; charset=utf-8";
        c.Response.Write("{\"account\":\""+account+"\",\"ticket\":\""+ticket+
                         "\",\"gameTicket\":\""+gameTicket+"\",\"expiresIn\":45}");
    }
}
