$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'backend/.venv/Scripts/python.exe')) {
    throw 'Python environment missing. Follow README first-time setup.'
}
if (-not (Test-Path -LiteralPath 'dist/index.html')) {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
Write-Host 'VEGA Presentation: http://127.0.0.1:3000'
Write-Host 'Database: PostgreSQL configured in .env.postgresql.'
Write-Host 'Keep this terminal open. Ctrl+C stops the app.'
& backend/.venv/Scripts/python.exe -m backend.vega.presentation
