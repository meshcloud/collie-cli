$url=(Invoke-WebRequest -Uri https://api.github.com/repos/meshcloud/collie-cli/releases/latest | Select-String -Pattern '.*\"browser_download_url\":\"(.*windows-msvc.exe).*' | ForEach-Object {($_.matches.groups[1]).Value})

New-Item -ItemType directory -Path "${HOME}\collie-cli"
Invoke-WebRequest -Uri $url -OutFile "${HOME}\collie-cli\collie"

Write-Host "Please add ${HOME}\collie-cli\ to your path environemnt variable."