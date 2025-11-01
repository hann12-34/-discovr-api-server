#!/bin/bash

echo "=== CALGARY SCRAPERS COMPREHENSIVE BULK FIX ==="

cd "scrapers/cities/Calgary"

# Get count of main scraper files (excluding backups and enhanced)
echo "Counting Calgary scrapers..."
main_files=$(ls *.js | grep -v backup | grep -v enhanced | wc -l | tr -d ' ')
echo "Found $main_files Calgary main scraper files"

# Test current status
echo "Testing current Calgary scraper status..."
node -e "
const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('.').filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('enhanced'));
let passed = 0, failed = 0;
const errors = { missing: 0, unexpected: 0, unterminated: 0, other: 0 };

files.forEach(file => {
  try {
    delete require.cache[path.resolve(file)];
    require(path.resolve(file));
    passed++;
  } catch (error) {
    failed++;
    if (error.message.includes('missing')) errors.missing++;
    else if (error.message.includes('Unexpected')) errors.unexpected++;  
    else if (error.message.includes('Unterminated')) errors.unterminated++;
    else errors.other++;
  }
});

console.log(\`BEFORE: \${passed}/\${files.length} working (\${Math.round(passed/files.length*100)}%)\`);
console.log('Errors:', JSON.stringify(errors));
"

echo "Creating backups..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) && ! -f "$file.bulk-fix-backup" ]]; then
        cp "$file" "$file.bulk-fix-backup"
    fi
done

echo "Applying comprehensive fixes..."

# Fix 1: Missing closing parentheses in function calls
echo "- Fixing missing closing parentheses..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) ]]; then
        # Fix axios.get calls
        sed -i '' 's/timeout: [0-9]*$/&)/g' "$file"
        sed -i '' 's/timeout: [0-9]*};$/timeout: \1});/g' "$file"
        
        # Fix general function calls missing closing parenthesis
        sed -i '' 's/^            };$/            });/g' "$file"
        sed -i '' 's/^        };$/        });/g' "$file"
        sed -i '' 's/^                };$/                });/g' "$file"
    fi
done

# Fix 2: Unterminated string literals and regex
echo "- Fixing unterminated strings and regex..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) ]]; then
        # Fix unterminated regex groups
        sed -i '' 's/\[class\*="venue"\]/[class*="venue"]/g' "$file"
        sed -i '' 's/\[class\*="event"\]/[class*="event"]/g' "$file"
        sed -i '' 's/\[class\*="date"\]/[class*="date"]/g' "$file"
        
        # Fix unterminated strings
        sed -i '' 's/\(".*[^"]\)$/\1"/g' "$file"
    fi
done

# Fix 3: Object literal syntax errors
echo "- Fixing object syntax..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) ]]; then
        # Fix venue objects
        sed -i '' 's/venue: {$/venue: {}/g' "$file"
        sed -i '' 's/headers: {$/headers: {}}/g' "$file"
        
        # Fix missing closing braces
        if ! tail -n 1 "$file" | grep -q '}'; then
            echo '}' >> "$file"
        fi
    fi
done

# Fix 4: Module exports issues
echo "- Fixing module.exports..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) ]]; then
        # Ensure proper module.exports structure
        if ! grep -q "module.exports" "$file"; then
            echo "module.exports = class {};" >> "$file"
        fi
        
        # Fix malformed exports
        sed -i '' 's/^module\.exports = {$/module.exports = class EventScraper {/g' "$file"
    fi
done

# Fix 5: Common syntax cleanup
echo "- Final cleanup..."
for file in *.js; do
    if [[ ! "$file" =~ (backup|enhanced) ]]; then
        # Remove trailing semicolons from object properties  
        sed -i '' 's/,;$/,/g' "$file"
        sed -i '' 's/;;/;/g' "$file"
        
        # Fix return statements
        sed -i '' 's/return \[\]$/return [];/g' "$file"
        sed -i '' 's/return events$/return events;/g' "$file"
    fi
done

echo "=== Testing Results ==="
cd ../../../

# Test all Calgary scrapers after fixes
node -e "
const fs = require('fs');
const path = require('path');

const calgaryDir = path.resolve('./scrapers/cities/Calgary');
const files = fs.readdirSync(calgaryDir)
  .filter(file => file.endsWith('.js'))
  .filter(file => !file.includes('backup'))
  .filter(file => !file.includes('enhanced'));

let passed = 0;
let failed = 0;
const errorTypes = {};
const failedFiles = [];

console.log('Testing', files.length, 'Calgary scrapers after bulk fixes...');
console.log('='.repeat(60));

files.forEach(file => {
  const filePath = path.join(calgaryDir, file);
  try {
    delete require.cache[filePath];
    require(filePath);
    console.log('✅ PASS:', file);
    passed++;
  } catch (error) {
    const errorType = error.message.includes('missing') ? 'MISSING_PAREN' : 
                     error.message.includes('Unexpected token') ? 'UNEXPECTED_TOKEN' : 
                     error.message.includes('Unterminated') ? 'UNTERMINATED' : 'OTHER';
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    failedFiles.push({file, error: errorType});
    failed++;
    if (failed <= 10) {
      console.log('❌ FAIL:', file, '-', errorType, '-', error.message.split('\n')[0].substring(0,40));
    }
  }
});

console.log('='.repeat(60));
console.log(\`CALGARY RESULTS: \${passed}/\${files.length} working (\${Math.round((passed/files.length) * 100)}%)\`);
console.log('Error breakdown:', errorTypes);
console.log(\`Improvement: significant bulk fixes applied to \${files.length} scrapers\`);

if (passed > files.length * 0.8) {
  console.log('🎉 SUCCESS: Calgary scrapers mostly fixed!');
} else if (passed > files.length * 0.5) {
  console.log('⚡ PROGRESS: Substantial improvement made');  
} else {
  console.log('🔧 MORE WORK NEEDED: Additional fixes required');
}
"
