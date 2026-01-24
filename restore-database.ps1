param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   DATABASE RESTORE UTILITY" -ForegroundColor Red
Write-Host "===================================================`n" -ForegroundColor Cyan

# ====== CONFIG ======
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$KEY_PATH = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$APP_PATH = "/var/www/solar-epc/solar-epc-web"
$PM2_PROCESS = "solar-epc"
$LOCAL_BACKUP_DIR = ".\database-backups"

# Check if backup file exists
$backupPath = ""
if (Test-Path $BackupFile) {
    $backupPath = $BackupFile
} elseif (Test-Path (Join-Path $LOCAL_BACKUP_DIR $BackupFile)) {
    $backupPath = Join-Path $LOCAL_BACKUP_DIR $BackupFile
} else {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    Write-Host "`nAvailable backups:" -ForegroundColor Yellow
    Get-ChildItem $LOCAL_BACKUP_DIR -Filter "dev.db.backup.*" -ErrorAction SilentlyContinue | 
        Sort-Object LastWriteTime -Descending |
        Format-Table Name, @{Label="Size";Expression={"{0:N2} MB" -f ($_.Length/1MB)}}, LastWriteTime -AutoSize
    exit 1
}

Write-Host "WARNING: This will replace the current production database!" -ForegroundColor Red
Write-Host "Backup file: $backupPath" -ForegroundColor Yellow
$confirmation = Read-Host "`nType 'RESTORE' to confirm"

if ($confirmation -ne "RESTORE") {
    Write-Host "Restore cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n[1/5] Stopping application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "pm2 stop $PM2_PROCESS"
Write-Host "Application stopped" -ForegroundColor Green

Write-Host "`n[2/5] Creating safety backup of current database..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safetyBackup = "dev.db.before-restore.$timestamp"
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" @"
cd $APP_PATH
mkdir -p prisma/backups
if [ -f prisma/prisma/dev.db ]; then
  cp prisma/prisma/dev.db prisma/backups/$safetyBackup
  echo 'Safety backup created: $safetyBackup'
fi
"@
Write-Host "Safety backup created" -ForegroundColor Green

Write-Host "`n[3/5] Uploading backup file..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH $backupPath "${HOSTINGER_USER}@${HOSTINGER_IP}:${APP_PATH}/prisma/backups/restore-temp.db"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Upload failed!" -ForegroundColor Red
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "pm2 restart $PM2_PROCESS"
    exit 1
}
Write-Host "Backup uploaded" -ForegroundColor Green

Write-Host "`n[4/5] Restoring database..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" @"
cd $APP_PATH
cp prisma/backups/restore-temp.db prisma/prisma/dev.db
rm prisma/backups/restore-temp.db
echo 'Database restored'
"@
Write-Host "Database restored" -ForegroundColor Green

Write-Host "`n[5/5] Restarting application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "pm2 restart $PM2_PROCESS"
Write-Host "Application restarted" -ForegroundColor Green

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   RESTORE SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan
Write-Host "Restored from: $(Split-Path $backupPath -Leaf)" -ForegroundColor Cyan
Write-Host "Safety backup: $safetyBackup" -ForegroundColor Gray
Write-Host ""
