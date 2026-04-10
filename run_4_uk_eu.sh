#!/bin/bash
# UK, Ireland & Iceland - 20 cities
# London, Manchester, Birmingham, Liverpool, Edinburgh, Glasgow, Belfast, Bristol,
# Brighton, Bournemouth, Leeds, Nottingham, Oxford, Sheffield, Newcastle, Leicester,
# Dublin, Cork, Galway, Reykjavik

WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

scripts=(
    "ImportFiles/import-all-london-events.js"
    "ImportFiles/import-all-manchester-events.js"
    "ImportFiles/import-all-birmingham-events.js"
    "ImportFiles/import-all-liverpool-events.js"
    "ImportFiles/import-all-edinburgh-events.js"
    "ImportFiles/import-all-glasgow-events.js"
    "ImportFiles/import-all-belfast-events.js"
    "ImportFiles/import-all-bristol-events.js"
    "ImportFiles/import-all-brighton-events.js"
    "ImportFiles/import-all-bournemouth-events.js"
    "ImportFiles/import-all-leeds-events.js"
    "ImportFiles/import-all-nottingham-events.js"
    "ImportFiles/import-all-oxford-events.js"
    "ImportFiles/import-all-sheffield-events.js"
    "ImportFiles/import-all-newcastle-events.js"
    "ImportFiles/import-all-leicester-events.js"
    "ImportFiles/import-all-dublin-events.js"
    "ImportFiles/import-all-cork-events.js"
    "ImportFiles/import-all-galway-events.js"
    "ImportFiles/import-all-reykjavik-events.js"
)

for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
