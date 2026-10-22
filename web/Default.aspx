<%@ Page Language="C#" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.Data" %>
<%@ Import Namespace="System.Data.SqlClient" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web" %>
<%@ Import Namespace="System.Web.Caching" %>
<script runat="server">
  private readonly string[] tabs = new string[] {"level","pvp","bellatra","clans"};
  protected string active = "level";
  protected string tableRows = "";
  protected string tabTitle = "";
  protected bool world = false;
  protected string lastUpdate = "";
  protected void Page_Load(object sender, EventArgs e) {
    string t=(Request.QueryString["ranking"] ?? "level").ToLowerInvariant();
    if(Array.IndexOf(tabs,t)<0)t="level";active=t;
    tabTitle=t=="level"?"Ranking de nível":t=="pvp"?"Ranking PvP":t=="bellatra"?"Bellatra Solo":"Ranking de clãs";
    tableRows=LoadRanking(t);
    try{using(var c=new System.Net.Sockets.TcpClient()) {var ar=c.BeginConnect("127.0.0.1",1997,null,null);world=ar.AsyncWaitHandle.WaitOne(250);if(world)c.EndConnect(ar);}}catch{world=false;}
    lastUpdate=DateTime.Now.ToString("dd/MM/yyyy HH:mm");
  }
  private string Safe(object x) {return Server.HtmlEncode(x==null||x==DBNull.Value?"—":Convert.ToString(x));}
  private string LoadRanking(string t){
    string k="stormpt_rank_"+t, old=Cache[k] as string;
    if(old!=null) return old;
    string q;
    switch(t) {
      case "pvp":q="SELECT TOP 10 Name AS N, Lvl AS L, Kills AS S FROM ServerDB.dbo.PVP WHERE Name IS NOT NULL AND LEN(LTRIM(RTRIM(Name)))>0 ORDER BY Kills DESC,Lvl DESC";break;
      case "bellatra":q="SELECT TOP 10 CharacterName AS N, Level AS L, BestScore AS S FROM ServerDB.dbo.SoDSoloRanking WHERE CharacterName IS NOT NULL ORDER BY BestScore DESC";break;
      case "clans":q="SELECT TOP 10 ClanName AS N, MemCnt AS L, Cpoint AS S FROM ClanDB.dbo.CL WHERE ClanName IS NOT NULL AND (DelActive IS NULL OR DelActive NOT IN ('1','Y')) ORDER BY Cpoint DESC,MemCnt DESC";break;
      default:q="SELECT TOP 10 CharName AS N, CharLevel AS L, ExpChar AS S FROM rPTDB.dbo.LevelList WHERE CharName IS NOT NULL AND CharLevel>0 ORDER BY CharLevel DESC,ExpChar DESC";break;
    }
    StringBuilder b=new StringBuilder();
    try {
      using(SqlConnection c=new SqlConnection(@"Data Source=.\SQLEXPRESS;Initial Catalog=master;Integrated Security=True;Connect Timeout=3;Encrypt=False")) {
        c.Open();
        using(SqlCommand cmd=new SqlCommand(q,c)){cmd.CommandTimeout=5;
          using(SqlDataReader r=cmd.ExecuteReader()){
            int i=0;
            while(r.Read()){
              i++;
              string label=t=="clans"?"membros":t=="pvp"?"nível":"nível";
              string score=t=="level"?"":"<span class='rank-score'>"+(t=="pvp"?"Abates: ":t=="clans"?"Pontos: ":"Pontuação: ")+Safe(r["S"])+"</span>";
              b.Append("<div class='rank-entry'><span class='rank-no "+(i<=3?"medal":"")+"'>"+i.ToString("00")+"</span><div class='rank-avatar'>"+Safe(Convert.ToString(r["N"]).Substring(0,1).ToUpperInvariant())+"</div><div class='rank-name'><strong>"+Safe(r["N"])+"</strong>"+score+"</div><span class='rank-stat'>"+Safe(r["L"])+" <small>"+label+"</small></span></div>");
            }
          }
        }
      }
      if(b.Length==0)b.Append("<div class='empty-rank'>Ainda não há resultados oficiais nesta categoria. Os rankings serão atualizados conforme os jogadores participarem.</div>");
    }catch(Exception) {b.Clear();b.Append("<div class='empty-rank'>Ranking em sincronização com o servidor. Tente novamente em instantes.</div>");}
    string v=b.ToString();Cache.Insert(k,v,null,DateTime.Now.AddSeconds(45),Cache.NoSlidingExpiration);return v;
  }
</script>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>StormPT — Um novo mundo espera por você</title>
<meta name="description" content="StormPT: Priston Tale clássico com uma nova experiência. Ranking ao vivo, novidades e launcher oficial com atualização automática."/>
<meta name="theme-color" content="#080e15"/>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"/>
<link rel="stylesheet" href="/assets/site.css?v=7"/>
</head>
<body>
<div class="announcement"><span class="dot"></span> O NOVO STORMPT ESTÁ GANHANDO VIDA <span class="announcement-mute">• Acompanhe a preparação do servidor</span></div>
<header class="header"><div class="container nav">
<a href="/" class="brand" aria-label="StormPT, página inicial"><span class="brand-icon">✦</span><span>STORM<span>PT</span><small>THE REBIRTH</small></span></a>
<nav class="menu" id="menu"><a href="#inicio">Início</a><a href="#servidor">O servidor</a><a href="#ranking">Rankings</a><a href="#noticias">Novidades</a><a href="#download">Download</a></nav>
<div class="nav-actions"><span class="realm-status"><i class="<%= world?"green":"" %>"></i> <%= world?"MUNDO ONLINE • TESTES":"EM PREPARAÇÃO" %></span><a href="#download" class="btn btn-outline nav-download">JOGAR AGORA <span>↗</span></a><button type="button" class="nav-toggle" aria-label="Abrir menu" onclick="document.getElementById('menu').classList.toggle('open')">☰</button></div>
</div></header>
<main>
<section class="hero" id="inicio"><div class="hero-glow"></div><div class="container hero-content">
<div class="hero-kicker"><span class="line"></span> UMA LENDA RENASCE <span class="line"></span></div>
<div class="hero-heading">O MUNDO<br/>PRECISA DE <em>HERÓIS.</em></div>
<p>As batalhas que marcaram uma geração estão de volta. Reúna sua equipe, conquiste novas histórias e escreva seu nome entre os maiores guerreiros de Priston.</p>
<div class="hero-buttons"><a href="#download" class="btn btn-gold">COMECE SUA JORNADA <span>↗</span></a><a href="#ranking" class="btn btn-ghost">CONHEÇA OS RANKINGS <span>↓</span></a></div>
<div class="hero-meta"><span>✧ <b>CLÁSSICO REIMAGINADO</b></span><span>◈ <b>COMUNIDADE BRASILEIRA</b></span><span>⟡ <b>NOVOS DESAFIOS</b></span></div>
</div><div class="hero-bottom"><div class="container"><span>UMA NOVA ERA ESTÁ COMEÇANDO</span><span class="scroll">EXPLORE O MUNDO <b>↓</b></span></div></div></section>
<section class="quick-stats" id="servidor"><div class="container stat-grid"><div class="stat"><div class="stat-icon">⚔</div><div><small>EVOLUÇÃO</small><strong>25<span>x</span></strong><p>EXP planejada</p></div></div><div class="stat"><div class="stat-icon">◆</div><div><small>RECOMPENSAS</small><strong>35<span>x</span></strong><p>DROP planejado</p></div></div><div class="stat"><div class="stat-icon">✦</div><div><small>PRIMEIROS PASSOS</small><strong>01</strong><p>Nível inicial</p></div></div><div class="stat"><div class="stat-icon">♜</div><div><small>PROGRESSÃO</small><strong>80<span>D</span></strong><p>Era clássica planejada</p></div></div></div></section>
<section class="section section-rank" id="ranking"><div class="container"><div class="section-top"><div><span class="eyebrow">✦ SALÃO DA GLÓRIA</span><h2>Os nomes que viram <em>lenda.</em></h2><p>Os maiores guerreiros e clãs de StormPT, diretamente do banco do servidor.</p></div><span class="updated">↻ Atualizado às <%= lastUpdate %></span></div>
<div class="leaderboard"><div class="rank-tabs"><a class="<%= active=="level"?"selected":"" %>" href="/?ranking=level#ranking">⚔ &nbsp;Ranking Level</a><a class="<%= active=="pvp"?"selected":"" %>" href="/?ranking=pvp#ranking">◈ &nbsp;Ranking PvP</a><a class="<%= active=="bellatra"?"selected":"" %>" href="/?ranking=bellatra#ranking">✦ &nbsp;Bellatra Solo</a><a class="<%= active=="clans"?"selected":"" %>" href="/?ranking=clans#ranking">♜ &nbsp;Ranking Clãs</a></div><div class="rank-content"><div class="rank-content-heading"><span><%= tabTitle %></span><small>TOP 10 JOGADORES</small></div><%= tableRows %><div class="rank-foot">* Durante a preparação, os dados podem incluir personagens e clãs de testes internos.</div></div><aside class="ranking-aside"><span class="tiny">ARENA DE CAMPEÕES</span><div class="laurel">♛</div><h3>A glória pertence a quem a conquista.</h3><p>A cada batalha, uma nova história. O seu nome pode estar no topo.</p><a href="#download">ENTRE NA DISPUTA ↗</a></aside></div></div></section>
<section class="section news-section" id="noticias"><div class="container"><div class="section-top"><div><span class="eyebrow">✦ CRÔNICAS DO MUNDO</span><h2>O que há de <em>novo.</em></h2><p>Acompanhe cada etapa dessa nova era.</p></div></div><div class="news-grid"><article class="news-feature"><div class="news-symbol">♜</div><span class="news-tag">NOVA ERA</span><div><small>22 OUTUBRO 2026</small><h3>StormPT está renascendo.</h3><p>Um novo ambiente, com a base clássica de Priston Tale e uma experiência modernizada para nossa comunidade.</p></div></article><article class="news-card"><span>DESENVOLVIMENTO</span><div class="news-emblem">◇</div><h3>Um novo launcher para uma jornada sem complicações.</h3><p>Instalação automática, verificação de arquivos e atualizações em um só lugar.</p><a href="#download">SAIBA MAIS ↗</a></article><article class="news-card"><span>COMUNIDADE</span><div class="news-emblem">⚔</div><h3>Dispute seu lugar entre os maiores.</h3><p>Rankings de nível, PvP, Bellatra e clãs integrados ao universo do jogo.</p><a href="#ranking">VER RANKINGS ↗</a></article></div></div></section>
<section class="section download-section" id="download"><div class="container download-grid"><div><span class="eyebrow">✦ SUA AVENTURA COMEÇA AQUI</span><h2>Seu mundo.<br/><em>Seu legado.</em></h2><p>Baixe apenas o launcher oficial. Ele cuida da instalação do cliente, das atualizações e da verificação dos arquivos para você.</p><div class="dl-checks"><span>✓ Instalação automática</span><span>✓ Atualizações integradas</span><span>✓ Verificação de integridade</span></div></div><div class="download-card"><div class="download-mark">✦</div><small>LAUNCHER OFICIAL • WINDOWS</small><h3>StormPT Launcher</h3><p>Um instalador. Uma nova aventura.</p><a href="/releases/StormPTLauncher.exe" download class="btn btn-gold btn-wide">↓ BAIXAR LAUNCHER</a><div class="dl-fine">Windows 10/11 • Download gratuito • Versão de testes</div><div class="dl-warning">O lançamento público do servidor está em preparação. O launcher pode ser disponibilizado para testes antes da abertura do jogo.</div></div></div></section>
<section class="faq-section"><div class="container"><span class="eyebrow">✦ DÚVIDAS FREQUENTES</span><h2>Antes de começar.</h2><div class="faqs"><details><summary>Preciso baixar o cliente completo?</summary><p>Não. Você baixa apenas o StormPT Launcher, que instala os arquivos necessários e mantém tudo atualizado.</p></details><details><summary>O StormPT já está liberado para jogar?</summary><p>O novo servidor está em preparação e validação. A liberação definitiva será anunciada neste site.</p></details><details><summary>O launcher funciona no Windows?</summary><p>Sim, ele foi desenvolvido para Windows e oferece instalação, atualizações e integridade dos arquivos.</p></details></div></div></section>
</main><footer><div class="container foot"><a href="/" class="brand"><span class="brand-icon">✦</span><span>STORM<span>PT</span><small>THE REBIRTH</small></span></a><p>Um novo capítulo da sua história começa aqui.</p><span>© 2026 StormPT · Projeto independente de comunidade.</span><a href="#inicio">VOLTAR AO TOPO ↑</a></div></footer><script src="/assets/site.js" defer></script>
</body></html>
