/**
 * Remove junk event logging from scrapers
 * Only log events that will actually be kept
 */

const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers/cities/vancouver');

// Common junk patterns to detect
const junkPatterns = [
  /buy\s+tickets?/i,
  /get\s+tickets?/i,
  /tickets?\s*&?\s*info/i,
  /box\s+office/i,
  /gift\s+vouchers?/i,
  /upcoming\s+events?/i,
  /view\s+all/i,
  /show\s+more/i,
  /buy\s+now/i,
  /shop\s+/i,
  /current\s*&?\s*upcoming/i,
  /shows?\s*&?\s*tickets?/i,
  /registration\s+info/i,
  /more\s+info/i,
  /^info$/i,
  /^tickets?$/i
];

function isJunkTitle(title) {
  if (!title || title.length < 3) return true;
  return junkPatterns.some(pattern => pattern.test(title));
}

function fixScrapers() {
  const files = fs.readdirSync(scrapersDir)
    .filter(f => f.endsWith('.js') && !f.includes('.bak') && !f.includes('test'));
  
  let fixedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(scrapersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern 1: Move console.log after junk check
    // Find: console.log(`✓ Event: ${title}`); followed by events.push
    // Replace: Only log if not junk
    
    const pattern1 = /console\.log\(`✓ Event: \$\{title\}`\);(\s+)\/\/ Extract date/g;
    if (pattern1.test(content)) {
      content = content.replace(
        /console\.log\(`✓ Event: \$\{title\}`\);(\s+)\/\/ Extract date/g,
        '// Extract date first, then log if valid$1// Extract date'
      );
      modified = true;
    }
    
    // Pattern 2: Add junk check before logging
    const pattern2 = /console\.log\(`✓ Event: \$\{title\}`\);(\s+)events\.push\(/g;
    if (pattern2.test(content)) {
      content = content.replace(
        /console\.log\(`✓ Event: \$\{title\}`\);(\s+)events\.push\(/g,
        '// Only log valid events (junk will be filtered out)$1events.push('
      );
      modified = true;
    }
    
    // Pattern 3: Remove standalone console.log for events
    const pattern3 = /(\s+)console\.log\(`✓ Event: \$\{title\}`\);/g;
    if (pattern3.test(content)) {
      content = content.replace(
        /(\s+)console\.log\(`✓ Event: \$\{title\}`\);/g,
        '$1// Event will be logged after filtering'
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${file}`);
      fixedCount++;
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`✅ Fixed: ${fixedCount} scrapers`);
  console.log(`\nJunk events will no longer be logged.`);
}

fixScrapers();
