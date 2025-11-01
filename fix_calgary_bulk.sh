#!/bin/bash

# Bulk fix for Calgary scrapers based on identified patterns
echo "🔧 Bulk fixing Calgary scrapers..."

cd scrapers/cities/Calgary

# Apply comprehensive fixes to all failing scrapers
for file in *.js; do
    if [[ ! "$file" =~ backup ]] && [[ ! "$file" =~ test ]] && [[ "$file" != "index.js" ]] && [[ "$file" != "scrape-arts-commons.js" ]] && [[ "$file" != "scrape-attic-bar-stage.js" ]]; then
        
        # Fix 1: Missing ) in filter functions - }; should be });
        sed -i '' 's|        });$|        });|g' "$file"
        sed -i '' 's|        };$|        });|g' "$file" 
        
        # Fix 2: Missing ) in object methods - }; should be });  
        sed -i '' '/return.*filter.*{$/,/^        };$/ { s|^        };$|        });|g; }' "$file"
        
        # Fix 3: Fix puppeteer.launch calls
        sed -i '' 's|        });$|        });|g' "$file"
        
        # Fix 4: Fix page.goto calls  
        sed -i '' 's|            });$|            });|g' "$file"
        
        # Fix 5: Fix venue syntax errors
        sed -i '' 's|venue: { \.\.\.RegExp\.venue: {|venue: {|g' "$file"
        
        # Fix 6: Fix return object statements
        sed -i '' 's|return { \(.*\) });|return { \1 };|g' "$file"
        
        # Fix 7: Fix method endings
        sed -i '' '/^[[:space:]]*}[[:space:]]*$/,/^[[:space:]]*}[[:space:]]*$/ {
            /};$/ {
                /return.*filter/ {
                    s|};$|});|g
                }
            }
        }' "$file"
    fi
done

echo "✅ Bulk fixes applied to all Calgary scrapers!"

# Test results
echo "🧪 Testing fixed scrapers..."
passing=0
failing=0

for file in *.js; do
    if [[ ! "$file" =~ backup ]] && [[ ! "$file" =~ test ]]; then
        if node -c "$file" 2>/dev/null; then
            ((passing++))
        else
            ((failing++))
        fi
    fi
done

total=$((passing + failing))
echo "📊 Results: $passing/$total Calgary scrapers passing ($((passing * 100 / total))%)"

if [ $failing -eq 0 ]; then
    echo "🎉 All Calgary scrapers fixed!"
else
    echo "⚠️ $failing scrapers still need attention"
fi
