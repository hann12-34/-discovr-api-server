#!/bin/bash
# Pacific Time Zone - 7 cities
# Vancouver, LA, Seattle, San Francisco, Las Vegas, Portland, San Diego

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    "ImportFiles/import-all-vancouver-events.js"
    "ImportFiles/import-all-losangeles-events.js"
    "ImportFiles/import-all-seattle-events.js"
    "ImportFiles/import-all-sanfrancisco-events.js"
    "ImportFiles/import-all-lasvegas-events.js"
    "ImportFiles/import-all-portland-events.js"
    "ImportFiles/import-all-sandiego-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
