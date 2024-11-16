if [ "$1" == "-f" ]; then
    echo "Force flag set. Skipping server files check."
else
    # Check if ./dist/ragemp-server exists, if it does, exit.
    if [ -f "./dist/ragemp-server" ]; then
        echo "Server files already downloaded."
        exit 0
    fi
fi

# Start, create dir dist
mkdir -p ./dist
# Download server files
wget -q -O ./linux_x64.tar.gz https://cdn.rage.mp/updater/prerelease/server-files/linux_x64.tar.gz
# Extract server files
tar -xzf ./linux_x64.tar.gz -C ./dist
## move from ./dist/ragemp-srv to ./dist
mv ./dist/ragemp-srv/* ./dist
# Remove tar and ./dist/ragemp-srv
rm ./linux_x64.tar.gz
rm -r ./dist/ragemp-srv

echo "Server files downloaded."