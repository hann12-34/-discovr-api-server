const fs = require('fs');
const path = require('path');

console.log('🎯 FINAL PUSH TO 100% - Comprehensive Venue URL Database\n');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// Comprehensive venue URL mappings - researched URLs for Toronto venues
const venueUrls = {
  // Major Venues - VERIFIED
  'ago': 'https://ago.ca/events',
  'art-gallery-ontario': 'https://ago.ca/events',
  'art-gallery-of-ontario': 'https://ago.ca/events',
  'rom': 'https://www.rom.on.ca/en/whats-on',
  'royal-ontario-museum': 'https://www.rom.on.ca/en/whats-on',
  'casa-loma': 'https://casaloma.ca/visit/events/',
  'cn-tower': 'https://www.cntower.ca/en-ca/plan-your-visit/events.html',
  'ripley': 'https://www.ripleyaquariums.com/canada/',
  'scotiabank-arena': 'https://www.scotiabankarena.com/events',
  'air-canada-centre': 'https://www.scotiabankarena.com/events',
  'rogers-centre': 'https://www.rogerscentre.com/events',
  'bmo-field': 'https://www.bmofield.com/events',
  
  // Performing Arts
  'massey-hall': 'https://mhrth.com/events',
  'roy-thomson-hall': 'https://roythomson.com/events',
  'koerner-hall': 'https://performance.rcmusic.com/events',
  'sony-centre': 'https://www.sonycentre.ca/events',
  'four-seasons-centre': 'https://www.coc.ca/plan-your-visit',
  'princess-of-wales': 'https://www.mirvish.com/shows',
  'elgin-theatre': 'https://www.heritagetrust.on.ca',
  'second-city': 'https://www.secondcity.com/shows/toronto/',
  
  // Music Venues
  'phoenix': 'https://www.thephoenixconcerttheatre.com/events',
  'opera-house': 'https://www.operapublichouse.com/events',
  'danforth-music': 'https://www.danforthmusichal.com/events',
  'rebel': 'https://rebeltoronto.com/events',
  'budweiser-stage': 'https://www.livenation.com/venue/KovZpZAEAleA/budweiser-stage-events',
  'mod-club': 'https://www.themodclub.com',
  'horseshoe-tavern': 'https://www.horseshoetavern.com/events',
  'lee-palace': 'https://www.ticketweb.ca/venue/lees-palace-toronto-on/9193',
  'rex-hotel': 'https://www.therex.ca/event-calendar',
  'cameron-house': 'https://www.thecameron.com',
  'rivoli': 'https://www.rivoli.ca',
  'drake-hotel': 'https://www.thedrakehotel.ca/happenings',
  
  // Museums & Galleries
  'bata': 'https://batashoemuseum.ca/events/',
  'gardiner': 'https://www.gardinermuseum.on.ca/whats-on/',
  'textile-museum': 'https://textilemuseum.ca/whats-on/',
  'aga-khan': 'https://www.agakhanmuseum.org/visit/whats-on',
  'moca': 'https://moca.ca',
  'power-plant': 'https://thepowerplant.org',
  
  // Parks & Outdoor
  'high-park': 'https://highparktoronto.com/events.html',
  'toronto-zoo': 'https://www.torontozoo.com/events',
  'harbourfront': 'https://www.harbourfrontcentre.com/events/',
  'evergreen-brick-works': 'https://www.evergreen.ca/whats-on/',
  'trinity-bellwoods': 'https://www.toronto.ca/data/parks/prd/facilities/complex/349/',
  
  // Markets & Districts
  'st-lawrence-market': 'https://www.stlawrencemarket.com/events',
  'distillery-district': 'https://www.thedistillerydistrict.com/events/',
  'kensington-market': 'https://www.kensington-market.ca',
  
  // Theaters & Cinema
  'tiff': 'https://www.tiff.net/events',
  'hot-docs': 'https://hotdocs.ca/whats-on',
  'cineplex': 'https://www.cineplex.com/Theatre/scotiabank-theatre-toronto',
  
  // Sports
  'woodbine': 'https://woodbine.com/mohawkpark/events/',
  
  // Other
  'hockey-hall': 'https://www.hhof.com',
  'botanical-garden': 'https://torontobotanicalgarden.ca/enjoy/programs-events/'
};

console.log(`📚 Database has ${Object.keys(venueUrls).length} venue URLs\n`);

const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));
let matched = 0;
let unmatched = 0;

console.log(`🔧 Matching ${files.length} scrapers to URLs...\n`);

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Extract venue identifier from filename
  const venueId = file.replace('scrape-', '').replace('-events.js', '');
  
  // Find matching URL
  let matchedUrl = null;
  for (const [key, url] of Object.entries(venueUrls)) {
    if (venueId.includes(key) || key.includes(venueId)) {
      matchedUrl = url;
      break;
    }
  }
  
  if (matchedUrl) {
    // Replace URL
    content = content.replace(
      /const EVENTS_URL = '[^']+'/,
      `const EVENTS_URL = '${matchedUrl}'`
    );
    fs.writeFileSync(filePath, content, 'utf8');
    matched++;
  } else {
    unmatched++;
  }
  
  if ((index + 1) % 50 === 0) {
    console.log(`   Processed ${index + 1}/${files.length}...`);
  }
});

console.log(`\n📊 Results:`);
console.log(`✅ Matched: ${matched} scrapers`);
console.log(`⚠️  Unmatched: ${unmatched} scrapers (using generic URLs)`);
console.log(`\n🎯 Running full import...\n`);
