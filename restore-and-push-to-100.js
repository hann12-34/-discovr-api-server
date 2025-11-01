const fs = require('fs');
const path = require('path');

console.log('🔄 RESTORING WORKING STATE AND PUSHING TO 100%\n');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`📊 Total scrapers: ${files.length}`);

// URL corrections for venues with wrong/missing URLs
const urlCorrections = {
  // Major venues - use correct event pages
  'scrape-ago-events.js': 'https://ago.ca/events',
  'scrape-art-gallery-ontario-events.js': 'https://ago.ca/events',
  'scrape-casa-loma-events.js': 'https://casaloma.ca/visit/events/',
  'scrape-cn-tower-events.js': 'https://www.cntower.ca/en-ca/plan-your-visit/events.html',
  'scrape-four-seasons-centre-events.js': 'https://www.coc.ca/plan-your-visit',
  'scrape-harbourfront-centre-events.js': 'https://www.harbourfrontcentre.com/events/',
  'scrape-hockey-hall-of-fame-events.js': 'https://www.hhof.com/htmlVisitUs/visit_hours.shtml',
  'scrape-hot-docs-cinema-events.js': 'https://hotdocs.ca/whats-on',
  'scrape-koerner-hall-events.js': 'https://performance.rcmusic.com/events',
  'scrape-massey-hall-events.js': 'https://mhrth.com/events',
  'scrape-ripley-aquarium-events.js': 'https://www.ripleyaquariums.com/canada/plan-your-visit/',
  'scrape-rom-events.js': 'https://www.rom.on.ca/en/whats-on',
  'scrape-roy-thomson-hall-events.js': 'https://roythomson.com/events',
  'scrape-second-city-events.js': 'https://www.secondcity.com/shows/toronto/',
  'scrape-sony-centre-events.js': 'https://www.sonycentre.ca/events',
  'scrape-tiff-bell-lightbox-events.js': 'https://www.tiff.net/events',
  'scrape-princess-of-wales-theatre-events.js': 'https://www.mirvish.com/shows',
  'scrape-elgin-theatre-events.js': 'https://www.heritagetrust.on.ca/en/pages/our-stories/elgin-and-winter-garden-theatres',
  'scrape-danforth-music-hall-events.js': 'https://www.danforthmusichal.com/events',
  'scrape-opera-house-events.js': 'https://www.operapublichouse.com/events',
  'scrape-rebel-nightclub-events.js': 'https://rebeltoronto.com/events',
  'scrape-budweiser-stage-events.js': 'https://www.livenation.com/venue/KovZpZAEAleA/budweiser-stage-events',
  'scrape-rogers-centre-events.js': 'https://www.mlb.com/bluejays/tickets',
  'scrape-meridian-hall-events.js': 'https://meridian-hall.com/events',
  'scrape-drake-hotel-events.js': 'https://www.thedrakehotel.ca/happenings',
  'scrape-evergreen-brick-works-events.js': 'https://www.evergreen.ca/whats-on/',
  'scrape-distillery-district-events.js': 'https://www.thedistillerydistrict.com/events/',
  'scrape-st-lawrence-market-events.js': 'https://www.stlawrencemarket.com/events',
  'scrape-kensington-market-events.js': 'https://www.kensington-market.ca/events',
  'scrape-high-park-events.js': 'https://highparktoronto.com/events.html',
  'scrape-trinity-bellwoods-park-events.js': 'https://www.toronto.ca/data/parks/prd/facilities/complex/349/index.html',
  'scrape-toronto-islands-events.js': 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/toronto-island-park/',
  'scrape-exhibition-place-events.js': 'https://www.explace.on.ca/events',
  'scrape-allan-gardens-events.js': 'https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/gardens-and-conservatories/allan-gardens-conservatory/',
  'scrape-toronto-zoo-events.js': 'https://www.torontozoo.com/events',
};

console.log(`\n🔧 Fixing ${Object.keys(urlCorrections).length} scrapers with correct URLs...\n`);

let fixedCount = 0;

Object.entries(urlCorrections).forEach(([filename, correctUrl]) => {
  const filePath = path.join(scrapersDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${filename}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace EVENTS_URL with correct one
  content = content.replace(
    /const EVENTS_URL = ['"][^'"]+['"]/,
    `const EVENTS_URL = '${correctUrl}'`
  );
  
  // Also fix BASE_URL if present
  const baseUrl = correctUrl.split('/').slice(0, 3).join('/');
  content = content.replace(
    /const BASE_URL = ['"][^'"]+['"]/,
    `const BASE_URL = '${baseUrl}'`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  fixedCount++;
  
  if (fixedCount % 10 === 0) {
    console.log(`✅ Fixed ${fixedCount} URLs...`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} scraper URLs!`);
console.log(`\n🎯 Running import to test...`);
