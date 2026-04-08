#!/bin/bash
# Mountain & Central Time Zone - 12 cities
# Calgary, Edmonton, Saskatoon, Denver, Phoenix (MT) / Winnipeg, Chicago, Austin, Minneapolis, Nashville, St Louis, Madison (CT)

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    # Mountain Time
    "ImportFiles/import-all-calgary-events.js"
    "ImportFiles/import-all-edmonton-events.js"
    "ImportFiles/import-all-saskatoon-events.js"
    "ImportFiles/import-all-winnipeg-events.js"
    
    # Central Time
    "ImportFiles/import-all-chicago-events.js"
    "ImportFiles/import-all-austin-events.js"
    "ImportFiles/import-all-minneapolis-events.js"
    "ImportFiles/import-all-denver-events.js"
    "ImportFiles/import-all-phoenix-events.js"
    "ImportFiles/import-all-nashville-events.js"
    "ImportFiles/import-all-stlouis-events.js"
    "ImportFiles/import-all-madison-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
