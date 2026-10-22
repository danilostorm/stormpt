using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace StormPT {
 public class Package { public string Url {get;set;} public string Sha256 {get;set;} public long Bytes {get;set;} }
 public sealed class Patch { public int Version {get;set;} public string Description {get;set;} public Package Package {get;set;} public Dictionary<string,string> Files {get;set;} public List<string> DeleteFiles {get;set;} }
 public sealed class Release { public int SchemaVersion {get;set;} public string Name {get;set;} public Package Base {get;set;} public List<Patch> Patches {get;set;} public bool RequireLaunchProof {get;set;} public LauncherPackage Launcher {get;set;} }
 public sealed class LauncherPackage:Package {public int Version {get;set;} }
 public sealed class LauncherUpgrade {public string FilePath {get;set;} }
 public sealed class State { public int PatchVersion {get;set;} public string BaseSha256 {get;set;} }

 public sealed class GraphicsSettingsForm : Form {
  readonly string iniPath;
  readonly ComboBox resolution=new ComboBox(),mode=new ComboBox(),depth=new ComboBox();
  readonly CheckBox vsync=new CheckBox(),textures=new CheckBox(),effects=new CheckBox(),farCamera=new CheckBox(),autoAdjust=new CheckBox(),maximized=new CheckBox();
  readonly Color fg=Color.FromArgb(234,241,248),muted=Color.FromArgb(157,178,197),gold=Color.FromArgb(255,182,52);
  readonly Dictionary<string,string> current=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
  public GraphicsSettingsForm(string path){
    iniPath=path;Text="StormPT · Configurações gráficas";
    ClientSize=new Size(555,540);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;MinimizeBox=false;
    StartPosition=FormStartPosition.CenterParent;BackColor=Color.FromArgb(14,26,39);ForeColor=fg;Font=new Font("Segoe UI",10);
    try{Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);}catch{}
    foreach(string line in File.ReadAllLines(path,Encoding.Default)){
      // Read only the relevant sections; do not reinterpret macros or player settings.
      if(line.Trim().StartsWith("["))section=line.Trim().Trim('[',']');
      else{int pos=line.IndexOf('=');if(pos>0)current[section+"/"+line.Substring(0,pos).Trim()]=line.Substring(pos+1).Trim();}
    }
    AddLabel("CONFIGURAÇÕES DE VÍDEO",25,20,14,true);
    AddLabel("Opções compatíveis. Resolução e efeitos são ajustados dentro do jogo.",25,50,9,false);
    AddLabel("Resolução",25,92,10,false);SetupCombo(resolution,170,89,350);
    foreach(var r in new[]{"800x600","1024x768","1152x864","1280x720","1280x800","1280x1024","1366x768","1440x900","1600x900","1680x1050","1920x1080","1920x1200","2560x1440","3840x2160"})resolution.Items.Add(r);
    string chosen=Get("Screen","Width","1024")+"x"+Get("Screen","Height","768");
    if(!resolution.Items.Contains(chosen))resolution.Items.Add(chosen);resolution.SelectedItem=chosen;
    AddLabel("Modo de exibição",25,137,10,false);SetupCombo(mode,170,134,350);mode.Items.AddRange(new object[]{"Janela","Tela cheia"});mode.SelectedIndex=GetBool("Screen","Windowed",true)?0:1;
    AddLabel("Profundidade de cor",25,182,10,false);SetupCombo(depth,170,179,350);depth.Items.AddRange(new object[]{"32 bits (recomendado)","16 bits"});depth.SelectedIndex=Get("Graphics","BitDepth","32")=="16"?1:0;
    SetupCheck(vsync,"Sincronização vertical (VSync)",25,230,GetBool("Graphics","VSync",true));
    SetupCheck(textures,"Texturas em alta qualidade",25,265,GetBool("Graphics","HighTextureQuality",true));
    SetupCheck(effects,"Efeitos gráficos",25,300,!GetBool("Graphics","NoEffects",false));
    SetupCheck(farCamera,"Maior distância de visão",25,335,GetBool("Camera","Range",false));
    SetupCheck(autoAdjust,"Ajustar resolução automaticamente na janela",25,370,GetBool("Screen","AutoAdjust",true));
    SetupCheck(maximized,"Iniciar janela maximizada",25,405,GetBool("Screen","StartMaximized",false));
    mode.SelectedIndexChanged+=(s,e)=>{maximized.Enabled=mode.SelectedIndex==0;autoAdjust.Enabled=mode.SelectedIndex==0;};
    maximized.Enabled=mode.SelectedIndex==0;autoAdjust.Enabled=mode.SelectedIndex==0;
    resolution.Enabled=false;vsync.Enabled=false;effects.Enabled=false;
    Button save=new Button{Text="SALVAR CONFIGURAÇÕES",Bounds=new Rectangle(25,465,318,48),BackColor=gold,ForeColor=Color.FromArgb(11,24,34),FlatStyle=FlatStyle.Flat,Font=new Font("Segoe UI",10,FontStyle.Bold)};
    save.Click+=(s,e)=>Save();Controls.Add(save);
    Button cancel=new Button{Text="CANCELAR",Bounds=new Rectangle(355,465,165,48),BackColor=Color.FromArgb(29,46,63),ForeColor=fg,FlatStyle=FlatStyle.Flat};cancel.Click+=(s,e)=>Close();Controls.Add(cancel);
  }
  string section="";
  string Get(string group,string key,string fallback){string value;return current.TryGetValue(group+"/"+key,out value)?value:fallback;}
  bool GetBool(string group,string key,bool fallback){string v=Get(group,key,fallback?"1":"0");return v=="1" || v.Equals("True",StringComparison.OrdinalIgnoreCase);}
  void AddLabel(string content,int x,int y,int size,bool strong){Controls.Add(new Label{Text=content,Location=new Point(x,y),AutoSize=true,Font=new Font("Segoe UI",size,strong?FontStyle.Bold:FontStyle.Regular),ForeColor=strong?gold:muted});}
  void SetupCombo(ComboBox c,int x,int y,int w){c.Location=new Point(x,y);c.Width=w;c.DropDownStyle=ComboBoxStyle.DropDownList;c.BackColor=Color.FromArgb(31,48,66);c.ForeColor=fg;c.FlatStyle=FlatStyle.Flat;Controls.Add(c);}
  void SetupCheck(CheckBox c,string label,int x,int y,bool value){c.Text=label;c.Location=new Point(x,y);c.Width=480;c.ForeColor=fg;c.Checked=value;Controls.Add(c);}
  static string Bool(bool value){return value?"1":"0";}
  public static void WriteGraphicsIni(string iniPath,Dictionary<string,string> changes){
    if(changes==null||changes.Count==0)throw new ArgumentException("Nenhuma configuração definida.");
    changes=new Dictionary<string,string>(changes,StringComparer.OrdinalIgnoreCase);
    // Preserve all unrelated settings, order, comments, macros and custom keys.
    var lines=new List<string>(File.ReadAllLines(iniPath,Encoding.Default));
    string currentSection="";
    for(int i=0;i<lines.Count;i++){
      string line=lines[i].Trim();
      if(line.StartsWith("[")&&line.EndsWith("]")){currentSection=line.Substring(1,line.Length-2);continue;}
      int equal=line.IndexOf('=');if(equal<0)continue;
      string key=currentSection+"/"+line.Substring(0,equal).Trim();
      if(changes.ContainsKey(key)){lines[i]=line.Substring(0,equal+1)+changes[key];changes.Remove(key);}
    }
    foreach(var grp in changes.GroupBy(x=>x.Key.Split('/')[0])){
      string hdr="["+grp.Key+"]";
      int found=lines.FindIndex(x=>x.Trim().Equals(hdr,StringComparison.OrdinalIgnoreCase));
      if(found<0){lines.Add(hdr);found=lines.Count-1;}
      foreach(var value in grp){lines.Insert(++found,value.Key.Substring(value.Key.IndexOf('/')+1)+"="+value.Value);}
    }
    string staging=iniPath+".graphics-new";string backup=iniPath+".graphics-backup";
    File.WriteAllLines(staging,lines.ToArray(),Encoding.Default);
    File.Replace(staging,iniPath,backup,true);
  }
  void Save(){
    try{
      if(Process.GetProcessesByName("Game").Length>0)throw new IOException("Feche o jogo antes de salvar estas opções.");
      if(!File.Exists(iniPath))throw new FileNotFoundException("game.ini não encontrado.");
      string[] res=resolution.SelectedItem.ToString().Split('x');int width=int.Parse(res[0]),height=int.Parse(res[1]);
      if(width<800||height<600||width>7680||height>4320)throw new InvalidDataException("Resolução inválida.");
      string ratio=Math.Abs((double)width/height-16.0/9)<0.04?"16:9":(Math.Abs((double)width/height-16.0/10)<0.04?"16:10":"4:3");
      var changes=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){
        {"Screen/Windowed",Bool(mode.SelectedIndex==0)},
        {"Screen/AutoAdjust",Bool(autoAdjust.Checked)},
        {"Screen/StartMaximized",Bool(maximized.Checked&&mode.SelectedIndex==0)},
        {"Graphics/BitDepth",depth.SelectedIndex==1?"16":"32"},
        {"Graphics/TextureQuality",textures.Checked?"2":"1"},
        {"Camera/Range",Bool(farCamera.Checked)}
      };
      WriteGraphicsIni(iniPath,changes);
      MessageBox.Show(this,"Configurações salvas! Serão aplicadas na próxima inicialização do StormPT.","StormPT",MessageBoxButtons.OK,MessageBoxIcon.Information);
      DialogResult=DialogResult.OK;Close();
    }catch(Exception ex){MessageBox.Show(this,"Não foi possível salvar: "+ex.Message,"StormPT",MessageBoxButtons.OK,MessageBoxIcon.Warning);}
  }
 }

 public sealed class Launcher : Form {
  const string Origin="https://stormpt.hoststorm.com.br";
  const string PublicKey="<RSAKeyValue><Modulus>4TaKBu6jfbDgC7GnFmkMzBlM6Htb+LLzLmEBnKYFOOitK7CU2KYg4V8T6M07fqNwqt5g1YlFdDqqjwfQR8+s5PtQPABySISnWrrcZZcMXO/s/CxAfcLUASfrkS6lXPo3WxtAMT+V5MJo1Z/wqrOMRBrLNRdp3Wzuiu3orJAoqAvm8fHljAYQgeMBXqNqsu7EaA3njMCm+8lnR+EEJVpJpwym8ZvZY8vMxhICb1o1bqFMME9HqGm74hq2rQBTzIzwX9O3Jpu7CoIYQ3D/RjdtsFYixQ63bQlkO/0QcI7iDL8KBogHWc619YeUk6RNu5wEpCX8NUEH3b6QcRHLTDc6A98J2iK/7S72WzM89G+gAb8gAsphhZKQI2NvfBFocdzdGYLLqR0EKLsUpt2B5Db5I3tKUQsTziIwdwnYbTI3ACjFP0r6pjVqOdnJitfZKXiLNaeMIFtQmbZFlriwdkz60esX6tsO+6GXDhi6vjpK6nWIuD/ATOd2e/C900Mr9bWl</Modulus><Exponent>AQAB</Exponent></RSAKeyValue>";
  readonly JavaScriptSerializer json=new JavaScriptSerializer();
  readonly BackgroundWorker worker=new BackgroundWorker();
  readonly BackgroundWorker launchWorker=new BackgroundWorker();
  readonly System.Windows.Forms.Timer launchTimer=new System.Windows.Forms.Timer();
  DateTime launchStarted;
  readonly Label status=new Label(),version=new Label(),location=new Label(),details=new Label();
  readonly ProgressBar progress=new ProgressBar();
  readonly Button install=new Button(),play=new Button(),verify=new Button(),choose=new Button(),graphics=new Button(),folder=new Button();
  readonly CheckBox autoUpdate=new CheckBox();
  string directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"StormPT");
  Release release;
  bool checkedManifest=false;
  readonly Color background=Color.FromArgb(10,18,31),card=Color.FromArgb(19,34,51),gold=Color.FromArgb(255,182,52),white=Color.FromArgb(234,241,248),muted=Color.FromArgb(157,178,197);
  string game {get { return directory; }}
  string stateFile {get { return Path.Combine(directory,"stormpt-state.json"); }}
  // Startup diagnostics never include passwords, session cookies, or ticket secrets.
  static void StartupLog(string stage,Exception ex){
    try{
      string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"StormPT");
      Directory.CreateDirectory(folder);
      string message=DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")+" UTC ["+stage+"] "+
        (ex==null?"ok":ex.GetType().Name+" "+ex.Message+" HRESULT=0x"+ex.HResult.ToString("X8"));
      var win=ex as Win32Exception;
      if(win!=null)message+=" Win32="+win.NativeErrorCode;
      File.AppendAllText(Path.Combine(folder,"launcher-startup.log"),message+Environment.NewLine);
    }catch{}
  }
  // Prefer CreateProcess for an executable: a concrete process handle is returned.
  // If a particular Windows installation rejects inherited handles, try ShellExecute.
  static Process StartGameProcess(string exe,string cwd,string args=""){
    var start=new ProcessStartInfo(exe){WorkingDirectory=cwd,Arguments=args,UseShellExecute=false};
    try{return Process.Start(start);}
    catch(Win32Exception ex){
      StartupLog("CreateProcess",ex);
      if(ex.NativeErrorCode!=6)throw;
      start.UseShellExecute=true;
      return Process.Start(start);
    }
  }
  // Native process monitoring avoids System.Diagnostics.Process.Refresh/HasExited/
  // MainWindowHandle, which can throw HRESULT 0x80070006 on some Windows installs.
  const uint SYNCHRONIZE=0x00100000;
  const uint PROCESS_QUERY_LIMITED_INFORMATION=0x00001000;
  const uint WAIT_OBJECT_0=0, WAIT_TIMEOUT=0x00000102, WAIT_FAILED=0xFFFFFFFF;
  [DllImport("kernel32.dll",SetLastError=true)]
  static extern IntPtr OpenProcess(uint access,bool inherit,int processId);
  [DllImport("kernel32.dll",SetLastError=true)]
  static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool GetExitCodeProcess(IntPtr handle,out uint exitCode);
  [DllImport("kernel32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool CloseHandle(IntPtr handle);
  delegate bool WindowCallback(IntPtr hWnd,IntPtr lParam);
  [DllImport("user32.dll",SetLastError=true)]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool EnumWindows(WindowCallback callback,IntPtr lParam);
  [DllImport("user32.dll")]
  [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")]
  static extern uint GetWindowThreadProcessId(IntPtr hWnd,out uint processId);

  static bool HasVisibleWindow(int pid){
    bool found=false;
    WindowCallback cb=delegate(IntPtr hwnd,IntPtr unused){
      uint windowPid;
      GetWindowThreadProcessId(hwnd,out windowPid);
      if(windowPid==(uint)pid && IsWindowVisible(hwnd)){
        found=true;
        return false; // Stop enumeration once the real game window is found.
      }
      return true;
    };
    bool completed=EnumWindows(cb,IntPtr.Zero);
    if(!found && !completed){
      int error=Marshal.GetLastWin32Error();
      if(error!=0)StartupLog("EnumWindows-native-error-"+error,null);
    }
    GC.KeepAlive(cb);
    return found;
  }
  static bool NativeWaitForVisibleGameWindow(int pid,int maxMilliseconds){
    IntPtr handle=OpenProcess(SYNCHRONIZE|PROCESS_QUERY_LIMITED_INFORMATION,false,pid);
    if(handle==IntPtr.Zero){
      int code=Marshal.GetLastWin32Error();
      StartupLog("OpenProcess-failed-PID-"+pid+"-win32-"+code,null);
      if(code==87)throw new IOException("O Game.exe iniciou e encerrou antes de ser monitorado (PID "+pid+").");
      throw new Win32Exception(code,"Não foi possível monitorar o Game.exe pelo Windows.");
    }
    try{
      int cycles=Math.Max(1,(maxMilliseconds+499)/500);
      for(int i=0;i<cycles;i++){
        uint wait=WaitForSingleObject(handle,0);
        if(wait==WAIT_OBJECT_0){
          uint exitCode;
          string status=GetExitCodeProcess(handle,out exitCode)?"0x"+exitCode.ToString("X8"):"indisponível";
          StartupLog("Game.exe-exited-PID-"+pid+"-code-"+status,null);
          throw new IOException("O Game.exe foi iniciado, mas encerrou sem abrir uma janela (PID "+
            pid+", código "+status+"). O launcher não deve informar sucesso. "+
            "O cliente pode ter bloqueio de compatibilidade, dependências ou falha interna.");
        }
        if(wait==WAIT_FAILED){
          int error=Marshal.GetLastWin32Error();
          StartupLog("WaitForSingleObject-failed-PID-"+pid+"-win32-"+error,null);
          throw new Win32Exception(error,"Falha no monitoramento nativo do Game.exe.");
        }
        if(wait!=WAIT_TIMEOUT)throw new IOException("Resposta inesperada do monitor de processo: "+wait);
        if(HasVisibleWindow(pid)){
          // Check if the game window belongs to a process that is still alive.
          if(WaitForSingleObject(handle,0)==WAIT_TIMEOUT){
            StartupLog("Game.exe-visible-window-PID-"+pid,null);
            return true;
          }
        }
        Thread.Sleep(500);
      }
      StartupLog("Game.exe-running-no-visible-window-PID-"+pid,null);
      throw new IOException("O Game.exe iniciou e permanece em execução (PID "+pid+
        "), mas não abriu janela visível após "+(maxMilliseconds/1000)+
        " segundos. Verifique o Gerenciador de Tarefas e o relatório do launcher.");
    }finally{CloseHandle(handle);}
  }

  public Launcher() {
   Text="StormPT Launcher v11";StartPosition=FormStartPosition.CenterScreen;ClientSize=new Size(865,544);MinimumSize=new Size(760,510);
   BackColor=background;ForeColor=white;Font=new Font("Segoe UI",10);Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);MaximizeBox=false;
   string executableDir=Path.GetFullPath(AppDomain.CurrentDomain.BaseDirectory).TrimEnd(Path.DirectorySeparatorChar);
   string saved=PropertiesPath();if(File.Exists(saved)) { try{var p=json.Deserialize<Dictionary<string,string>>(File.ReadAllText(saved));if(p.ContainsKey("Directory") && !String.IsNullOrWhiteSpace(p["Directory"]))directory=p["Directory"]; }catch{} }
   // Portable layout: if the launcher sits in E:\StormPT, install beside it.
   if(Path.GetFileName(executableDir).Equals("StormPT",StringComparison.OrdinalIgnoreCase))directory=executableDir;
   if(Directory.Exists(Path.Combine(executableDir,"Files","Game")) || Directory.Exists(Path.Combine(executableDir,"StormPT","Files","Game")))directory=executableDir;
   var head=new Panel{Dock=DockStyle.Top,Height=145,BackColor=Color.FromArgb(12,27,40)};Controls.Add(head);
   var mark=new Label{Text="STORM",ForeColor=white,Font=new Font("Segoe UI",31,FontStyle.Bold),Location=new Point(33,23),AutoSize=true};head.Controls.Add(mark);
   var pk=new Label{Text="PK",ForeColor=gold,Font=new Font("Segoe UI",31,FontStyle.Bold),Location=new Point(196,23),AutoSize=true};head.Controls.Add(pk);
   var sub=new Label{Text="CENTRAL OFICIAL DE ATUALIZAÇÕES · WINDOWS",ForeColor=muted,Font=new Font("Segoe UI",9,FontStyle.Bold),Location=new Point(37,86),AutoSize=true};head.Controls.Add(sub);
   var hero=new Label{Text="PRISTON TALE · ATUALIZAÇÕES AUTOMÁTICAS",ForeColor=gold,Font=new Font("Segoe UI",10,FontStyle.Bold),AutoSize=true,Location=new Point(465,49)};head.Controls.Add(hero);
   var box=new Panel{BackColor=card,Location=new Point(25,165),Size=new Size(815,310),Anchor=AnchorStyles.Top|AnchorStyles.Left|AnchorStyles.Right};Controls.Add(box);
   status.Text="Verificando versão e integridade...";status.ForeColor=white;status.Font=new Font("Segoe UI",15,FontStyle.Bold);status.Location=new Point(25,20);status.Size=new Size(760,33);box.Controls.Add(status);
   details.Text="Os arquivos são verificados por assinatura e SHA-256.";details.ForeColor=muted;details.Location=new Point(25,62);details.Size=new Size(750,28);box.Controls.Add(details);
   progress.Location=new Point(25,105);progress.Size=new Size(760,18);progress.Style=ProgressBarStyle.Continuous;box.Controls.Add(progress);
   version.Text="Versão: consultando...";version.Location=new Point(25,139);version.Size=new Size(750,26);version.ForeColor=muted;box.Controls.Add(version);
   install.Text="INSTALAR / ATUALIZAR";install.Location=new Point(25,185);install.Size=new Size(190,45);MakeButton(install,true);install.Click+=(s,e)=>StartTask("update");box.Controls.Add(install);
   play.Text="JOGAR";play.Location=new Point(225,185);play.Size=new Size(115,45);MakeButton(play,true);play.Click+=(s,e)=>LaunchGame();box.Controls.Add(play);
   verify.Text="VERIFICAR";verify.Location=new Point(350,185);verify.Size=new Size(118,45);MakeButton(verify,false);verify.Click+=(s,e)=>StartTask("verify");box.Controls.Add(verify);
   graphics.Text="GRÁFICOS";graphics.Location=new Point(479,185);graphics.Size=new Size(120,45);MakeButton(graphics,false);
   graphics.Click+=(s,e)=>OpenGraphicsSettings();box.Controls.Add(graphics);
   choose.Text="PASTA DO JOGO";choose.Location=new Point(610,185);choose.Size=new Size(177,45);MakeButton(choose,false);choose.Click+=(s,e)=>Choose();box.Controls.Add(choose);
   autoUpdate.Text="Atualizações automáticas sempre ativas";autoUpdate.Checked=true;autoUpdate.Enabled=false;autoUpdate.ForeColor=muted;autoUpdate.Location=new Point(25,246);autoUpdate.Size=new Size(515,35);box.Controls.Add(autoUpdate);
   location.Location=new Point(30,490);location.Size=new Size(745,33);location.ForeColor=muted;location.Text="Pasta: "+directory;Controls.Add(location);
   folder.Text="ABRIR";folder.Size=new Size(65,31);folder.Location=new Point(775,486);MakeButton(folder,false);folder.Click+=(s,e)=>{Directory.CreateDirectory(directory);Process.Start("explorer.exe",directory);};Controls.Add(folder);
   worker.WorkerReportsProgress=true;worker.DoWork+=Work;worker.ProgressChanged+=(s,e)=>{progress.Value=Math.Max(0,Math.Min(100,e.ProgressPercentage));if(e.UserState!=null){status.Text=e.UserState.ToString();}};
   worker.RunWorkerCompleted+=Done;
   launchWorker.DoWork+=(s,e)=>{
     // Re-check the signed manifest before every login, even after a long idle.
     StartupLog("Manifest-request",null);
     var latestRelease=FetchRelease();
     StartupLog("Manifest-ok",null);
     State local=LoadState();int newest=latestRelease.Patches.Count==0?0:latestRelease.Patches.Max(x=>x.Version);
     if(local==null || local.PatchVersion<newest)throw new InvalidOperationException("Há uma atualização obrigatória. Clique em INSTALAR / ATUALIZAR.");
     // Verify the executable and updated DLL; the saved version number alone
     // is not proof that installed files are intact.
     VerifyInstalled(latestRelease);
     StartupLog("Integrity-ok",null);
     string gameExe=Path.Combine(game,"Game.exe");
     if(!FileHash(gameExe).Equals("4ae7e912630633beee4154c1ca8fdb76489dcecd41504a150474f4d7b652b634",StringComparison.OrdinalIgnoreCase))
       throw new IOException("Game.exe foi alterado ou está corrompido. Faça a verificação e repare a instalação pelo launcher.");
     // Verify the public Login and Game Server paths before opening the client.
     // The StormPT server-selection screen requires the second TCP port (10007).
     StartupLog("StormPT-check-start",null);
     VerifyStormPTConnection();
     StartupLog("StormPT-ok",null);
     Process process=null;
     try{
       process=StartGameProcess(gameExe,game);
       if(process==null)throw new IOException("O Windows não retornou um processo para Game.exe.");
       int pid=process.Id;
       StartupLog("Game.exe-started-PID-"+pid,null);
       NativeWaitForVisibleGameWindow(pid,18000);
       e.Result=pid;
     }finally{if(process!=null)process.Dispose();}
   };
   launchWorker.RunWorkerCompleted+=(s,e)=>{
     if(e.Error!=null){
       launchTimer.Stop();progress.Style=ProgressBarStyle.Continuous;progress.Value=0;
       status.Text="Não foi possível abrir o jogo.";details.Text=e.Error.Message;
       details.ForeColor=Color.FromArgb(255,145,126);play.Enabled=true;
       StartupLog("LaunchGame",e.Error);
       MessageBox.Show(this,e.Error.Message+Environment.NewLine+Environment.NewLine+
         "Diagnóstico: "+Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
         "StormPT","launcher-startup.log"),"StormPT Launcher",MessageBoxButtons.OK,MessageBoxIcon.Warning);
       return;
     }
     status.Text="Janela do StormPT detectada.";
     details.Text="O processo abriu uma janela. Aguarde a tela de login.";
     progress.Style=ProgressBarStyle.Continuous;progress.Value=100;
     play.Enabled=true;
   };
   launchTimer.Interval=350;
   launchTimer.Tick+=(s,e)=>{
     // Marquee accurately expresses that game startup duration is unknown.
     if((DateTime.UtcNow-launchStarted).TotalSeconds>=12){
       launchTimer.Stop();progress.Style=ProgressBarStyle.Continuous;progress.Value=100;
       status.Text="Verificação de inicialização concluída.";details.Text="A janela do jogo precisa estar visível para confirmar abertura.";
       play.Enabled=true;
     }
   };
   // Build version, not game patch version. Users can confirm that self-update completed.
   var buildLabel=new Label{Text="Launcher v11",Location=new Point(690,129),Size=new Size(120,22),
     ForeColor=muted,TextAlign=ContentAlignment.MiddleRight,Font=new Font("Segoe UI",8,FontStyle.Regular)};
   Controls.Add(buildLabel);buildLabel.BringToFront();
   Shown+=(s,e)=>StartTask("check");
  }
  void MakeButton(Button b,bool primary) {b.FlatStyle=FlatStyle.Flat;b.FlatAppearance.BorderSize=1;b.BackColor=primary?gold:Color.FromArgb(26,44,62);b.ForeColor=primary?Color.FromArgb(11,24,34):white;b.FlatAppearance.BorderColor=primary?gold:Color.FromArgb(72,91,107);b.Font=new Font("Segoe UI",9,FontStyle.Bold);b.Cursor=Cursors.Hand;}
  void OpenGraphicsSettings(){
    if(Process.GetProcessesByName("Game").Length!=0){MessageBox.Show(this,"Feche o jogo antes de alterar os gráficos.","StormPT",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}
    string ini=Path.Combine(game,"game.ini");
    if(!File.Exists(ini)){MessageBox.Show(this,"Instale o cliente primeiro para configurar os gráficos.","StormPT",MessageBoxButtons.OK,MessageBoxIcon.Information);return;}
    using(var dialog=new GraphicsSettingsForm(ini)){dialog.ShowDialog(this);}
  }
  string PropertiesPath(){return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"StormPTLauncher.ini.json");}
  void Choose(){using(var d=new FolderBrowserDialog()){d.Description="Escolha a pasta onde o cliente StormPT será instalado";d.SelectedPath=Directory.Exists(directory)?directory:Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);if(d.ShowDialog(this)==DialogResult.OK){directory=d.SelectedPath;location.Text="Pasta: "+directory;File.WriteAllText(PropertiesPath(),json.Serialize(new Dictionary<string,string>{{"Directory",directory}}));StartTask("check");}}}
  void MigrateLegacyLayout(){
    if(File.Exists(Path.Combine(game,"Game.exe")))return;
    // Previous versions installed into Files/Game, sometimes adding StormPT twice.
    foreach(string oldRoot in new[]{directory,Path.Combine(directory,"StormPT")}){
      string from=Path.Combine(oldRoot,"Files","Game");
      if(!File.Exists(Path.Combine(from,"Game.exe")))continue;
      if(Path.GetFullPath(from).Equals(Path.GetFullPath(directory),StringComparison.OrdinalIgnoreCase))continue;
      string[] files=Directory.GetFiles(from,"*",SearchOption.TopDirectoryOnly);
      string[] folders=Directory.GetDirectories(from,"*",SearchOption.TopDirectoryOnly);
      foreach(string source in files.Concat(folders)){
        string dest=Path.Combine(directory,Path.GetFileName(source));
        if(File.Exists(dest)||Directory.Exists(dest))throw new IOException("Existe um arquivo conflitante na raiz: "+Path.GetFileName(source));
      }
      if(worker.IsBusy)Report(0,"Organizando cliente antigo, sem baixar novamente...");
      Directory.CreateDirectory(directory);
      foreach(string source in files)File.Move(source,Path.Combine(directory,Path.GetFileName(source)));
      foreach(string source in folders)Directory.Move(source,Path.Combine(directory,Path.GetFileName(source)));
      string previousState=Path.Combine(oldRoot,"stormpt-state.json");
      if(File.Exists(previousState) && !File.Exists(stateFile))File.Move(previousState,stateFile);
      // Remove only empty legacy containers; never delete saves or unknown files.
      try {if(Directory.Exists(from) && !Directory.EnumerateFileSystemEntries(from).Any())Directory.Delete(from);}catch{}
      string oldFiles=Path.Combine(oldRoot,"Files");
      try {if(Directory.Exists(oldFiles) && !Directory.EnumerateFileSystemEntries(oldFiles).Any())Directory.Delete(oldFiles);}catch{}
      try {if(!Path.GetFullPath(oldRoot).Equals(Path.GetFullPath(directory),StringComparison.OrdinalIgnoreCase)
          && Directory.Exists(oldRoot) && !Directory.EnumerateFileSystemEntries(oldRoot).Any())Directory.Delete(oldRoot);}catch{}
      if(worker.IsBusy)Report(10,"Jogo movido para a raiz da instalação.");
      return;
    }
  }
  void CreateLauncherShortcut(){
    // Launcher is the only shortcut offered: do not create a Game.exe shortcut.
    string source=Application.ExecutablePath;
    string dest=Path.Combine(directory,"StormPTLauncher.exe");
    if(!Path.GetFullPath(source).Equals(Path.GetFullPath(dest),StringComparison.OrdinalIgnoreCase))File.Copy(source,dest,true);
    try{
      Type type=Type.GetTypeFromProgID("WScript.Shell");
      if(type!=null){dynamic shell=Activator.CreateInstance(type);
        dynamic shortcut=shell.CreateShortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"StormPT Launcher.lnk"));
        shortcut.TargetPath=dest;shortcut.WorkingDirectory=directory;shortcut.IconLocation=dest+",0";shortcut.Description="StormPT · Inicie e atualize por aqui";shortcut.Save();}
    }catch{} // Desktop shortcut is optional; installation still succeeds.
  }
  bool Installed(){return File.Exists(Path.Combine(game,"Game.exe")) && File.Exists(stateFile);}
  State LoadState(){try{return json.Deserialize<State>(File.ReadAllText(stateFile));}catch{return null;}}
  void SaveState(State st){Directory.CreateDirectory(directory);string temp=stateFile+".new";File.WriteAllText(temp,json.Serialize(st),Encoding.UTF8);if(File.Exists(stateFile))File.Replace(temp,stateFile,null);else File.Move(temp,stateFile);}
  static string GetUrl(string path){if(String.IsNullOrEmpty(path)||!path.StartsWith("/client-files/",StringComparison.Ordinal)||path.Contains("..")||path.Contains("\\")||path.Contains("?"))throw new InvalidDataException("Caminho de atualização inválido.");return Origin+path;}
  byte[] WebGet(string url){using(var client=new WebClient()){client.Headers.Add("Cache-Control","no-cache");return client.DownloadData(url);}}
  Release FetchRelease(){
    byte[] data=WebGet(GetUrl("/client-files/manifest.json"));byte[] sig=WebGet(GetUrl("/client-files/manifest.sig"));
    using(var rsa=new RSACryptoServiceProvider()){rsa.PersistKeyInCsp=false;rsa.FromXmlString(PublicKey);if(!rsa.VerifyData(data,CryptoConfig.MapNameToOID("SHA256"),sig))throw new CryptographicException("Manifesto sem assinatura válida. Nenhum arquivo será alterado.");}
    var r=json.Deserialize<Release>(Encoding.UTF8.GetString(data));if(r==null||r.SchemaVersion!=1||r.Base==null||r.Patches==null||r.Base.Bytes<=0)throw new InvalidDataException("Manifesto incompatível.");
    if(r.Patches.GroupBy(x=>x.Version).Any(x=>x.Count()>1))throw new InvalidDataException("Versões duplicadas no manifesto.");
    return r;
  }
  void StartTask(string task){if(worker.IsBusy)return;install.Enabled=false;verify.Enabled=false;play.Enabled=false;choose.Enabled=false;graphics.Enabled=false;progress.Value=0;worker.RunWorkerAsync(task);}
  void Work(object sender,DoWorkEventArgs e){try{
    string task=(string)e.Argument;
    if(Process.GetProcessesByName("Game").Length==0)MigrateLegacyLayout();
    var r=FetchRelease();release=r;checkedManifest=true;
    // Optional signed self-update: existing legacy launchers ignore this field.
    if(r.Launcher!=null && r.Launcher.Version>0 &&
       String.Equals(Path.GetFileName(Application.ExecutablePath),"StormPTLauncher.exe",StringComparison.OrdinalIgnoreCase) &&
       !FileHash(Application.ExecutablePath).Equals(r.Launcher.Sha256,StringComparison.OrdinalIgnoreCase)){
      string staged=Path.Combine(directory,"_downloads","StormPTLauncher-update-"+r.Launcher.Version+".exe");
      Download(r.Launcher,staged,"Baixando atualização do launcher");
      e.Result=new LauncherUpgrade{FilePath=staged};return;
    }
    if(task=="check"){
      State st=LoadState();int latest=r.Patches.Count==0?0:r.Patches.Max(x=>x.Version);
      if(!Installed()){Report(0,"Cliente não instalado. Clique em INSTALAR.");return;}
      if(st.PatchVersion<latest){Update(r);return;}
      Report(100,st.PatchVersion<latest?"Atualização disponível.":"Cliente atualizado. Pronto para jogar.");return;
    }
    if(task=="verify"){VerifyInstalled(r);Report(100,"Arquivos principais verificados.");return;}
    if(task=="update"){Update(r);return;}
  }catch(Exception ex){e.Result=ex;}}
  void Done(object sender,RunWorkerCompletedEventArgs e){
    object result=e.Result;
    if(result is LauncherUpgrade){
      try{
        var upgrade=(LauncherUpgrade)e.Result;
        string path64=Convert.ToBase64String(Encoding.UTF8.GetBytes(Application.ExecutablePath));
        Process.Start(new ProcessStartInfo(upgrade.FilePath){WorkingDirectory=directory,
          Arguments="--replace-launcher "+path64+" "+Process.GetCurrentProcess().Id,UseShellExecute=false});
        status.Text="Atualizando o launcher...";
        BeginInvoke(new Action(()=>Close()));
        return;
      }catch(Exception err){result=err;}
    }
    install.Enabled=true;verify.Enabled=true;choose.Enabled=true;graphics.Enabled=true;
    State installed=LoadState();int newest=release==null||release.Patches.Count==0?0:release.Patches.Max(x=>x.Version);
    play.Enabled=Installed() && checkedManifest && installed!=null && installed.PatchVersion>=newest && !(result is Exception);
    if(result is Exception){status.Text="Não foi possível concluir.";details.Text=((Exception)result).Message;details.ForeColor=Color.FromArgb(255,145,126);progress.Value=0;}
    else{details.Text="Arquivos oficiais, assinados e conferidos. Não executa como administrador.";details.ForeColor=muted;}
    if(!(result is Exception) && play.Enabled){
      try{CreateLauncherShortcut();}catch(Exception ex){details.Text="Falha ao criar atalho: "+ex.Message;}
    }
    State st=LoadState();int latest=release==null||release.Patches.Count==0?0:release.Patches.Max(x=>x.Version);
    version.Text="Instalado: "+(st==null?"não":("patch "+st.PatchVersion))+"     Disponível: "+(checkedManifest?"patch "+latest:"indisponível");
  }
  void Report(int percent,string msg){if(worker.IsBusy)worker.ReportProgress(percent,msg);}
  static string FileHash(string path){using(var sha=SHA256.Create())using(var file=File.OpenRead(path)){return BitConverter.ToString(sha.ComputeHash(file)).Replace("-","").ToLowerInvariant();}}
  // Each request transfers a small immutable byte range. A dropped connection
  // is retried without losing previously verified/received ranges. No 3GB HTTP
  // request is left open for hours through reverse proxies.
  const int DownloadBlockSize=4*1024*1024;
  void DownloadRangeBlock(string url,long total,long start,int bytes,FileStream destination){
    long end=start+bytes-1;
    HttpWebRequest request=(HttpWebRequest)WebRequest.Create(url);
    request.Timeout=120000;request.ReadWriteTimeout=120000;
    request.AllowAutoRedirect=false;
    request.KeepAlive=false;
    request.UserAgent="StormPTLauncher/3.0";
    request.AddRange(start,end);
    using(var response=(HttpWebResponse)request.GetResponse()){
      if(response.StatusCode!=HttpStatusCode.PartialContent)
        throw new IOException("O servidor não aceitou download em partes (HTTP "+(int)response.StatusCode+").");
      string wanted="bytes "+start+"-"+end+"/"+total;
      if(!String.Equals(response.Headers["Content-Range"],wanted,StringComparison.OrdinalIgnoreCase))
        throw new IOException("Resposta de intervalo incorreta: "+response.Headers["Content-Range"]);
      if(response.ContentLength!=bytes)
        throw new IOException("Tamanho de intervalo incorreto: "+response.ContentLength+" / "+bytes);
      destination.Seek(start,SeekOrigin.Begin);
      using(var input=response.GetResponseStream()){
        byte[] buffer=new byte[128*1024];int read;long received=0;
        while(received<bytes && (read=input.Read(buffer,0,(int)Math.Min(buffer.Length,bytes-received)))>0){
          destination.Write(buffer,0,read);received+=read;
        }
        if(received!=bytes)throw new IOException("Conexão interrompida antes de concluir o bloco de "+bytes+" bytes.");
      }
      destination.Flush();
    }
  }
  void Download(Package pkg,string destination,string description){
    string url=GetUrl(pkg.Url);
    Directory.CreateDirectory(Path.GetDirectoryName(destination));
    string part=destination+".part";
    if(File.Exists(destination) && new FileInfo(destination).Length==pkg.Bytes && FileHash(destination).Equals(pkg.Sha256,StringComparison.OrdinalIgnoreCase)){
      Report(100,description+" (já verificado)");return;
    }
    if(File.Exists(destination))File.Delete(destination);
    long have=File.Exists(part)?new FileInfo(part).Length:0;
    if(have>pkg.Bytes){File.Delete(part);have=0;}
    if(have==pkg.Bytes && FileHash(part).Equals(pkg.Sha256,StringComparison.OrdinalIgnoreCase)){
      File.Move(part,destination);Report(100,description+" (download retomado e verificado)");return;
    }
    if(have==pkg.Bytes){File.Delete(part);have=0;}
    // A failed block is truncated and downloaded again; completed blocks remain.
    // The last partial block is discarded to avoid depending on unverified data.
    long checkpoint=(have/DownloadBlockSize)*DownloadBlockSize;
    using(var file=new FileStream(part,FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None,128*1024)){
      file.SetLength(checkpoint);
      for(long pos=checkpoint;pos<pkg.Bytes;){
        int size=(int)Math.Min(DownloadBlockSize,pkg.Bytes-pos);
        Exception last=null;bool completed=false;
        for(int attempt=1;attempt<=8;attempt++){
          try{
            DownloadRangeBlock(url,pkg.Bytes,pos,size,file);
            completed=true;break;
          }catch(WebException ex){last=ex;
          }catch(IOException ex){last=ex;}
          file.SetLength(pos);
          file.Flush();
          if(attempt<8){
            Report((int)Math.Min(95,pos*95/pkg.Bytes),
              description+" · reconectando (tentativa "+(attempt+1)+"/8), "+(pos/(1024*1024))+" MB recebidos");
            Thread.Sleep(Math.Min(15000,attempt*1800));
          }
        }
        if(!completed){
          string detail=last==null?"sem resposta do servidor":last.Message;
          throw new IOException("Falha na conexão após 8 tentativas. Os "+(pos/(1024*1024))+
            " MB baixados foram preservados. Reabra o launcher para continuar. Detalhe: "+detail,last);
        }
        pos+=size;
        int pct=(int)Math.Min(95,pos*95/pkg.Bytes);
        Report(pct,description+" · "+(pos/(1024*1024))+" / "+(pkg.Bytes/(1024*1024))+
          " MB ("+(int)(pos*100/pkg.Bytes)+"%)");
      }
    }
    if(new FileInfo(part).Length!=pkg.Bytes)throw new IOException("Arquivo incompleto. O download pode ser retomado.");
    Report(97,"Conferindo integridade SHA-256 de "+description+"...");
    if(!FileHash(part).Equals(pkg.Sha256,StringComparison.OrdinalIgnoreCase)){
      File.Delete(part);
      throw new CryptographicException("Integridade SHA-256 inválida. Arquivo descartado e será baixado novamente.");
    }
    File.Move(part,destination);
    Report(100,description+" concluído e conferido.");
  }
  static void Extract(string zipFile,string root,Action<int,string> notify,bool baseGame=false){
    Directory.CreateDirectory(root);string prefix=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
    using(var file=File.OpenRead(zipFile))using(var archive=new ZipArchive(file,ZipArchiveMode.Read,false)){
      int count=0;int total=archive.Entries.Count(x=>!String.IsNullOrEmpty(x.Name));
      if(total<1)throw new InvalidDataException("Pacote de instalação vazio.");
      foreach(var entry in archive.Entries){
        string relative=entry.FullName.Replace('/',Path.DirectorySeparatorChar);
        if(baseGame){
          // Accept official archives rooted at Game.exe (StormPT 2703)
          // and legacy Files/Game layout. Keep the existing strict
          // destination containment / zip traversal validation below.
          const string required="Files\\Game\\";
          if(relative.StartsWith(required,StringComparison.OrdinalIgnoreCase)){
            relative=relative.Substring(required.Length);
            if(relative.Length==0)continue;
          }else{
            string check=relative.TrimEnd(Path.DirectorySeparatorChar);
            if(check.Equals("Files",StringComparison.OrdinalIgnoreCase) ||
               check.Equals("Files\\Game",StringComparison.OrdinalIgnoreCase))continue;
            if(relative.StartsWith("Files\\",StringComparison.OrdinalIgnoreCase))
              throw new InvalidDataException("Formato de arquivo base incompatível: "+relative);
          }
        }
        string dest=Path.GetFullPath(Path.Combine(root,relative));
        if(!dest.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Caminho fora da pasta de instalação.");
        if(String.IsNullOrEmpty(entry.Name)){Directory.CreateDirectory(dest);continue;}
        Directory.CreateDirectory(Path.GetDirectoryName(dest));using(var input=entry.Open())using(var output=new FileStream(dest,FileMode.Create,FileAccess.Write,FileShare.None)){input.CopyTo(output);}
        ++count;
        if(count%100==0 || count==total){
          int pct=(int)Math.Min(100,(long)count*100/total);
          notify(pct,"Extraindo arquivos: "+pct+"% ("+count+"/"+total+")");
        }
      }
    }
  }
  void ApplyPatch(Patch p,string downloaded){
    string gameRoot=game,stage=Path.Combine(directory,"_stage_"+p.Version),backup=Path.Combine(directory,"_rollback_"+p.Version);
    if(Directory.Exists(stage))Directory.Delete(stage,true);Directory.CreateDirectory(stage);
    Extract(downloaded,stage,(pct,m)=>Report(75+pct*21/100,m));
    foreach(var pair in p.Files){string local=Path.GetFullPath(Path.Combine(stage,pair.Key.Replace('/',Path.DirectorySeparatorChar)));
      if(!local.StartsWith(Path.GetFullPath(stage).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase) || !File.Exists(local))throw new InvalidDataException("Patch contém caminho inválido.");
      if(!FileHash(local).Equals(pair.Value,StringComparison.OrdinalIgnoreCase))throw new CryptographicException("Falha no hash do arquivo "+pair.Key);
    }
    var changes=new List<Tuple<string,string,bool>>();
    try {
      foreach(var f in Directory.GetFiles(stage,"*",SearchOption.AllDirectories)){
        string relative=f.Substring(stage.Length).TrimStart(Path.DirectorySeparatorChar);
        string target=Path.GetFullPath(Path.Combine(gameRoot,relative));string prefix=Path.GetFullPath(gameRoot).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
        if(!target.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Arquivo fora do diretório do jogo.");
        bool existed=File.Exists(target);string prior=Path.Combine(backup,relative);
        if(existed){Directory.CreateDirectory(Path.GetDirectoryName(prior));File.Copy(target,prior,true);}
        Directory.CreateDirectory(Path.GetDirectoryName(target));changes.Add(Tuple.Create(target,prior,existed));File.Copy(f,target,true);
      }
      foreach(var pair in p.Files){if(!FileHash(Path.Combine(gameRoot,pair.Key.Replace('/',Path.DirectorySeparatorChar))).Equals(pair.Value,StringComparison.OrdinalIgnoreCase))throw new CryptographicException("Falha na verificação após atualização: "+pair.Key);}
      if(p.DeleteFiles!=null){
        foreach(string relative in p.DeleteFiles){
          // Only legacy bypass helper explicitly authorized in the signed manifest.
          if(relative!="Iniciar-StormPT.cmd")throw new InvalidDataException("Remoção não autorizada: "+relative);
          string target=Path.GetFullPath(Path.Combine(gameRoot,relative));
          string prefix=Path.GetFullPath(gameRoot).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
          if(!target.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Remoção fora da pasta do jogo.");
          if(!File.Exists(target))continue;
          string prior=Path.Combine(backup,relative);
          Directory.CreateDirectory(Path.GetDirectoryName(prior));File.Copy(target,prior,true);
          changes.Add(Tuple.Create(target,prior,true));
          File.Delete(target);
        }
      }
    }catch{
      for(int i=changes.Count-1;i>=0;i--){var c=changes[i];if(c.Item3)File.Copy(c.Item2,c.Item1,true);else if(File.Exists(c.Item1))File.Delete(c.Item1);}
      throw;
    }finally{if(Directory.Exists(stage))Directory.Delete(stage,true);if(Directory.Exists(backup))Directory.Delete(backup,true);}
  }
  void Update(Release r){
    if(Process.GetProcessesByName("Game").Length>0)throw new InvalidOperationException("Feche o jogo antes de atualizar.");
    Directory.CreateDirectory(directory);string cache=Path.Combine(directory,"_downloads");Directory.CreateDirectory(cache);
    State st=LoadState();
    if(!Installed() || !String.Equals(st.BaseSha256,r.Base.Sha256,StringComparison.OrdinalIgnoreCase)){
      string baseZip=Path.Combine(cache,"cliente-completo.zip");
      Download(r.Base,baseZip,"Baixando cliente completo");
      Report(99,"Instalando cliente completo...");Extract(baseZip,directory,(pct,m)=>Report(pct,m),true);
      if(!File.Exists(Path.Combine(game,"Game.exe")))throw new InvalidDataException("Game.exe não encontrado no pacote oficial.");
      st=new State{PatchVersion=0,BaseSha256=r.Base.Sha256};SaveState(st);File.Delete(baseZip);
    }
    foreach(var p in r.Patches.OrderBy(x=>x.Version)){
      if(p.Version<=st.PatchVersion)continue;
      if(p.Package==null||p.Files==null)throw new InvalidDataException("Pacote de patch incompleto.");
      string zip=Path.Combine(cache,"patch-"+p.Version+".zip");Download(p.Package,zip,"Baixando patch "+p.Version);
      Report(99,"Aplicando patch "+p.Version+"...");ApplyPatch(p,zip);
      st.PatchVersion=p.Version;SaveState(st);File.Delete(zip);
    }
    Report(100,"Pronto para jogar! Cliente atualizado.");
  }
  // Replay the signed patch timeline: later removals supersede earlier files.
  // Iniciar-StormPT.cmd belongs to Patch 0001 but Patch 0004 removed it.
  // Missing deleted files must not be considered corruption of Patch 0005.
  static Dictionary<string,string> ExpectedInstalledFiles(Release r,int installedPatch){
    var expected=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    foreach(var p in r.Patches.Where(x=>x.Version<=installedPatch).OrderBy(x=>x.Version)){
      if(p.Files!=null)
        foreach(var entry in p.Files) expected[entry.Key.Replace('\\','/')]=entry.Value;
      if(p.DeleteFiles!=null){
        foreach(var deleted in p.DeleteFiles){
          // Deletions only affect files explicitly named in the signed manifest.
          // Do not interpret them as permission to delete any other local file.
          expected.Remove(deleted.Replace('\\','/'));
        }
      }
    }
    return expected;
  }
  // game.ini is a required user-writable preferences file. The game and our
  // graphics dialog update it at runtime, so its historical patch-1 hash must
  // not be used to reject an otherwise intact installation.
  // All other signed patch files (especially game.dll) remain hash checked.
  static bool UserWritableGamePreferences(string relative){
    return String.Equals(relative.Replace('\\','/'),"game.ini",StringComparison.OrdinalIgnoreCase);
  }
  void VerifyInstalled(Release r){
    if(!Installed())throw new IOException("Cliente ainda não instalado.");
    State st=LoadState();
    if(st==null || !String.Equals(st.BaseSha256,r.Base.Sha256,StringComparison.OrdinalIgnoreCase))
      throw new InvalidDataException("Versão de base diferente. Reinstale/atualize.");
    if(!File.Exists(Path.Combine(game,"Game.exe")))throw new IOException("Game.exe ausente.");
    var expected=ExpectedInstalledFiles(r,st.PatchVersion);
    foreach(var pair in expected){
      string f=Path.GetFullPath(Path.Combine(game,pair.Key.Replace('/',Path.DirectorySeparatorChar)));
      if(!f.StartsWith(Path.GetFullPath(game).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)
        || !File.Exists(f))
        throw new IOException("Arquivo ausente ou caminho inválido: "+pair.Key);
      if(UserWritableGamePreferences(pair.Key)){
        StartupLog("game.ini-present-user-config-preserved",null);
        continue;
      }
      if(!FileHash(f).Equals(pair.Value,StringComparison.OrdinalIgnoreCase))
        throw new IOException("Arquivo alterado: "+pair.Key);
    }
  }
  static void VerifyStormPTConnection(){
    const string host="game.stormpt.hoststorm.com.br";
    foreach(int port in new int[]{1997}){
      using(var client=new TcpClient(AddressFamily.InterNetwork)){
        IAsyncResult operation=null;
        try{
          operation=client.BeginConnect(host,port,null,null);
          if(!operation.AsyncWaitHandle.WaitOne(7500))
            throw new IOException("O servidor StormPT não respondeu na porta TCP "+port+" em 7 segundos. Seu provedor ou firewall pode estar bloqueando a conexão. Use no Windows: Test-NetConnection "+host+" -Port "+port);
          client.EndConnect(operation);
        }catch(SocketException ex){
          throw new IOException("Falha ao conectar ao StormPT/StormPT na porta TCP "+port+" ("+ex.SocketErrorCode+"). Teste: Test-NetConnection "+host+" -Port "+port,ex);
        }finally{if(operation!=null)operation.AsyncWaitHandle.Close();}
      }
    }
  }
  void LaunchGame(){
    if(worker.IsBusy || launchWorker.IsBusy || launchTimer.Enabled){
      StartupLog("Click-busy",null);return;
    }
    StartupLog("Click-JOGAR",null);
    if(!Installed()){
      MessageBox.Show(this,"Instale o cliente antes de jogar.","StormPT Launcher",MessageBoxButtons.OK,MessageBoxIcon.Information);return;
    }
    if(!checkedManifest || release==null){StartTask("check");return;}
    State local=LoadState();int latest=release.Patches.Count==0?0:release.Patches.Max(x=>x.Version);
    if(local==null || local.PatchVersion<latest){StartTask("update");return;}
    play.Enabled=false;
    progress.Style=ProgressBarStyle.Marquee;progress.MarqueeAnimationSpeed=25;
    status.Text="Testando StormPT e iniciando o jogo...";
    details.ForeColor=muted;details.Text="Validando a versão e preparando a conexão segura.";
    launchWorker.RunWorkerAsync();
  }
  // Headless test: validate the signed public manifest through Windows TLS/.NET.
  [STAThread] public static void Main(string[] args){
    ServicePointManager.SecurityProtocol|=SecurityProtocolType.Tls12;
    if(args.Length==3 && args[0]=="--replace-launcher"){
      try{
        string target=Encoding.UTF8.GetString(Convert.FromBase64String(args[1]));
        target=Path.GetFullPath(target);
        if(!String.Equals(Path.GetFileName(target),"StormPTLauncher.exe",StringComparison.OrdinalIgnoreCase) ||
           !File.Exists(target))throw new InvalidDataException("Destino de atualização inválido.");
        byte[] manifestBytes,sigBytes;
        using(var wc=new WebClient()){
          manifestBytes=wc.DownloadData("https://stormpt.hoststorm.com.br/client-files/manifest.json");
          sigBytes=wc.DownloadData("https://stormpt.hoststorm.com.br/client-files/manifest.sig");
        }
        using(var rsa=new RSACryptoServiceProvider()){
          rsa.PersistKeyInCsp=false;rsa.FromXmlString(PublicKey);
          if(!rsa.VerifyData(manifestBytes,CryptoConfig.MapNameToOID("SHA256"),sigBytes))throw new CryptographicException("Assinatura inválida");
        }
        var manifest=new JavaScriptSerializer().Deserialize<Release>(Encoding.UTF8.GetString(manifestBytes));
        if(manifest==null || manifest.Launcher==null ||
          !FileHash(Application.ExecutablePath).Equals(manifest.Launcher.Sha256,StringComparison.OrdinalIgnoreCase))
          throw new CryptographicException("Atualizador não autorizado pelo manifesto.");
        int parentPid=int.Parse(args[2]);
        try{using(var parent=Process.GetProcessById(parentPid)){parent.WaitForExit(35000);}}catch(ArgumentException){}
        string temp=target+".new";File.Copy(Application.ExecutablePath,temp,true);
        File.Replace(temp,target,target+".previous",true);
        Process.Start(new ProcessStartInfo(target){WorkingDirectory=Path.GetDirectoryName(target),UseShellExecute=true});
        Console.WriteLine("STORMPT_LAUNCHER_AUTOUPGRADE_APPLIED");
      }catch(Exception error){Console.Error.WriteLine("LAUNCHER_UPGRADE_FAILED "+error.Message);Environment.ExitCode=1;}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-stormpt-base"){
      string testRoot=Path.Combine(Path.GetTempPath(),"StormPTBaseTest_"+Guid.NewGuid().ToString("N"));
      string zip=Path.Combine(Path.GetTempPath(),"stormpt-mini-"+Guid.NewGuid().ToString("N")+".zip");
      try{
        Directory.CreateDirectory(testRoot);
        using(var f=File.Create(zip))using(var z=new ZipArchive(f,ZipArchiveMode.Create)){
          using(var writer=new StreamWriter(z.CreateEntry("Game.exe").Open()))writer.Write("TEST_GAME");
          using(var writer=new StreamWriter(z.CreateEntry("game.ini").Open()))writer.Write("[Screen]");
        }
        Extract(zip,testRoot,(n,message)=>{},true);
        if(!File.Exists(Path.Combine(testRoot,"Game.exe")) || !File.Exists(Path.Combine(testRoot,"game.ini")))
          throw new InvalidDataException("Missing files after root layout extraction");
        Console.WriteLine("STORMPT_ROOT_ARCHIVE_INSTALL_OK");
      }catch(Exception ex){Console.Error.WriteLine("STORMPT_ROOT_ARCHIVE_FAILED "+ex.Message);Environment.ExitCode=1;}
      finally{try{Directory.Delete(testRoot,true);File.Delete(zip);}catch{}}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-graphics"){
      string dir=Path.Combine(Path.GetTempPath(),"StormPTGraphicsTest_"+Guid.NewGuid().ToString("N"));
      try{
        Directory.CreateDirectory(dir);
        string ini=Path.Combine(dir,"game.ini");
        File.WriteAllText(ini,"[Screen]\r\nWindowed=True\r\nWidth=1024\r\nHeight=768\r\n[Graphics]\r\nVSync=True\r\nHighTextureQuality=True\r\n[Game]\r\nLastAccount=meu_usuario\r\nMacro1=nao apagar\r\n",Encoding.Default);
        GraphicsSettingsForm.WriteGraphicsIni(ini,new Dictionary<string,string>{{"Screen/Windowed","False"},{"Screen/Width","1920"},{"Screen/Height","1080"},{"Graphics/VSync","False"},{"Camera/FarCameraSight","True"}});
        string text=File.ReadAllText(ini,Encoding.Default);
        if(!text.Contains("Windowed=False")||!text.Contains("Width=1920")||!text.Contains("Height=1080")||
           !text.Contains("VSync=False")||!text.Contains("FarCameraSight=True")||
           !text.Contains("LastAccount=meu_usuario")||!text.Contains("Macro1=nao apagar")||
           !File.Exists(ini+".graphics-backup"))throw new Exception("Gravação de gráficos ou preservação de preferências falhou.");
        Console.WriteLine("STORMPT_GRAPHICS_INI_WRITE_AND_BACKUP_OK");
      }catch(Exception ex){Console.Error.WriteLine("STORMPT_GRAPHICS_TEST_FAILED "+ex);Environment.ExitCode=1;}
      finally{try{Directory.Delete(dir,true);}catch{}}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-babel-network"){
      try{Launcher.VerifyStormPTConnection();Console.WriteLine("STORMPT_TCP_10009_AND_10007_ACCESSIBLE");}
      catch(Exception ex){Console.Error.WriteLine(ex.Message);Environment.ExitCode=1;}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-range-blocks"){
      string temp=Path.Combine(Path.GetTempPath(),"StormPTRange_"+Guid.NewGuid().ToString("N")+".part");
      try{
        using(var launch=new Launcher()){
          var manifest=launch.FetchRelease();string address=GetUrl(manifest.Base.Url);
          using(var stream=new FileStream(temp,FileMode.Create,FileAccess.ReadWrite)){
            launch.DownloadRangeBlock(address,manifest.Base.Bytes,0,DownloadBlockSize,stream);
            long checkpoint=stream.Length;
            if(checkpoint!=DownloadBlockSize)throw new IOException("First segment failed");
          }
          using(var stream=new FileStream(temp,FileMode.Open,FileAccess.ReadWrite)){
            launch.DownloadRangeBlock(address,manifest.Base.Bytes,DownloadBlockSize,DownloadBlockSize,stream);
            if(stream.Length!=2*DownloadBlockSize)throw new IOException("Resume segment failed");
          }
          Console.WriteLine("STORMPT_SEGMENTED_RANGE_AND_RESUME_OK bytes="+new FileInfo(temp).Length);
        }
      }catch(Exception ex){Console.Error.WriteLine("STORMPT_RANGE_TEST_FAILED "+ex);Environment.ExitCode=1;}
      finally{try{File.Delete(temp);}catch{}}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-deleted-patch-files"){
      string root=Path.Combine(Path.GetTempPath(),"StormPTDeletedManifest_"+Guid.NewGuid().ToString("N"));
      try{
        Directory.CreateDirectory(root);
        string file=Path.Combine(root,"Game.exe"), dll=Path.Combine(root,"game.dll"),ini=Path.Combine(root,"game.ini");
        File.WriteAllText(file,"test game");File.WriteAllText(dll,"last game dll");File.WriteAllText(ini,"[Screen]");
        string cmd=Path.Combine(root,"Iniciar-StormPT.cmd");
        var all=new Release{Base=new Package{Sha256="test-base"},
          Patches=new List<Patch>{
            new Patch{Version=1,Files=new Dictionary<string,string>{{"Iniciar-StormPT.cmd","legacy-hash"},{"game.ini",FileHash(ini)},{"game.dll","old-dll-hash"}}},
            new Patch{Version=2,Files=new Dictionary<string,string>{{"game.dll","updated-dll-hash"}}},
            new Patch{Version=4,Files=new Dictionary<string,string>{{"game.dll","patch4-dll-hash"}},DeleteFiles=new List<string>{"Iniciar-StormPT.cmd"}},
            new Patch{Version=5,Files=new Dictionary<string,string>{{"game.dll",FileHash(dll)}}}
          }};
        var patch3=ExpectedInstalledFiles(all,2);
        if(!patch3.ContainsKey("Iniciar-StormPT.cmd"))throw new Exception("Historic patch entry unexpectedly omitted");
        var patch5=ExpectedInstalledFiles(all,5);
        if(patch5.ContainsKey("Iniciar-StormPT.cmd") || patch5["game.dll"]!=FileHash(dll))
          throw new Exception("Deleted legacy helper still required after patch 4");
        using(var launch=new Launcher()){
          launch.directory=root;
          launch.SaveState(new State{PatchVersion=5,BaseSha256=all.Base.Sha256});
          // The file is intentionally absent; verification must succeed.
          launch.VerifyInstalled(all);
          // Even if a user copied the legacy helper back, it is not a required game asset.
          File.WriteAllText(cmd,"legacy");
          launch.VerifyInstalled(all);
          File.Delete(cmd);
          // Users may change game.ini via the game's settings or our graphics tab.
          File.WriteAllText(ini,"[Screen]\\nWidth=1600\\nHeight=900\\nWindowed=1\\n[Login]\\nSelectedServerNum=0\\n");
          string savedPreferences=File.ReadAllText(ini);
          launch.VerifyInstalled(all);
          if(File.ReadAllText(ini)!=savedPreferences)throw new Exception("game.ini preferences overwritten by verification");
          File.Delete(ini);
          bool missingRejected=false;
          try{launch.VerifyInstalled(all);}catch(IOException){missingRejected=true;}
          if(!missingRejected)throw new Exception("Missing game.ini must still be rejected");
          File.WriteAllText(ini,savedPreferences);
          File.WriteAllText(dll,"corrupted");
          bool denied=false;
          try{launch.VerifyInstalled(all);}catch(IOException){denied=true;}
          if(!denied)throw new Exception("Real DLL corruption was not detected");
        }
        Console.WriteLine("STORMPT_MUTABLE_INI_PRESERVED_MISSING_INI_DETECTED_DLL_STILL_VERIFIED_OK");
      }catch(Exception ex){Console.Error.WriteLine("DELETED_PATCH_FILES_TEST_FAILED "+ex);Environment.ExitCode=1;}
      finally{try{Directory.Delete(root,true);}catch{}}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-native-monitor"){
      try{
        string exe=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"cmd.exe");
        bool exitRecognized=false;
        using(var child=StartGameProcess(exe,Path.GetDirectoryName(exe),"/c exit 0")){
          if(child==null)throw new IOException("Could not start test child");
          try{NativeWaitForVisibleGameWindow(child.Id,2500);}
          catch(IOException ex){
            exitRecognized=ex.Message.Contains("encerrou") || ex.Message.Contains("monitorado");
            if(!exitRecognized)throw;
          }
        }
        if(!exitRecognized)throw new IOException("Fast exit was incorrectly detected as success.");
        Console.WriteLine("STORMPT_NATIVE_PROCESS_EARLY_EXIT_DETECTED_OK");
      }catch(Exception ex){Console.Error.WriteLine("NATIVE_MONITOR_TEST_FAILED "+ex);Environment.ExitCode=1;}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-early-exit"){
      try{
        string exe=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"cmd.exe");
        using(var p=StartGameProcess(exe,Path.GetDirectoryName(exe),"/c exit 0")){
          if(p==null || !p.WaitForExit(8000) || p.ExitCode!=0)
            throw new IOException("Failed to model a successful CreateProcess with silent exit.");
          Console.WriteLine("STORMPT_EARLY_EXIT_ZERO_TEST_OK");
        }
      }catch(Exception ex){Console.Error.WriteLine("STORMPT_EARLY_EXIT_ZERO_TEST_FAILED "+ex);Environment.ExitCode=1;}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-process-launch"){
      try{
        string cmd=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"cmd.exe");
        using(var child=StartGameProcess(cmd,Path.GetDirectoryName(cmd),"/c exit 12")){
          if(child==null || !child.WaitForExit(8000) || child.ExitCode!=12)
            throw new IOException("Subprocess startup/handle/exit code mismatch.");
        }
        Console.WriteLine("STORMPT_PROCESS_LAUNCH_HANDLE_TEST_OK");
      }catch(Exception ex){Console.Error.WriteLine("PROCESS_LAUNCH_TEST_FAILED "+ex);Environment.ExitCode=1;}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-cleanup"){
      string dir=Path.Combine(Path.GetTempPath(),"StormPTPatchCleanup_"+Guid.NewGuid().ToString("N"));
      try{
        Directory.CreateDirectory(dir);
        string oldCmd=Path.Combine(dir,"Iniciar-StormPT.cmd");
        File.WriteAllText(oldCmd,"@echo off\r\nstart Game.exe");
        File.WriteAllText(Path.Combine(dir,"meus-dados.txt"),"preservar");
        string patchZip=Path.Combine(Path.GetTempPath(),"stormpt-test-patch-"+Guid.NewGuid().ToString("N")+".zip");
        try{
          using(var z=new ZipArchive(File.Create(patchZip),ZipArchiveMode.Create)){
            using(var sw=new StreamWriter(z.CreateEntry("game.ini").Open()))sw.Write("[StormPT]\n");
          }
          string contentsHash;
          using(var sha=SHA256.Create()){
            contentsHash=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes("[StormPT]\n"))).Replace("-","").ToLowerInvariant();
          }
          var patch=new Patch{Version=4,Files=new Dictionary<string,string>{{"game.ini",contentsHash}},
            DeleteFiles=new List<string>{"Iniciar-StormPT.cmd"}};
          using(var inst=new Launcher()){
            inst.directory=dir;
            inst.ApplyPatch(patch,patchZip);
          }
          if(File.Exists(oldCmd) || !File.Exists(Path.Combine(dir,"game.ini")) ||
             !File.Exists(Path.Combine(dir,"meus-dados.txt")))throw new IOException("Patch cleanup test failed");
          Console.WriteLine("STORMPT_SIGNED_PATCH_DELETE_AND_PRESERVE_TEST_OK");
        }finally{try{File.Delete(patchZip);}catch{}}
      }catch(Exception ex){Console.Error.WriteLine("PATCH_CLEANUP_SELFTEST_FAILED "+ex);Environment.ExitCode=1;}
      finally{try{Directory.Delete(dir,true);}catch{}}
      return;
    }
    if(args.Length==1 && args[0]=="--selftest-layout"){
      string root=Path.Combine(Path.GetTempPath(),"StormPTLayoutSelfTest_"+Guid.NewGuid().ToString("N"));
      try {
        Directory.CreateDirectory(root);
        string package=Path.Combine(root,"small-client.zip");
        using(var zip=new ZipArchive(File.Create(package),ZipArchiveMode.Create)){
          using(var writer=new StreamWriter(zip.CreateEntry("Files/Game/Game.exe").Open()))writer.Write("dummy game exe");
          using(var writer=new StreamWriter(zip.CreateEntry("Files/Game/game.ini").Open()))writer.Write("[Screen]");
          using(var writer=new StreamWriter(zip.CreateEntry("Files/Game/char/test.txt").Open()))writer.Write("asset");
        }
        string install=Path.Combine(root,"flat");
        Extract(package,install,(pct,m)=>{},true);
        if(!File.Exists(Path.Combine(install,"Game.exe")) || !File.Exists(Path.Combine(install,"char","test.txt")) || Directory.Exists(Path.Combine(install,"Files")))throw new Exception("Flat ZIP layout failed");
        string migration=Path.Combine(root,"migration");
        string old=Path.Combine(migration,"StormPT","Files","Game");Directory.CreateDirectory(old);
        File.WriteAllText(Path.Combine(old,"Game.exe"),"dummy");File.WriteAllText(Path.Combine(old,"game.ini"),"dummy");
        File.WriteAllText(Path.Combine(root,"migration","StormPT","stormpt-state.json"),"{\"PatchVersion\":1,\"BaseSha256\":\"abcd\"}");
        using(var launcher=new Launcher()){launcher.directory=migration;launcher.MigrateLegacyLayout();}
        if(!File.Exists(Path.Combine(migration,"Game.exe")) || !File.Exists(Path.Combine(migration,"stormpt-state.json")) || File.Exists(Path.Combine(old,"Game.exe")))throw new Exception("Migration failed");
        Console.WriteLine("STORMPT_FLAT_LAYOUT_AND_MIGRATION_OK");
      }catch(Exception ex){Console.Error.WriteLine("LAYOUT_TEST_FAILED "+ex);Environment.ExitCode=1;}
      finally {try {Directory.Delete(root,true);}catch{}}
      return;
    }
    if(args.Length==1 && (args[0]=="--verify-manifest" || args[0]=="--verify-patch" || args[0]=="--verify-range")){
      try {
        byte[] data,sig;
        using(var wc=new WebClient()){
          data=wc.DownloadData(Origin+"/client-files/manifest.json");
          sig=wc.DownloadData(Origin+"/client-files/manifest.sig");
        }
        using(var rsa=new RSACryptoServiceProvider()){
          rsa.PersistKeyInCsp=false;
          rsa.FromXmlString(PublicKey);
          if(!rsa.VerifyData(data,CryptoConfig.MapNameToOID("SHA256"),sig))throw new CryptographicException("Assinatura invalida");
        }
        var r=new JavaScriptSerializer().Deserialize<Release>(Encoding.UTF8.GetString(data));
        if(r==null || r.SchemaVersion!=1 || r.Patches==null || r.Base==null || r.Base.Bytes<=0)throw new InvalidDataException("Manifesto inesperado");
        Console.WriteLine("STORMPT_MANIFEST_OK patches="+r.Patches.Count+" client_bytes="+r.Base.Bytes);
        if(args[0]=="--verify-patch"){
          foreach(Patch patch in r.Patches.OrderBy(x=>x.Version)){
            byte[] dataZip;
            using(var wc=new WebClient())dataZip=wc.DownloadData(GetUrl(patch.Package.Url));
            using(var sha=SHA256.Create()){
              string h=BitConverter.ToString(sha.ComputeHash(dataZip)).Replace("-","").ToLowerInvariant();
              if(h!=patch.Package.Sha256||dataZip.LongLength!=patch.Package.Bytes)throw new CryptographicException("Patch SHA-256 invalido");
            }
            using(var mem=new MemoryStream(dataZip))using(var zip=new ZipArchive(mem,ZipArchiveMode.Read)){
              foreach(var entry in patch.Files){var file=zip.GetEntry(entry.Key);if(file==null)throw new InvalidDataException("File missing: "+entry.Key);
                using(var stream=file.Open())using(var sha=SHA256.Create()){
                  string h=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
                  if(h!=entry.Value)throw new CryptographicException("Patch member hash invalid: "+entry.Key);
                }
              }
            }
            Console.WriteLine("STORMPT_PATCH_OK version="+patch.Version+" files="+patch.Files.Count+" package_bytes="+dataZip.Length);
          }
        }
        if(args[0]=="--verify-range"){
          var rq=(HttpWebRequest)WebRequest.Create(GetUrl(r.Base.Url));rq.AddRange(0,1023);rq.Timeout=30000;
          using(var result=(HttpWebResponse)rq.GetResponse()){
            if(result.StatusCode!=HttpStatusCode.PartialContent || !result.Headers["Content-Range"].EndsWith("/"+r.Base.Bytes))throw new IOException("HTTP range response invalid");
            Console.WriteLine("STORMPT_RANGE_OK "+result.Headers["Content-Range"]);
          }
        }
        return;
      }catch(Exception ex){Console.Error.WriteLine("STORMPT_MANIFEST_FAILED "+ex.Message);Environment.ExitCode=1;return;}
    }
    Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Launcher());
  }
 }
}
