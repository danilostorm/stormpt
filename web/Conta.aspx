<%@ Page Language="C#" ResponseEncoding="utf-8" Culture="pt-BR" UICulture="pt-BR" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.Web" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Text.RegularExpressions" %>
<%@ Import Namespace="System.Data" %>
<%@ Import Namespace="System.Data.SqlClient" %>
<%@ Import Namespace="System.Security.Cryptography" %>
<script runat="server">
string view="login", message="", alertClass="error", user="", email="", character="—", level="—", created="—";
bool signedIn=false;
const int rounds=190000;
string db=@"Server=.\SQLEXPRESS;Database=AccountDB;Integrated Security=True;Connect Timeout=5;Encrypt=False";
string Esc(object x){return Server.HtmlEncode(Convert.ToString(x??""));}
static byte[] RandomBytes(int n){byte[] b=new byte[n];using(RandomNumberGenerator rng=RandomNumberGenerator.Create())rng.GetBytes(b);return b;}
static byte[] PasswordHash(string pwd,byte[] salt,int iterations){using(var kdf=new Rfc2898DeriveBytes(pwd,salt,iterations))return kdf.GetBytes(32);}
static bool ConstantTimeEqual(byte[] x,byte[] y){if(x==null||y==null)return false;int d=x.Length^y.Length;int n=Math.Max(x.Length,y.Length);for(int i=0;i<n;i++)d|=(i<x.Length?x[i]:0)^(i<y.Length?y[i]:0);return d==0;}
string GetIp(){string v=Request.Headers["CF-Connecting-IP"];System.Net.IPAddress parsed; if(String.IsNullOrEmpty(v)||!System.Net.IPAddress.TryParse(v,out parsed))v=Request.UserHostAddress;return v??"unknown";}
bool Limited(string id,int max){string key="stpt_web_form:"+id;int v=HttpRuntime.Cache[key] is int?(int)HttpRuntime.Cache[key]:0;if(v>=max)return true;HttpRuntime.Cache.Insert(key,v+1,null,DateTime.UtcNow.AddMinutes(15),System.Web.Caching.Cache.NoSlidingExpiration);return false;}
void Page_Load(object sender,EventArgs e){
  view=(Request.QueryString["view"]??"login").ToLowerInvariant();
  if(view!="cadastro"&&view!="login"&&view!="painel")view="login";
  if(Session["StormPTCsrf"]==null)Session["StormPTCsrf"]=Convert.ToBase64String(RandomBytes(32));
  signedIn=Session["StormPTPlayer"] is string;
  if(signedIn)user=(string)Session["StormPTPlayer"];
  if(String.Equals(Request.HttpMethod,"POST",StringComparison.OrdinalIgnoreCase)){
    if(!String.Equals(Request.Form["csrf"],Session["StormPTCsrf"] as string,StringComparison.Ordinal)){message="A sessão do formulário expirou. Atualize a página.";return;}
    try {
      string action=Request.Form["action"]??"";
      if(action=="register"){view="cadastro";Register();}
      else if(action=="login"){view="login";Login();}
      else if(action=="logout"){Session.Remove("StormPTPlayer");signedIn=false;user="";view="login";}
    }catch(SqlException ex){System.Diagnostics.Trace.TraceError("StormPT account SQL "+ex.Number+": "+ex.Message);message="Não foi possível concluir a solicitação agora. Tente novamente em instantes.";}
    catch(Exception ex){System.Diagnostics.Trace.TraceError("StormPT account error "+ex.GetType().Name);message="Não foi possível concluir a solicitação agora. Tente novamente em instantes.";}
  }
  if(signedIn){view="painel";LoadProfile();}
}
SqlCommand Command(SqlConnection c,SqlTransaction tr,string sql){var command=new SqlCommand(sql,c,tr);command.CommandTimeout=8;return command;}
void Register(){
  if(Limited("ip:"+GetIp(),12)){message="Muitas solicitações. Tente novamente em 15 minutos.";return;}
  if(!String.IsNullOrWhiteSpace(Request.Form["website"])){message="Não foi possível processar o formulário.";return;}
  string name=(Request.Form["usuario"]??"").Trim(),mail=(Request.Form["email"]??"").Trim().ToLowerInvariant(),pwd=Request.Form["senha"]??"",rep=Request.Form["confirmar"]??"";
  if(!Regex.IsMatch(name,@"^[A-Za-z][A-Za-z0-9_]{3,15}$")){message="Use de 4 a 16 caracteres, começando por uma letra.";return;}
  if(mail.Length>160||!Regex.IsMatch(mail,@"^[^\s@]{1,60}@[^\s@]{1,95}\.[A-Za-z]{2,12}$")){message="Informe um e-mail válido.";return;}
  if(pwd.Length<8||pwd.Length>24||!Regex.IsMatch(pwd,@"^[\x21-\x7e]+$")){message="A senha deve ter de 8 a 24 caracteres sem espaços.";return;}
  if(!String.Equals(pwd,rep,StringComparison.Ordinal)){message="As senhas digitadas são diferentes.";return;}
  string shard=name.Substring(0,1).ToUpperInvariant();
  using(var c=new SqlConnection(db)){c.Open();using(var tr=c.BeginTransaction(IsolationLevel.Serializable)){
    using(var check=Command(c,tr,"SELECT COUNT(*) FROM dbo.AllGameUser WITH(UPDLOCK,HOLDLOCK) WHERE userid=@u; SELECT COUNT(*) FROM dbo.StormPTWebUsers WITH(UPDLOCK,HOLDLOCK) WHERE UserID=@u OR Email=@e;")){
      check.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;
      check.Parameters.Add("@e",SqlDbType.NVarChar,160).Value=mail;
      using(var rd=check.ExecuteReader()){rd.Read();int exists=rd.GetInt32(0);rd.NextResult();rd.Read();exists+=rd.GetInt32(0);if(exists>0){message="Usuário ou e-mail já cadastrado.";return;}}
    }
    int no;
    using(var add=Command(c,tr,"INSERT dbo.ALLPersonalMember (Userid,Passwd,Email,DelChk,RegistDay) OUTPUT INSERTED.PMNo VALUES (@u,@p,@e,'0',GETDATE())")){
      add.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;add.Parameters.Add("@p",SqlDbType.VarChar,32).Value=pwd;
      add.Parameters.Add("@e",SqlDbType.VarChar,200).Value=mail;no=Convert.ToInt32(add.ExecuteScalar());
    }
    using(var add=Command(c,tr,"INSERT dbo.["+shard+"PersonalMember] (PMNo,Userid,Passwd,Email,DelChk,RegistDay) VALUES (@n,@u,@p,@e,'0',GETDATE())")){
      add.Parameters.Add("@n",SqlDbType.Int).Value=no;add.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;
      add.Parameters.Add("@p",SqlDbType.VarChar,32).Value=pwd;add.Parameters.Add("@e",SqlDbType.VarChar,200).Value=mail;add.ExecuteNonQuery();
    }
    foreach(string table in new[]{"AllGameUser",shard+"GameUser"}){
      using(var add=Command(c,tr,"INSERT dbo.["+table+"] (userid,Passwd,RegistDay,inuse,Grade,EventChk,SelectChk,BlockChk,SpecialChk,Credit,DelChk) VALUES (@u,@p,GETDATE(),'0','0','0','0','0','0','0','0')")){
        add.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;add.Parameters.Add("@p",SqlDbType.VarChar,32).Value=pwd;add.ExecuteNonQuery();
      }
    }
    byte[] salt=RandomBytes(32),hash=PasswordHash(pwd,salt,rounds);
    using(var add=Command(c,tr,"INSERT dbo.StormPTWebUsers (UserID,Email,Salt,PasswordHash,Iterations) VALUES (@u,@e,@s,@h,@i)")){
      add.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;add.Parameters.Add("@e",SqlDbType.NVarChar,160).Value=mail;
      add.Parameters.Add("@s",SqlDbType.VarBinary,32).Value=salt;add.Parameters.Add("@h",SqlDbType.VarBinary,32).Value=hash;
      add.Parameters.Add("@i",SqlDbType.Int).Value=rounds;add.ExecuteNonQuery();
    }
    tr.Commit();
    signedIn=true;user=name;view="painel";Session["StormPTPlayer"]=name;alertClass="success";message="Conta criada com sucesso! Você já pode entrar no jogo com esse usuário e senha.";
  }}
}
void Login(){
  if(Limited("login-ip:"+GetIp(),30)){message="Muitas tentativas. Tente novamente mais tarde.";return;}
  string name=(Request.Form["usuario"]??"").Trim(),pwd=Request.Form["senha"]??"";
  if(name.Length>32||pwd.Length>50){message="Usuário ou senha inválidos.";return;}
  using(var c=new SqlConnection(db)){c.Open();using(var cmd=Command(c,null,"SELECT UserID,Salt,PasswordHash,Iterations FROM dbo.StormPTWebUsers WHERE UserID=@u")){
    cmd.Parameters.Add("@u",SqlDbType.VarChar,32).Value=name;
    using(var rd=cmd.ExecuteReader()){if(rd.Read()){
      int iterations=rd.GetInt32(3);
      if(iterations>=150000&&iterations<=1000000&&ConstantTimeEqual((byte[])rd["PasswordHash"],PasswordHash(pwd,(byte[])rd["Salt"],iterations))){
        user=rd.GetString(0);Session["StormPTPlayer"]=user;signedIn=true;view="painel";alertClass="success";message="Você entrou na sua conta.";return;
      }
    }}
  }}
  message="Usuário ou senha inválidos. Para contas antigas, solicite vinculação ao painel.";
}
void LoadProfile(){
  try{using(var c=new SqlConnection(db)){c.Open();using(var cmd=Command(c,null,@"SELECT TOP 1 m.Email,m.RegistDay,g.MXChar,g.MXLevel
    FROM dbo.StormPTWebUsers w LEFT JOIN dbo.ALLPersonalMember m ON m.Userid=w.UserID LEFT JOIN dbo.AllGameUser g ON g.userid=w.UserID WHERE w.UserID=@u")){
    cmd.Parameters.Add("@u",SqlDbType.VarChar,32).Value=user;using(var r=cmd.ExecuteReader()){if(r.Read()){
      email=r.IsDBNull(0)?"—":r.GetString(0);
      created=r.IsDBNull(1)?"—":r.GetDateTime(1).ToString("dd/MM/yyyy");
      character=r.IsDBNull(2)?"Nenhum personagem ainda":r.GetString(2);
      level=r.IsDBNull(3)?"—":Convert.ToString(r.GetInt32(3));
    }}
  }}}catch{character="Informações indisponíveis no momento";}
}
</script>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>StormPT — <%=view=="cadastro"?"Criar conta":view=="painel"?"Meu painel":"Entrar"%></title>
<link rel="stylesheet" href="/assets/site.css?v=9"/>
<style>
.account-bg{min-height:100vh;background:linear-gradient(100deg,rgba(5,11,17,.98) 10%,rgba(5,11,17,.87) 100%),url('/assets/hero.jpg') center/cover fixed;padding:126px 24px 90px}
.account-grid{max-width:1110px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 455px;align-items:center;gap:65px}
.account-copy h1{font:700 clamp(39px,5vw,67px)/1.18 'Cinzel',Georgia,serif;margin:14px 0 24px;letter-spacing:-1px}
.account-copy em{font-style:normal;color:#eec57b}.account-copy p{color:#acbac5;max-width:500px;line-height:1.85}
.account-panel{padding:40px;border:1px solid rgba(228,187,114,.43);background:linear-gradient(150deg,#18242e,#111923 75%);box-shadow:0 35px 85px rgba(0,0,0,.48)}
.account-panel h2{font:700 26px 'Cinzel',Georgia,serif;margin:2px 0 8px;color:#f7ead6}
.account-panel p{font-size:13px;color:#a9bac4;margin:0 0 21px}
.account-panel label{display:block;margin:14px 0 6px;color:#dbcda9;font-size:10px;font-weight:800;letter-spacing:1.2px}
.account-panel input:not([type=hidden]){width:100%;padding:14px 13px;color:#f6f2e8;background:#0a131b;border:1px solid #43505a;outline:none;font:14px 'DM Sans',sans-serif}
.account-panel input:focus{border-color:#dfb66f;box-shadow:0 0 0 3px rgba(223,182,111,.09)}
.account-panel button{width:100%;margin-top:23px}.account-panel .switch{display:block;margin-top:21px;color:#eec57b;text-align:center;font-size:12px}
.account-panel .alert{border:1px solid #784648;background:#381e27;color:#ffd1cf;padding:13px 15px;margin:15px 0;font-size:12px}
.account-panel .alert.success{color:#aff5cc;border-color:#32674d;background:#19372b}
.honey{position:absolute;left:-99999px;top:-99999px}
.profile-line{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(237,207,153,.12);padding:13px 0;font-size:12px}
.profile-line span{color:#a0aeb8}.profile-line strong{overflow-wrap:anywhere;text-align:right}
.account-tip{color:#8e9fa9;font-size:11px;margin-top:18px}
.account-navlinks{display:flex;gap:20px}.account-navlinks a{font-size:11px;letter-spacing:1px;font-weight:700;color:#d6d1bf}
@media(max-width:820px){.account-grid{grid-template-columns:1fr;gap:38px}.account-bg{padding:118px 18px 55px}.account-panel{padding:26px 22px}.account-copy h1{font-size:43px}.account-navlinks{gap:10px}.account-navlinks a{font-size:10px}}
</style>
</head>
<body>
<header class="header" style="top:0"><div class="container nav"><a href="/" class="brand"><span class="brand-icon">✦</span><span>STORM<span>PT</span><small>THE REBIRTH</small></span></a><div class="account-navlinks"><a href="/">INÍCIO</a><a href="/?ranking=level#ranking">RANKINGS</a><a href="/Conta.aspx?view=cadastro">CADASTRO</a><a href="/Conta.aspx?view=login">MINHA CONTA</a></div></div></header>
<main class="account-bg"><div class="account-grid">
<div class="account-copy"><span class="eyebrow">✦ ESCREVA SUA HISTÓRIA</span><h1><%=view=="cadastro"?"Sua jornada<br/><em>começa aqui.</em>":signedIn?"O seu mundo.<br/><em>Seu legado.</em>":"Bem-vindo<br/><em>de volta.</em>"%></h1><p>Um novo mundo de aventuras espera por você. Crie seu personagem, explore o continente e dispute seu lugar entre os maiores guerreiros de StormPT.</p><div class="hero-meta"><span>⚔ <b>COMUNIDADE BRASILEIRA</b></span><span>◆ <b>NOVA ERA</b></span></div></div>
<section class="account-panel">
<%if(!String.IsNullOrEmpty(message)){%><div class="alert <%=alertClass%>"><%=Esc(message)%></div><%}%>
<%if(signedIn){%>
<span class="eyebrow">✦ PAINEL DO JOGADOR</span><h2>Olá, <%=Esc(user)%>!</h2><p>Seu cadastro no StormPT está ativo.</p>
<div class="profile-line"><span>Conta</span><strong><%=Esc(user)%></strong></div>
<div class="profile-line"><span>E-mail</span><strong><%=Esc(email)%></strong></div>
<div class="profile-line"><span>Desde</span><strong><%=Esc(created)%></strong></div>
<div class="profile-line"><span>Personagem</span><strong><%=Esc(character)%></strong></div>
<div class="profile-line"><span>Nível</span><strong><%=Esc(level)%></strong></div>
<div class="account-tip">Use o mesmo nome de usuário e senha no cliente do jogo. O servidor ainda está em fase de testes.</div>
<a href="/#download" class="btn btn-gold" style="width:100%;margin-top:24px">BAIXAR LAUNCHER ↗</a>
<form method="post" action="/Conta.aspx?view=painel"><input type="hidden" name="csrf" value="<%=Esc(Session["StormPTCsrf"])%>"/><input type="hidden" name="action" value="logout"/><button type="submit" class="btn btn-outline">SAIR DA CONTA</button></form>
<%}else if(view=="cadastro"){%>
<h2>CRIAR CONTA</h2><p>Cadastre seu usuário e comece a aventura.</p>
<form method="post" action="/Conta.aspx?view=cadastro" autocomplete="on">
<input type="hidden" name="csrf" value="<%=Esc(Session["StormPTCsrf"])%>"/><input type="hidden" name="action" value="register"/>
<div class="honey" aria-hidden="true"><label for="website">Não preencha</label><input id="website" name="website" tabindex="-1" autocomplete="off"/></div>
<label for="usuario">NOME DE USUÁRIO</label><input id="usuario" name="usuario" autocomplete="username" minlength="4" maxlength="16" pattern="[A-Za-z][A-Za-z0-9_]{3,15}" required placeholder="Exemplo: StormHero"/>
<label for="email">E-MAIL</label><input id="email" name="email" autocomplete="email" type="email" maxlength="160" required placeholder="seuemail@exemplo.com"/>
<label for="senha">SENHA DO JOGO</label><input id="senha" name="senha" autocomplete="new-password" type="password" minlength="8" maxlength="24" required placeholder="De 8 a 24 caracteres"/>
<label for="confirmar">CONFIRMAR SENHA</label><input id="confirmar" name="confirmar" autocomplete="new-password" type="password" minlength="8" maxlength="24" required placeholder="Digite novamente sua senha"/>
<button type="submit" class="btn btn-gold">CRIAR MINHA CONTA ↗</button></form>
<a class="switch" href="/Conta.aspx?view=login">Já tem conta? Entrar no painel</a>
<%}else{%>
<h2>ENTRAR NO PAINEL</h2><p>Entre com sua conta cadastrada no novo StormPT.</p>
<form method="post" action="/Conta.aspx?view=login">
<input type="hidden" name="csrf" value="<%=Esc(Session["StormPTCsrf"])%>"/><input type="hidden" name="action" value="login"/>
<label for="usuario">USUÁRIO</label><input id="usuario" name="usuario" autocomplete="username" required maxlength="32" placeholder="Seu nome de usuário"/>
<label for="senha">SENHA</label><input id="senha" name="senha" autocomplete="current-password" type="password" required placeholder="Sua senha"/>
<button type="submit" class="btn btn-gold">ENTRAR ↗</button></form>
<a class="switch" href="/Conta.aspx?view=cadastro">Não tem cadastro? Criar conta</a>
<%}%>
</section></div></main>
</body></html>
