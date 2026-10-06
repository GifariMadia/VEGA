$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonPath = Join-Path $PSScriptRoot 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'Python environment aplikasi belum tersedia.'
}
# Load the PostgreSQL configuration used by the presentation server.
& $pythonPath -c "from backend.vega.presentation import configure_postgresql; configure_postgresql(); from backend.vega.backup import main; main()"
if ($LASTEXITCODE -ne 0) { throw 'Backup PostgreSQL gagal; periksa log di atas.' }
