#!/bin/bash

# 공통 경로 설정
WORK_DIR="/Users/seongwoo/desktop/discovr-api-server"

# 여기에 적힌 파일 하나당 -> 새 창 하나씩 뜹니다. (총 48개)
scripts=(
    
    # === CANADA ===
    "ImportFiles/import-all-vancouver-events.js"
    "ImportFiles/import-all-toronto-events.js"
    "ImportFiles/import-all-calgary-events.js"
    "ImportFiles/import-all-montreal-events.js"
    "ImportFiles/import-all-ottawa-events.js"
    "ImportFiles/import-all-edmonton-events.js"
    "ImportFiles/import-all-saskatoon-events.js"
    "ImportFiles/import-all-winnipeg-events.js"

    # === USA ===
    "ImportFiles/import-all-new-york-events.js"
    "ImportFiles/import-all-losangeles-events.js"
    "ImportFiles/import-all-miami-events.js"
    "ImportFiles/import-all-seattle-events.js"
    "ImportFiles/import-all-sanfrancisco-events.js"
    "ImportFiles/import-all-chicago-events.js"
    "ImportFiles/import-all-lasvegas-events.js"
    "ImportFiles/import-all-boston-events.js"
    "ImportFiles/import-all-austin-events.js"
    "ImportFiles/import-all-philadelphia-events.js"
    "ImportFiles/import-all-portland-events.js"
    "ImportFiles/import-all-minneapolis-events.js"
    "ImportFiles/import-all-sandiego-events.js"
    "ImportFiles/import-all-denver-events.js"
    "ImportFiles/import-all-nashville-events.js"
    "ImportFiles/import-all-washingtondc-events.js"
    "ImportFiles/import-all-atlanta-events.js"
    "ImportFiles/import-all-phoenix-events.js"
    "ImportFiles/import-all-neworleans-events.js"
    "ImportFiles/import-all-pittsburgh-events.js"
    "ImportFiles/import-all-raleigh-events.js"
    "ImportFiles/import-all-charleston-events.js"
    "ImportFiles/import-all-stlouis-events.js"
    "ImportFiles/import-all-sacramento-events.js"
    "ImportFiles/import-all-madison-events.js"
    "ImportFiles/import-all-asheville-events.js"

    # === UK (묶여있던 것들 전부 분리함) ===
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

    # === AUSTRALIA ===
    "ImportFiles/import-all-sydney-events.js"
    "ImportFiles/import-all-melbourne-events.js"
    "ImportFiles/import-all-brisbane-events.js"
    "ImportFiles/import-all-perth-events.js"
    "ImportFiles/import-all-adelaide-events.js"
    "ImportFiles/import-all-goldcoast-events.js"

    # === NEW ZEALAND ===
    "ImportFiles/import-all-auckland-events.js"
    "ImportFiles/import-all-wellington-events.js"
    "ImportFiles/import-all-christchurch-events.js"
    "ImportFiles/import-all-queenstown-events.js"

    # === IRELAND ===
    "ImportFiles/import-all-dublin-events.js"
    "ImportFiles/import-all-cork-events.js"
    "ImportFiles/import-all-galway-events.js"

    # === ICELAND ===
    "ImportFiles/import-all-reykjavik-events.js"
)

# 반복문 실행: 리스트에 있는 모든 파일을 각각 '새 창'에서 실행
for js_file in "${scripts[@]}"; do
    osascript -e "tell application \"Terminal\" to do script \"cd $WORK_DIR && node $js_file\""
done
