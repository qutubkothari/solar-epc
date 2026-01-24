param(
    [string]$Description = "manual"
)

$ErrorActionPreference = "Stop"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   DATABASE BACKUP UTILITY" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan

# ====== CONFIG ======
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$KEY_PATH = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$APP_PATH = "/var/www/solar-epc/solar-epc-web"
$LOCAL_BACKUP_DIR = ".\database-backups"

# Create local backup directory
if (-not (Test-Path $LOCAL_BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $LOCAL_BACKUP_DIR | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "dev.db.backup.$timestamp.$Description"

Write-Host "[1/3] Creating remote backup..." -ForegroundColor Yellow
$backupCmd = @"
cd $APP_PATH
mkdir -p prisma/backups
if [ -f prisma/prisma/dev.db ]; then
  cp prisma/prisma/dev.db prisma/backups/$backupName
  echo 'Backup created: prisma/backups/$backupName'
  ls -lh prisma/backups/$backupName
else
  echo 'ERROR: Database file not found'
  exit 1
fi
"@

$normalized = $backupCmd -replace "`r`n", "`n" -replace "`r", "`n"
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($normalized))
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "echo $encoded | base64 -d | bash"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Remote backup failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Remote backup created" -ForegroundColor Green

Write-Host "`n[2/3] Downloading backup to local machine..." -ForegroundColor Yellow
$localBackupPath = Join-Path $LOCAL_BACKUP_DIR $backupName
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "${HOSTINGER_USER}@${HOSTINGER_IP}:${APP_PATH}/prisma/backups/$backupName" $localBackupPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Download failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Backup downloaded to: $localBackupPath" -ForegroundColor Green

Write-Host "`n[3/3] Backup inventory..." -ForegroundColor Yellow
Write-Host "`nLocal backups:" -ForegroundColor Cyan
Get-ChildItem $LOCAL_BACKUP_DIR -Filter "dev.db.backup.*" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 10 |
    Format-Table Name, @{Label="Size";Expression={"{0:N2} MB" -f ($_.Length/1MB)}}, LastWriteTime -AutoSize

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   BACKUP SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan
Write-Host "Backup file: $backupName" -ForegroundColor Cyan
Write-Host "Local path: $localBackupPath" -ForegroundColor Gray
Write-Host ""
