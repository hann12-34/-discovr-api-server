/**
 * Fix venue format - change from string to object
 * venue: 'Name' -> venue: { name: 'Name', city: 'Vancouver' }
 */

const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers/cities/vancouver');

function fixVenueFormat() {
  const files = fs.readdirSync(scrapersDir)
    .filter(f => f.endsWith('.js') && !f.includes('.bak') && !f.includes('test'));
  
  let fixedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(scrapersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern: venue: 'Venue Name' -> venue: { name: 'Venue Name', city: 'Vancouver' }
    // But NOT if it's already an object
    const venueStringPattern = /venue:\s*'([^']+)'/g;
    
    if (venueStringPattern.test(content)) {
      content = content.replace(/venue:\s*'([^']+)'/g, "venue: { name: '$1', city: 'Vancouver' }");
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
  console.log(`\nAll venues now use object format: { name: '...', city: 'Vancouver' }`);
}

fixVenueFormat();
