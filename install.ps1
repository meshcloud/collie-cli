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

$installationPath = "${HOME}\collie-cli\$($query.name)"
Write-Host $($installationPath)

# Determine whether this is a fresh install or if Collie has yet been installed before
if ( !(Test-Path -Path $installationPath) ) {
    $folder = New-Item -ItemType directory -Path "${HOME}\collie-cli\$($query.name)"
    if ($?) { Write-Host "[OK] Application-Folder '$installationPath' created!" -ForegroundColor Green }
}
elseif ( Test-Path -Path $($installationPath + "\collie.exe") ) {
    $replace = $(Write-Host "Replace existing Installation (y/n)? " -NoNewLine -ForegroundColor Green; Read-Host) 
    if ($replace -like "y") {
        Remove-Item -Path $installationPath -Recurse -Force
        $folder = New-Item -ItemType directory -Path "${HOME}\collie-cli\$($query.name)"
    }
    else { Exit } 
}

# Download Collie and save it as an .exe
try {
    Write-Host "Downloading Collie Version '$($query.Name)' ..." -ForegroundColor Green
    $download = Invoke-WebRequest -Uri $downloadUrl.browser_download_url -OutFile "$($folder.FullName)\collie.exe" -PassThru
    if ($?) { Write-Host "[OK] Download-Size '$([math]::Round($download.RawContentLength/1MB)),2 MB'`n" -ForegroundColor Green }
}
catch {
    throw "[ERROR] while downloading Installation File: $($($_.Exception).Message)!"
}

# Ask user whether to add Collie to the environment variables automatically
$userenv = $(Write-Host "Adding Collie to your Environment-Variables? (y/n)" -NoNewLine -ForegroundColor Green; Read-Host)
if ($userenv -like "y") {
    $BinDir = $($folder.FullName).ToString()
    $User = [EnvironmentVariableTarget]::User
    $Path = [Environment]::GetEnvironmentVariable('Path', $User)
    if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
        [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
        $Env:Path += ";$BinDir"
    }
}

Write-Host "[OK] Collie CLI successfully installed: '$($folder.FullName)'`n" -ForegroundColor Green
Write-Output "Run 'collie --help' to get started"