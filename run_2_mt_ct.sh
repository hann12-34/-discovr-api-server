#!/bin/bash
# Mountain & Central Time Zone - 5 cities
# Calgary, Edmonton (MT) / Chicago, Austin, Minneapolis (CT)

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    # Mountain Time
    "ImportFiles/import-all-calgary-events.js"
    "ImportFiles/import-all-edmonton-events.js"
    
    # Central Time
    "ImportFiles/import-all-chicago-events.js"
    "ImportFiles/import-all-austin-events.js"
    "ImportFiles/import-all-minneapolis-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
