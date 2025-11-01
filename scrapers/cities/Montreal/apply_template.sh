#!/bin/bash
declare -A venue_info
venue_info["scrape-lemalnecessaire.js"]="LeMalNcessaire|https://lemalnecessaire.com|Le Mal Nécessaire"
venue_info["scrape-lola-rosa.js"]="LolaRosa|https://lola-rosa.ca|Lola Rosa"
venue_info["scrape-mabrasserie.js"]="MaBrasserie|https://mabrasserie.ca|Ma Brasserie"
venue_info["scrape-maisonnotman.js"]="MaisonNotman|https://maisonnotman.com|Maison Notman"
venue_info["scrape-montrealnightclubs.js"]="MontrealNightclubs|https://montrealnightclubs.com|Montreal Nightclubs"
venue_info["scrape-montroyal.js"]="MontRoyal|https://montroyal.com|Mont Royal"
venue_info["scrape-new-city-gas.js"]="NewCityGas|https://newcitygas.com|New City Gas"
venue_info["scrape-newspeak-montreal.js"]="NewspeakMontreal|https://www.newspeakmtl.com|Newspeak Montreal"
venue_info["scrape-newspeak-mtl.js"]="NewspeakMtl|https://www.newspeakmtl.com|Newspeak MTL"
venue_info["scrape-nuits-afrique.js"]="NuitsAfrique|https://nuits-afrique.com|Festival Nuits d'Afrique"
venue_info["scrape-place-des-arts.js"]="PlaceDesArts|https://placedesarts.com|Place des Arts"
venue_info["scrape-pocha-mtl.js"]="PochaMtl|https://pocha-mtl.com|Pocha MTL"
venue_info["scrape-pubsaintpierre.js"]="PubSaintPierre|https://pubsaintpierre.com|Pub Saint-Pierre"
venue_info["scrape-tavernemidway.js"]="TaverneMidway|https://tavernemidway.com|Taverne Midway"
venue_info["scrape-thepastime.js"]="ThePastime|https://thepastime.ca|The Pastime"
venue_info["scrape-undergroundcity.js"]="UndergroundCity|https://undergroundcity.ca|Underground City"
venue_info["scrape-vieux-montreal.js"]="VieuxMontreal|https://vieux-montreal.qc.ca|Vieux-Montréal"
venue_info["scrape-yeoldeorchard.js"]="YeOldeOrchard|https://yeoldeorchard.com|Ye Olde Orchard"

for file in "${!venue_info[@]}"; do
    echo "Rewriting: $file"
    IFS='|' read -r class_name base_url display_name <<< "${venue_info[$file]}"
    
    # Backup original
    cp "$file" "${file}.corrupted-backup"
    
    # Generate new file from template
    sed "s/VENUE_NAMEEvents/${class_name}Events/g; s/BASE_URL/${base_url}/g; s/EVENTS_URL/${base_url}\/events/g; s/SOURCE_NAME/${display_name}/g; s/VENUE_DISPLAY_NAME/${display_name}/g" ../template.js > "$file"
    
    echo "module.exports = ${class_name}Events;" >> "$file"
    
    # Test
    if node -e "require('./$file'); console.log('✅');" 2>/dev/null | grep -q "✅"; then
        echo "  ✅ $file fixed successfully"
    else
        echo "  ❌ $file still broken"
    fi
done
