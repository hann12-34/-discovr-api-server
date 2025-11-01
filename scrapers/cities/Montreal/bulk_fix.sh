#!/bin/bash
echo "🔧 BULK FIXING 18 failing Montreal scrapers..."

files=(
"scrape-lemalnecessaire.js"
"scrape-lola-rosa.js" 
"scrape-mabrasserie.js"
"scrape-maisonnotman.js"
"scrape-montrealnightclubs.js"
"scrape-montroyal.js"
"scrape-new-city-gas.js"
"scrape-newspeak-montreal.js"
"scrape-newspeak-mtl.js"
"scrape-nuits-afrique.js"
"scrape-place-des-arts.js"
"scrape-pocha-mtl.js"
"scrape-pubsaintpierre.js"
"scrape-tavernemidway.js"
"scrape-thepastime.js"
"scrape-undergroundcity.js"
"scrape-vieux-montreal.js"
"scrape-yeoldeorchard.js"
)

for file in "${files[@]}"; do
    echo "Fixing: $file"
    # Fix common syntax patterns
    sed -i '' 's/});$/}/g' "$file"
    sed -i '' 's/};$/}/g' "$file"  
    sed -i '' 's/coordinates: this\.getDefaultCoordinates()$/coordinates: this.getDefaultCoordinates()/g' "$file"
    sed -i '' 's/        };$/        }/g' "$file"
    sed -i '' 's/    };$/    }/g' "$file"
    # Test load
    if node -e "try { require('./$file'); console.log('✅ FIXED'); } catch(e) { console.log('❌ STILL BROKEN:', e.message); }" 2>/dev/null | grep -q "✅"; then
        echo "  ✅ $file now loads successfully"
    else
        echo "  ❌ $file still has issues"
    fi
done

echo "🎉 Bulk fix complete!"
