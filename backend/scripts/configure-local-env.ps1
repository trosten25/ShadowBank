$ErrorActionPreference = 'Stop'

$backendDirectory = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $backendDirectory '.env'
$envExamplePath = Join-Path $backendDirectory '.env.example'

if (-not (Test-Path $envPath)) {
  Copy-Item $envExamplePath $envPath
}

$settings = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    $settings[$matches[1]] = $matches[2]
  }
}

function Read-SecretText([string]$Prompt) {
  $secureValue = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function New-Secret([int]$ByteCount) {
  $bytes = New-Object byte[] $ByteCount
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
  } finally {
    $generator.Dispose()
  }
}

function Escape-UrlPart([string]$Value) {
  return [Uri]::EscapeDataString($Value)
}

$dbHost = Read-Host 'PostgreSQL host [localhost]'
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = 'localhost' }
if ($dbHost -match '[/@?#:]') { throw 'Enter a hostname only (no scheme, port, or path).' }

$dbPort = Read-Host 'PostgreSQL port [5432]'
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = '5432' }
if ($dbPort -notmatch '^\d{1,5}$' -or [int]$dbPort -lt 1 -or [int]$dbPort -gt 65535) {
  throw 'Enter a valid PostgreSQL port.'
}

$dbName = Read-Host 'Database name [shadowbank]'
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = 'shadowbank' }
if ($dbName -match '[/?#]') { throw 'Enter a database name only.' }

$dbUser = Read-Host 'PostgreSQL username [postgres]'
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = 'postgres' }
$dbPassword = Read-SecretText 'PostgreSQL password (the database role password)'
if ([string]::IsNullOrWhiteSpace($dbPassword)) { throw 'The PostgreSQL password cannot be empty.' }
$settings['DATABASE_URL'] = "postgresql://$(Escape-UrlPart $dbUser):$(Escape-UrlPart $dbPassword)@$dbHost`:$dbPort/$(Escape-UrlPart $dbName)"
$dbPassword = $null

$smtpEmail = Read-Host 'Gmail address used for SMTP'
if ($smtpEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { throw 'Enter a valid Gmail address.' }
$appPassword = Read-SecretText 'NEW Google App Password (not your Google account password)'
$appPassword = $appPassword -replace '\s', ''
if ($appPassword.Length -lt 16) { throw 'The Google App Password does not look valid. Create one in your Google Account first.' }
$encodedEmail = Escape-UrlPart $smtpEmail
$encodedAppPassword = Escape-UrlPart $appPassword
$settings['SMTP_URL'] = "smtps://${encodedEmail}:${encodedAppPassword}@smtp.gmail.com:465"
$settings['EMAIL_FROM'] = "`"ShadowBank <$smtpEmail>`""
$appPassword = $null

if (-not $settings['APP_JWT_SECRET'] -or $settings['APP_JWT_SECRET'] -match 'GENERATE_|replace-with') {
  $settings['APP_JWT_SECRET'] = New-Secret 48
}
if (-not $settings['ACCOUNT_ENCRYPTION_KEY'] -or $settings['ACCOUNT_ENCRYPTION_KEY'] -match 'GENERATE_|base64-encoded') {
  $settings['ACCOUNT_ENCRYPTION_KEY'] = New-Secret 32
}
if (-not $settings['ACCOUNT_NUMBER_HMAC_KEY'] -or $settings['ACCOUNT_NUMBER_HMAC_KEY'] -match 'GENERATE_|replace-with') {
  $settings['ACCOUNT_NUMBER_HMAC_KEY'] = New-Secret 32
}

$orderedKeys = @(
  'NODE_ENV', 'PORT', 'FRONTEND_ORIGIN', 'DATABASE_URL', 'DATABASE_SSL',
  'DATABASE_CA_CERT', 'APP_JWT_SECRET', 'ACCOUNT_ENCRYPTION_KEY',
  'ACCOUNT_NUMBER_HMAC_KEY', 'SMTP_URL', 'EMAIL_FROM', 'COOKIE_SECURE',
  'TRUST_PROXY_HOPS'
)
$lines = foreach ($key in $orderedKeys) {
  if ($settings.ContainsKey($key)) { "$key=$($settings[$key])" }
}
Set-Content -Path $envPath -Value $lines -Encoding ascii

Write-Host ''
Write-Host 'Updated backend\.env. Secrets were not printed.'
Write-Host 'The PostgreSQL password must already have been changed in pgAdmin, and the Google App Password must be newly generated.'
Write-Host 'Do not share or commit backend\.env.'
