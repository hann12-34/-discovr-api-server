const fs = require('fs');
const path = require('path');

const urlUpdates = [
  { file: 'scrape-calgary-stampede.js', url: 'https://www.calgarystampede.com/stampede' },
  { file: 'scrape-saddledome.js', url: 'https://www.scotiabanksaddledome.com/events' },
  { file: 'scrape-calgary-philharmonic.js', url: 'https://calgaryphil.com/events' },
  { file: 'scrape-telus-spark.js', url: 'https://www.sparkscience.ca/events/' },
  { file: 'scrape-glenbow-museum.js', url: 'https://www.glenbow.org/visit/' },
  { file: 'scrape-university-of-calgary.js', url: 'https://www.ucalgary.ca/events' }
];

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Calgary');

console.log('🔧 Updating Calgary scraper URLs...\n');

for (const update of urlUpdates) {
  try {
    const filepath = path.join(scrapersDir, update.file);
    
    if (!fs.existsSync(filepath)) {
      console.log(`⚠️  ${update.file} not found, skipping`);
      continue;
    }
    
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Find and replace the events URL
    const urlPatterns = [
      /const\s+eventsUrl\s*=\s*['"][^'"]+['"]/,
      /const\s+EVENTS_URL\s*=\s*['"][^'"]+['"]/,
      /this\.eventsUrl\s*=\s*['"][^'"]+['"]/,
      /baseUrl\s*=\s*['"][^'"]+['"]/
    ];
    
    let updated = false;
    for (const pattern of urlPatterns) {
      if (pattern.test(content)) {
        const varName = content.match(pattern)[0].split('=')[0].trim();
        content = content.replace(pattern, `${varName} = '${update.url}'`);
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      console.log(`⚠️  ${update.file}: Could not find URL pattern`);
      continue;
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ ${update.file} → ${update.url}`);
  } catch (error) {
    console.log(`❌ ${update.file}: ${error.message}`);
  }
}

console.log('\n🎉 URL updates complete!');
