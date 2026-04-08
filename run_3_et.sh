#!/bin/bash
# Eastern Time Zone - 15 cities
# Toronto, Montreal, Ottawa, New York, Miami, Boston, Philadelphia,
# Washington DC, Atlanta, Detroit, New Orleans, Pittsburgh, Raleigh, Charleston, Asheville

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    "ImportFiles/import-all-toronto-events.js"
    "ImportFiles/import-all-montreal-events.js"
    "ImportFiles/import-all-ottawa-events.js"
    "ImportFiles/import-all-new-york-events.js"
    "ImportFiles/import-all-miami-events.js"
    "ImportFiles/import-all-boston-events.js"
    "ImportFiles/import-all-philadelphia-events.js"
    "ImportFiles/import-all-washingtondc-events.js"
    "ImportFiles/import-all-atlanta-events.js"
    "ImportFiles/import-all-detroit-events.js"
    "ImportFiles/import-all-neworleans-events.js"
    "ImportFiles/import-all-pittsburgh-events.js"
    "ImportFiles/import-all-raleigh-events.js"
    "ImportFiles/import-all-charleston-events.js"
    "ImportFiles/import-all-asheville-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
