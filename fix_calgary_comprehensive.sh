#!/bin/bash

# Comprehensive Calgary scrapers fix
echo "🔧 Comprehensive fix for Calgary scrapers..."

cd scrapers/cities/Calgary

# Create backup of current state
echo "💾 Creating backup..."
mkdir -p calgary-fixes-backup
cp *.js calgary-fixes-backup/ 2>/dev/null || true

# Fix common syntax patterns
for file in *.js; do
    if [[ ! "$file" =~ backup ]] && [[ ! "$file" =~ test ]]; then
        echo "🔨 Fixing $file..."
        
        # Fix missing ) after puppeteer.launch
        sed -i '' 's|        };$|        });|g' "$file"
        
        # Fix missing ) after page.goto calls
        sed -i '' 's|            };$|            });|g' "$file"
        
        # Fix venue object syntax issues
        sed -i '' 's|venue: { \.\.\.RegExp\.venue: {|venue: {|g' "$file"
        
        # Fix incorrect object return statements
        sed -i '' 's|        });$|        };|g' "$file"
        sed -i '' '/return {/,/^        }/ { s|        });|        };|g; }' "$file"
        
        # Fix regex patterns - remove extra slashes and fix parentheses
        sed -i '' 's|//);|/);|g' "$file"
        
        # Fix try-catch blocks
        sed -i '' 's|        } catch|        } catch|g' "$file"
    fi
done

echo "✅ Pattern fixes applied!"

# Test all files and report detailed results
echo "🧪 Testing all Calgary scrapers..."
passing=0
failing=0
total=0

for file in *.js; do
    if [[ ! "$file" =~ backup ]] && [[ ! "$file" =~ test ]]; then
        ((total++))
        if node -c "$file" 2>/dev/null; then
            ((passing++))
        else
            ((failing++))
            echo "❌ $file: $(node -c "$file" 2>&1 | head -1 | cut -d: -f3-)"
        fi
    fi
done

echo ""
echo "📊 Calgary Scrapers Results:"
echo "✅ Passing: $passing"
echo "❌ Failing: $failing" 
echo "📈 Total: $total"
echo "🎯 Success Rate: $(( passing * 100 / total ))%"

if [ $failing -gt 0 ]; then
    echo ""
    echo "⚠️  $failing scrapers need manual review"
else
    echo ""
    echo "🎉 All Calgary scrapers fixed!"
fi
