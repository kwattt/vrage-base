# Define download URLs and target paths
$BugTrapURL = "https://cdn.rage.mp/updater/prerelease_server/server-files/BugTrap-x64.dll"
$RagempServerURL = "https://cdn.rage.mp/updater/prerelease_server/server-files/ragemp-server.exe"
$LinuxServerURL = "https://cdn.rage.mp/updater/prerelease/server-files/linux_x64.tar.gz"

$DistDir = "./dist"
$TmpDir = "./tmp_download"

# Create necessary directories
if (!(Test-Path -Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}
if (!(Test-Path -Path $TmpDir)) {
    New-Item -ItemType Directory -Path $TmpDir | Out-Null
}

# Download BugTrap-x64.dll
Write-Host "Downloading BugTrap-x64.dll..."
Invoke-WebRequest -Uri $BugTrapURL -OutFile "$DistDir/BugTrap-x64.dll"
if (!$?) {
    Write-Host "Failed to download BugTrap-x64.dll" -ForegroundColor Red
    exit 1
}

# Download ragemp-server.exe
Write-Host "Downloading ragemp-server.exe..."
Invoke-WebRequest -Uri $RagempServerURL -OutFile "$DistDir/ragemp-server.exe"
if (!$?) {
    Write-Host "Failed to download ragemp-server.exe" -ForegroundColor Red
    exit 1
}

# Download linux_x64.tar.gz
Write-Host "Downloading linux_x64.tar.gz..."
Invoke-WebRequest -Uri $LinuxServerURL -OutFile "$TmpDir/linux_x64.tar.gz"
if (!$?) {
    Write-Host "Failed to download linux_x64.tar.gz" -ForegroundColor Red
    exit 1
}

# Extract linux_x64.tar.gz using tar
Write-Host "Extracting linux_x64.tar.gz..."
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -xvf "$TmpDir/linux_x64.tar.gz" -C $TmpDir
} else {
    Write-Host "Error: 'tar' is not available on this system. Please install it or extract the file manually." -ForegroundColor Red
    exit 1
}

# Move files to ./dist
Write-Host "Moving files to $DistDir..."
$BinDir = "$DistDir/bin"
$DotnetDir = "$DistDir/dotnet"

if (!(Test-Path -Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}
if (!(Test-Path -Path $DotnetDir)) {
    New-Item -ItemType Directory -Path $DotnetDir | Out-Null
}

Move-Item -Path "$TmpDir/ragemp-srv/bin/*" -Destination $BinDir -Force
Move-Item -Path "$TmpDir/ragemp-srv/dotnet/*" -Destination $DotnetDir -Force

# Clean up temporary files
Write-Host "Cleaning up temporary files..."
Remove-Item -Path $TmpDir -Recurse -Force

Write-Host "Done!" -ForegroundColor Green
