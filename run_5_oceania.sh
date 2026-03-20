#!/bin/bash
# Australia & New Zealand (Oceania) - 10 cities
# Sydney, Melbourne, Brisbane, Perth, Adelaide, Gold Coast,
# Auckland, Wellington, Christchurch, Queenstown

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    "ImportFiles/import-all-sydney-events.js"
    "ImportFiles/import-all-melbourne-events.js"
    "ImportFiles/import-all-brisbane-events.js"
    "ImportFiles/import-all-perth-events.js"
    "ImportFiles/import-all-adelaide-events.js"
    "ImportFiles/import-all-goldcoast-events.js"
    "ImportFiles/import-all-auckland-events.js"
    "ImportFiles/import-all-wellington-events.js"
    "ImportFiles/import-all-christchurch-events.js"
    "ImportFiles/import-all-queenstown-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
