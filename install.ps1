Clear-Host
Write-Host "`nStarting Installation of Collie ..." -ForegroundColor Green
 
$ProgressPreference = "SilentlyContinue" # Don't remove this! Otherwise it will slow down the Download-Process under PS 5
 
# Check the latest release to get the exact download URL
try {
    $query = Invoke-RestMethod -Uri "https://api.github.com/repos/meshcloud/collie-cli/releases/latest"
    $downloadUrl = $query.assets | Where-Object { $_.browser_download_url -match "windows-msvc.exe" }
}
catch {
    throw "[ERROR] while downloading installation file. Check your Internet Connection: $(_.Exception.Message)!"
}
 
$installationPath = "${HOME}\collie-cli"
$installationExec = "$installationPath\collie.exe"
Write-Host "Scanning '$($installationPath)' for existing installations"
 
# Determine whether this is a fresh install or if Collie has yet been installed before
if ( !(Test-Path -Path $installationExec) ) {
    $folder = New-Item -ItemType directory -Path $installationPath
    if ($?) { Write-Host "[OK] Application-Folder '$installationPath' created!" -ForegroundColor Green }
}
elseif ( Test-Path -Path $installationExec) {
    $replace = $(Write-Host "Collie already exists. Do you want to replace the existing Installation (y/n)? " -NoNewLine -ForegroundColor Green; Read-Host) 
    if ($replace -like "y") {
        Remove-Item $installationExec -Force
    }
    else { Exit } 
}
 
# Download Collie and save it as an .exe
try {
    Write-Host "Downloading Collie Version '$($query.Name)' ..." -ForegroundColor Green
    $download = Invoke-WebRequest -Uri $downloadUrl.browser_download_url -OutFile $installationExec -PassThru
    if ($?) { Write-Host "[OK] Download-Size '$([math]::Round($download.RawContentLength/1MB)),2 MB'`n" -ForegroundColor Green }
}
catch {
    throw "[ERROR] while downloading Installation File: $($($_.Exception).Message)!"
}
 
# Check if Collie is already in PATH
$BinDir = $installationPath
$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
 
    # Ask user whether to add Collie to PATH
    $userenv = $(Write-Host "Could not find collie CLI on PATH. Do you want to add collie CLI to PATH? (y/n)" -NoNewLine -ForegroundColor Green; Read-Host)
    if ($userenv -like "y") {
        Write-Host "Adding $BinDir to PATH" -ForegroundColor Green
        [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
        $Env:Path += ";$BinDir"
    }
}
 
Write-Host "[OK] Collie CLI successfully installed at $installationExec" -ForegroundColor Green
Write-Output "Run 'collie --help' to get started"
