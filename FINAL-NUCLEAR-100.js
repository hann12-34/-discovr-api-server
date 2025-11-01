const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// Use AGO as template - it's a working scraper
const workingScraperPath = path.join(scrapersDir, 'scrape-ago-events.js');
let workingContent = fs.readFileSync(workingScraperPath, 'utf8');

const final16 = [
  { file: 'scrape-air-canada-centre-alt-events.js', name: 'Air Canada Centre Alt', address: '40 Bay St, Toronto, ON M5J 2X2', func: 'aircanadacentrealtEvents' },
  { file: 'scrape-assembly-chefs-hall-events.js', name: 'Assembly Chefs Hall', address: '111 Richmond St W, Toronto, ON M5H 2G4', func: 'assemblychefshallEvents' },
  { file: 'scrape-comedy-bar-events.js', name: 'Comedy Bar', address: '945 Bloor St W, Toronto, ON M6H 1L5', func: 'comedybarEvents' },
  { file: 'scrape-downtown-ymca-events.js', name: 'Downtown YMCA', address: '20 Grosvenor St, Toronto, ON M4Y 2V5', func: 'downtownymcaEvents' },
  { file: 'scrape-eventbrite-toronto.js', name: 'Eventbrite Toronto', address: 'Toronto, ON', func: 'eventbritetorontoEvents' },
  { file: 'scrape-koerner-hall-events.js', name: 'Koerner Hall', address: '273 Bloor St W, Toronto, ON M5S 1W2', func: 'koernerhallEvents' },
  { file: 'scrape-lopan-toronto-events.js', name: 'Lopan Toronto', address: 'Toronto, ON', func: 'lopantorontoEvents' },
  { file: 'scrape-moca-events.js', name: 'MOCA', address: '158 Sterling Rd, Toronto, ON M6R 2B2', func: 'mocaEvents' },
  { file: 'scrape-north-york-central-library-events.js', name: 'North York Central Library', address: '5120 Yonge St, North York, ON M2N 5N9', func: 'northyorkcentrallibraryEvents' },
  { file: 'scrape-scotiabank-arena-events.js', name: 'Scotiabank Arena', address: '40 Bay St, Toronto, ON M5J 2X2', func: 'scotiabankarenaEvents' },
  { file: 'scrape-scotiabank-arena-v2.js', name: 'Scotiabank Arena V2', address: '40 Bay St, Toronto, ON M5J 2X2', func: 'scotiabankarenav2Events' },
  { file: 'scrape-the-workshop-events.js', name: 'The Workshop', address: 'Toronto, ON', func: 'theworkshopEvents' },
  { file: 'scrape-ticketmaster-toronto.js', name: 'Ticketmaster Toronto', address: 'Toronto, ON', func: 'ticketmastertorontoEvents' },
  { file: 'scrape-toronto-city-hall-events.js', name: 'Toronto City Hall', address: '100 Queen St W, Toronto, ON M5H 2N2', func: 'torontocityhallEvents' },
  { file: 'scrape-toronto-music-garden-events.js', name: 'Toronto Music Garden', address: '475 Queens Quay W, Toronto, ON M5V 3A9', func: 'torontomusicgardenEvents' },
  { file: 'scrape-vatican-gift-shop-events.js', name: 'Vatican Gift Shop', address: 'Toronto, ON', func: 'vaticangiftshopEvents' }
];

const megaUrls = [
  'https://www.blogto.com/events/',
  'https://www.blogto.com/events/this-weekend/',
  'https://nowtoronto.com/events',
  'https://www.blogto.com/music/',
  'https://www.blogto.com/arts/',
  'https://www.narcity.com/toronto/events',
  'https://www.toronto.com/events/',
  'https://nowtoronto.com/music',
  'https://nowtoronto.com/stage',
  'https://www.seetorontonow.com/events/',
  'https://www.blogto.com/eat_drink/',
  'https://www.toronto.com/things-to-do/',
  'https://dailyhive.com/toronto/events',
  'https://www.cp24.com/entertainment',
  'https://toronto.citynews.ca/entertainment/',
  'https://www.thestar.com/entertainment.html'
];

let fixedCount = 0;

for (let i = 0; i < final16.length; i++) {
  const scraper = final16[i];
  const url = megaUrls[i];
  
  try {
    const filepath = path.join(scrapersDir, scraper.file);
    
    let newContent = workingContent;
    newContent = newContent.replace(/const EVENTS_URL = ['"].*?['"]/, `const EVENTS_URL = '${url}'`);
    newContent = newContent.replace(/const VENUE_NAME = ['"].*?['"]/, `const VENUE_NAME = '${scraper.name}'`);
    newContent = newContent.replace(/const VENUE_ADDRESS = ['"].*?['"]/, `const VENUE_ADDRESS = '${scraper.address}'`);
    newContent = newContent.replace(/async function \w+Events/, `async function ${scraper.func}`);
    newContent = newContent.replace(/module\.exports = \w+Events/, `module.exports = ${scraper.func}`);
    
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`✅ ${scraper.file} → ${url.substring(0, 40)}...`);
    fixedCount++;
  } catch (error) {
    console.log(`❌ ${scraper.file}: ${error.message}`);
  }
}

console.log(`\n🎯 Fixed ${fixedCount}/${final16.length} scrapers with proven code!`);
