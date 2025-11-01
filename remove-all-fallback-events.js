const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// All files with fallback events
const filesToFix = [
  'scrape-bar-dem-events.js',
  'scrape-bar-mordecai-events.js',
  'scrape-danforth-east-events.js',
  'scrape-downtown-ymca-events.js',
  'scrape-drake-hotel-hospitality-events.js',
  'scrape-trinity-bellwoods-park-events.js',
  'scrape-trinity-college-chapel-events.js',
  'scrape-trinity-college-events.js',
  'scrape-xamanek-events.js',
  'scrape-york-lions-stadium-events.js',
  'scrape-yorkdale-shopping-events.js'
];

let fixedCount = 0;

console.log(`🔧 Removing ALL fallback events from Toronto scrapers...\n`);

filesToFix.forEach(file => {
  const filePath = path.join(scrapersDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern 1: Remove if (events.length === 0) { ... events.push({ ... }); }
  // Match the entire block including the push
  content = content.replace(
    /if \(events\.length === 0\) \{[\s\S]*?console\.log\(['"]⚠️ No events found, creating minimal event['"]\);[\s\S]*?events\.push\(\{[\s\S]*?\}\);[\s\S]*?\}/g,
    `if (events.length === 0) {\n      console.log('⚠️ No events found');\n    }`
  );
  
  // Pattern 2: Remove catch block that returns fake event array
  // Find: } catch (error) { ... return [{ ... }]; }
  // Replace with: } catch (error) { ... return []; }
  content = content.replace(
    /(\} catch \(error\) \{[\s\S]*?console\.log\([^)]+\);)\s*return \[\{[\s\S]*?\}\];/g,
    '$1\n    return [];'
  );
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  } else {
    console.log(`⚠️  No changes: ${file}`);
  }
});

console.log(`\n📊 Fixed ${fixedCount} scrapers`);
console.log(`\n🎉 All fallback events removed!`);
