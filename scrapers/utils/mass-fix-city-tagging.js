const fs = require('fs');
const path = require('path');

const scrapersDirectory = path.join(__dirname, '../cities');
let fixedCount = 0;

function fixScraper(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Ensure city-util is imported
    if (!content.includes(`require('../../utils/city-util.js')`)) {
      content = `const { getCityFromArgs } = require('../../utils/city-util.js');\n${content}`;
      changed = true;
    }

    // 2. Add getCityFromArgs call inside the main async function
    const mainFunctionRegex = /(async function\s+\w+\s*\([^)]*\)\s*\{)/;
    if (content.match(mainFunctionRegex) && !content.includes('const city = getCityFromArgs()')) {
      content = content.replace(mainFunctionRegex, `$1\n  const city = getCityFromArgs();\n  if (!city) {\n    console.error('❌ City argument is required. e.g. node ${path.basename(filePath)} Toronto');\n    process.exit(1);\n  }`);
      changed = true;
    }

    // 3. Add city to the venue object
    // This is a common pattern, might need more robust regex for other cases
    const venueRegex = /(venue:\s*\w+,)/g;
    if (content.match(venueRegex)) {
        content = content.replace(venueRegex, 'venue: { ...RegExp.$1, city },');
        changed = true;
    }
    
    const venueObjectRegex = /(venue:\s*{[^}]*})/g;
     if(content.match(venueObjectRegex)){
        content = content.replace(venueObjectRegex, 'venue: { ...RegExp.$1, city },');
        changed = true;
     }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
      fixedCount++;
    } else {
        // console.log(`🤷 No changes needed for: ${path.basename(filePath)}`);
    }

  } catch (error) {
    console.error(`❌ Error fixing file ${filePath}:`, error);
  }
}

function findAndFixScrapers(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findAndFixScrapers(fullPath);
    } else if (file.startsWith('scrape-') && file.endsWith('.js')) {
      fixScraper(fullPath);
    }
  }
}

console.log('🚀 Starting mass-fix for scraper city tagging...');
findAndFixScrapers(scrapersDirectory);
console.log(`\n🛠️ Mass-fix complete. Successfully fixed ${fixedCount} scrapers.`);
