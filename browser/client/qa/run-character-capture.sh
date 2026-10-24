#!/bin/sh
set -eu
cd /mnt/user/appdata/stormpt-browser/client/private-test
python3 -m http.server 3904 --bind 127.0.0.1 >/tmp/stormpt-record-render.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
sleep 1
docker run --rm --network host --ipc host --shm-size=512m \
 --mount type=bind,src=/mnt/user/appdata/stormpt-browser,dst=/work \
 --workdir /work/client/qa --entrypoint node \
 mcr.microsoft.com/playwright:v1.55.0-noble test-character-capture.mjs
