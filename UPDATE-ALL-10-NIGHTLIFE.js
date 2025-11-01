const fs = require('fs');
const path = require('path');

const research = JSON.parse(fs.readFileSync('NIGHTLIFE_URL_RESEARCH.json', 'utf8'));

// Separate RA venues from regular venues
const raVenues = research.filter(r => r.workingUrl && r.workingUrl.includes('ra.co'));
const regularVenues = research.filter(r => r.workingUrl && !r.workingUrl.includes('ra.co') && !r.workingUrl.includes('instagram'));
const instagramVenues = research.filter(r => r.workingUrl && r.workingUrl.includes('instagram'));

console.log('🔧 Updating 10 nightlife venues...\n');

// Update RA venues (Toybox)
if (raVenues.length > 0) {
  console.log(`📱 Adding ${raVenues.length} RA Puppeteer scraper(s):\n`);
  
  const raBambiPath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', 'scrape-bambi-nightclub-events.js');
  const bambiTemplate = fs.readFileSync(raBambiPath, 'utf8');
  
  raVenues.forEach(venue => {
    const funcName = venue.file.replace('scrape-', '').replace('-events.js', '').replace(/-/g, '') + 'Events';
    
    let content = bambiTemplate;
    content = content.replace(/const EVENTS_URL = '.*?';/, `const EVENTS_URL = '${venue.workingUrl}';`);
    content = content.replace(/const VENUE_NAME = '.*?';/, `const VENUE_NAME = '${venue.name}';`);
    content = content.replace(/const VENUE_ADDRESS = '.*?';/, `const VENUE_ADDRESS = '${venue.address}';`);
    content = content.replace(/async function bambinightclubEvents/, `async function ${funcName}`);
    content = content.replace(/module\.exports = bambinightclubEvents;/, `module.exports = ${funcName};`);
    
    const filepath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', venue.file);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`   ✅ ${venue.name} → ${venue.workingUrl}`);
  });
}

// Update regular venues
if (regularVenues.length > 0) {
  console.log(`\n🌐 Updating ${regularVenues.length} regular scraper(s):\n`);
  
  regularVenues.forEach(venue => {
    const filepath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', venue.file);
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Just update the URL
    content = content.replace(/const EVENTS_URL = '.*?';/, `const EVENTS_URL = '${venue.workingUrl}';`);
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`   ✅ ${venue.name} → ${venue.workingUrl}`);
  });
}

// Instagram venues need special note
if (instagramVenues.length > 0) {
  console.log(`\n📸 Instagram venues (may need manual checking):\n`);
  instagramVenues.forEach(venue => {
    console.log(`   ℹ️  ${venue.name} - uses Instagram only`);
  });
}

console.log(`\n🎉 Updated all venues!`);
console.log(`\n📊 Summary:`);
console.log(`   ✅ RA Puppeteer: ${raVenues.length}`);
console.log(`   ✅ Regular scrapers: ${regularVenues.length}`);
console.log(`   ℹ️  Instagram only: ${instagramVenues.length}`);
