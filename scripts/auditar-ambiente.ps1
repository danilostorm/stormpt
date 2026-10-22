# Audit read-only: no changes to SQL, Firewall or files.
[CmdletBinding()]
param(
    [string]$Root = 'C:\StormPT-2703',
    [string]$SqlInstance = '.\SQLEXPRESS'
)

$ErrorActionPreference = 'Stop'
Write-Host 'StormPT 2703 - Auditoria local' -ForegroundColor Cyan

foreach ($relativePath in @('Servidor\Server33.exe', 'Cliente\Game.exe', 'Cliente\Game33.exe')) {
    $path = Join-Path $Root $relativePath
    if (Test-Path -LiteralPath $path) {
        $item = Get-Item -LiteralPath $path
        Write-Host ("BINARIO: {0}, {1:N0} bytes, modificado {2}" -f $relativePath, $item.Length, $item.LastWriteTime)
    } else {
        Write-Warning "Nao encontrado: $path"
    }
}

$service = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
if ($service) { Write-Host "SQL SERVICE: $($service.Status)" }

$proc = @(Get-Process -Name Server33 -ErrorAction SilentlyContinue)
Write-Host "WORLD SERVER PROCESSOS: $($proc.Count)"
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 1997 -ErrorAction SilentlyContinue)
Write-Host "TCP 1997 LISTENERS: $($listeners.Count)"
$listeners | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize

try {
    $cn = New-Object System.Data.SqlClient.SqlConnection(
        "Data Source=$SqlInstance;Initial Catalog=master;Integrated Security=True;Connect Timeout=5"
    )
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = 'SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name'
    $reader = $cmd.ExecuteReader()
    $names = @()
    while ($reader.Read()) { $names += $reader.GetString(0) }
    $reader.Close()

    $ready = $true
    foreach ($name in $names) {
        $escaped = $name.Replace(']', ']]')
        $cmd.CommandText = "SELECT (SELECT COUNT(*) FROM [$escaped].sys.tables), (SELECT COUNT(*) FROM [$escaped].sys.procedures)"
        $reader = $cmd.ExecuteReader()
        [void]$reader.Read()
        $tables = $reader.GetInt32(0)
        $procedures = $reader.GetInt32(1)
        $reader.Close()
        Write-Host "DB $name : tabelas=$tables procedures=$procedures"
        if ($tables -eq 0) { $ready = $false }
    }
    $cn.Close()
    if (-not $ready) { Write-Warning 'NAO PUBLICAR: bancos sem tabelas; autenticação/persistência nao validada.' }
} catch {
    Write-Warning "Auditoria SQL falhou: $($_.Exception.Message)"
}

Write-Host 'FIM - Somente leitura.'
