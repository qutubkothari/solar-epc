param(
    [string]$Message = "Deploy Solar EPC"
)

$ErrorActionPreference = "Stop"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   SOLAR EPC TO HOSTINGER DEPLOYMENT" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan

# ====== CONFIG ======
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$KEY_PATH = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$REMOTE_PATH = "/var/www/solar-epc"
$APP_PATH = "/var/www/solar-epc/solar-epc-web"
$PM2_PROCESS = "solar-epc"
$REPO_URL = "https://github.com/qutubkothari/solar-epc.git"
$BRANCH = "main"
$APP_PORT = "8061"

function Test-SshKey {
    if (-not (Test-Path $KEY_PATH)) {
        Write-Host "ERROR: SSH key not found at: $KEY_PATH" -ForegroundColor Red
        throw "SSH key missing"
    }
    Write-Host "SSH key found" -ForegroundColor Green
}

function Invoke-RemoteCommand {
    param([string]$Command)
    $normalized = $Command -replace "`r`n", "`n" -replace "`r", "`n"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($normalized))
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "echo $encoded | base64 -d | bash"
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed"
    }
}

Write-Host "[1/7] Pre-deployment Checks" -ForegroundColor Yellow
Test-SshKey
git status --short

Write-Host "`n[2/7] Git Commit and Push" -ForegroundColor Yellow
git add .
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Code pushed to GitHub" -ForegroundColor Green

Write-Host "`n[3/7] Testing Connection" -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "echo 'Connected'; node -v; pm2 -v"
Write-Host "Connection OK" -ForegroundColor Green

Write-Host "`n[4/7] Preparing Remote Repo" -ForegroundColor Yellow
$prepCmd = @'
if [ ! -d "{0}/.git" ]; then
  if [ -d "{0}" ] && [ "$(ls -A {0})" ]; then
    echo "ERROR: {0} exists and is not empty."; exit 1;
  fi
  mkdir -p "{0}";
  GIT_TERMINAL_PROMPT=0 git clone {1} "{0}";
fi
cd "{0}"
GIT_TERMINAL_PROMPT=0 git fetch origin {2}
git checkout {2}
git reset --hard
git clean -fd
GIT_TERMINAL_PROMPT=0 git pull origin {2}
'@ -f $REMOTE_PATH, $REPO_URL, $BRANCH
Invoke-RemoteCommand $prepCmd
Write-Host "Code updated on server" -ForegroundColor Green

Write-Host "`n[5/7] Installing Dependencies" -ForegroundColor Yellow
$depsCmd = @'
cd "{0}"
npm install
'@ -f $APP_PATH
Invoke-RemoteCommand $depsCmd
Write-Host "Dependencies updated" -ForegroundColor Green

Write-Host "`n[6/7] Database Backup & Prisma Setup" -ForegroundColor Yellow
$prismaCmd = @'
cd "{0}"
rm -f prisma.config.ts
if [ ! -f .env ]; then
  echo "DATABASE_URL=file:./prisma/dev.db" > .env
fi

# Create backups directory
mkdir -p prisma/backups

# Backup existing database before any schema changes
if [ -f prisma/prisma/dev.db ]; then
  BACKUP_FILE="prisma/backups/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  echo "Creating backup: $BACKUP_FILE"
  cp prisma/prisma/dev.db "$BACKUP_FILE"
  
  # Keep only last 10 backups
  ls -t prisma/backups/dev.db.backup.* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
  
  echo "Backup created successfully"
fi

export PRISMA_CLIENT_ENGINE_TYPE=binary
npx prisma generate
npx prisma db push
'@ -f $APP_PATH
Invoke-RemoteCommand $prismaCmd
Write-Host "Database backed up and Prisma updated" -ForegroundColor Green

Write-Host "`n[7/7] Build and Restart" -ForegroundColor Yellow
$restartCmd = @'
cd "{0}"
export PRISMA_CLIENT_ENGINE_TYPE=binary
PRISMA_CLIENT_ENGINE_TYPE=binary npm run build
if [ ! -f .next/BUILD_ID ]; then
    echo "ERROR: Build output missing in {0}/.next"; exit 1;
fi
pm2 delete {2} || true
PRISMA_CLIENT_ENGINE_TYPE=binary PORT={1} NODE_ENV=production pm2 start npm --name {2} --cwd "{0}" -- start -- -p {1}
pm2 save
pm2 list
'@ -f $APP_PATH, $APP_PORT, $PM2_PROCESS
Invoke-RemoteCommand $restartCmd
Write-Host "Application restarted" -ForegroundColor Green

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan
Write-Host "Live port: $APP_PORT" -ForegroundColor Cyan
Write-Host "Check logs: pm2 logs $PM2_PROCESS" -ForegroundColor Gray
Write-Host ""
