#!/bin/bash
set -o errexit
set -o errtrace
set -o pipefail
set -o nounset
# Check if user has all required commands installed
REQ_COMMANDS=(tar curl)
for i in $REQ_COMMANDS
do
  command -v "$i" >/dev/null && continue || { echo "$i command not found. You need to install if before running this script"; exit 1; }
done
# Download artifacts
case "$(uname -s)" in
   Darwin)
     url=$(curl -s https://api.github.com/repos/meshcloud/collie-cli/releases/latest | grep "browser_download_url.*apple" | cut -d : -f 2,3 | tr -d \" | tr -d \ )
     name="collie-x86_64-apple-darwin"
     ;;
   Linux)
     url=$(curl -s https://api.github.com/repos/meshcloud/collie-cli/releases/latest | grep "browser_download_url.*linux" | cut -d : -f 2,3 | tr -d \" | tr -d \ )
     name="collie-x86_64-unknown-linux-gnu"
     ;;
   CYGWIN*|MINGW32*|MSYS*|MINGW*)
     echo 'Collie currently does not support Windows. Please have a look at https://github.com/meshcloud/collie-cli/issues/2 to follow progress.'
     exit 1
     ;;
   *)
     echo 'Not compatible.'
     exit 1
     ;;
esac
echo "Downloading the artifact... (${url})"
curl "${url}" -L -o collie.tar.gz --silent
# untar and movin the artifact
echo "Unpacking the artifact and copying the binary..."
tar -zxf collie.tar.gz -C /usr/local/bin
if [ "$(uname -s)" == "Linux" ]; then
  chown 0:0 /usr/local/bin/${name};
  chmod 755 /usr/local/bin/${name};
fi;
mv /usr/local/bin/${name} /usr/local/bin/collie
chmod +x /usr/local/bin/collie
echo "Deleting downloaded file..."
rm collie.tar.gz
echo "Finished installing. Please restart your terminal and run \"collie\" to get started!"
