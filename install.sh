#!/bin/bash
set -o errexit
set -o errtrace
set -o pipefail
set -o nounset

#Check CPU architecture
case $(uname -m) in
    amd64|x86_64) arch=x86_64 ;;
    arm64|aarch64) arch=aarch64 ;;
    *) arch= ;;
esac
if [ -z "$arch" ]; then
    echo "Architecture  $(uname -m) not supported." >&2
    exit 1
fi

# Check if user has all required commands installed
REQ_COMMANDS=(tar curl)
for i in $REQ_COMMANDS
do
  command -v "$i" >/dev/null && continue || { echo "$i command not found. You need to install if before running this script"; exit 1; }
done

COLLIE_VERSION=${COLLIE_VERSION:-}
release_url="https://api.github.com/repos/meshcloud/collie-cli/releases/latest"
if [ ! -z "${COLLIE_VERSION}" ]; then
  release_url="https://api.github.com/repos/meshcloud/collie-cli/releases/tags/${COLLIE_VERSION}"
fi

# Download artifacts based on CPU architecture and OS type
case "$(uname -s)" in
   Darwin)
      artifact_url=$(curl -s "$release_url" | grep "browser_download_url.*$arch.*apple" | cut -d : -f 2,3 | tr -d \" | tr -d \ )
      name="collie-$arch-apple-darwin"    
     ;;
   Linux)
    echo "detected Linux"
     artifact_url=$(curl -s "$release_url" | grep "browser_download_url.*linux" | cut -d : -f 2,3 | tr -d \" | tr -d \ )
     name="collie-x86_64-unknown-linux-gnu"
     ;;
   CYGWIN*|MINGW32*|MSYS*|MINGW*)
     echo 'Please execute the install.ps1 script as mentioned in our README. Go to https://github.com/meshcloud/collie-cli#-install-and-usage'
     exit 1
     ;;
   *)
     echo 'Not compatible.'
     exit 1
     ;;
esac

echo "Downloading the artifact... (${artifact_url})"
curl "${artifact_url}" -L -o collie.tar.gz --silent
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
