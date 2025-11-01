const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'New York');

// These are REAL venues that need proper scraping
const realVenues = [
  'apollo-theater', 'beacon-theatre', 'birdland-jazz', 'bowery-ballroom',
  'bowery-electric', 'brooklyn-bowl', 'brooklyn-botanic-garden',
  'carnegie-hall', 'jazz-standard', 'webster-hall', 'terminal-5',
  'hammerstein-ballroom', 'playstation-theater', 'arlene-grocery',
  'brooklyn-mirage', 'avant-gardner', 'mercury-lounge', 'knitting-factory',
  'rockwood-music-hall', 'village-vanguard', 'blue-note', 'iridium-jazz',
  'smoke-jazz', 'mintons-playhouse', 'dizzy-club'
];

// These are aggregators (multi-venue listing sites)
const aggregators = [
  'livenation', 'ticketmaster', 'eventbrite', 'broadway-theatres',
  'nyc-fashion-week', 'time-out', 'resident-advisor', 'songkick',
  'brooklyn-vegan', 'nonsense-nyc', 'oh-my-rockness'
];

const noAddressList = JSON.parse(fs.readFileSync('NYC-NO-ADDRESS-LIST.json', 'utf8'));

const needRealURLs = [];
const trueAggregators = [];
const unknown = [];

for (const item of noAddressList) {
  const fileName = item.file.toLowerCase();
  
  let isRealVenue = false;
  let isAggregator = false;
  
  for (const venue of realVenues) {
    if (fileName.includes(venue)) {
      isRealVenue = true;
      break;
    }
  }
  
  for (const agg of aggregators) {
    if (fileName.includes(agg)) {
      isAggregator = true;
      break;
    }
  }
  
  if (isRealVenue) {
    needRealURLs.push(item);
  } else if (isAggregator) {
    trueAggregators.push(item);
  } else {
    unknown.push(item);
  }
}

console.log('🏢 REAL VENUES needing URLs and scraping logic:', needRealURLs.length);
needRealURLs.forEach(v => console.log(`   - ${v.file}`));

console.log(`\n🌐 TRUE AGGREGATORS (OK to leave as-is):`, trueAggregators.length);
trueAggregators.slice(0, 10).forEach(v => console.log(`   - ${v.file}`));

console.log(`\n❓ UNKNOWN (need manual review):`, unknown.length);
console.log(`   (First 10 shown)`);
unknown.slice(0, 10).forEach(v => console.log(`   - ${v.file}`));

fs.writeFileSync('NYC-VENUES-NEED-URLS.json', JSON.stringify(needRealURLs, null, 2));
console.log(`\n✅ Saved ${needRealURLs.length} venues needing URLs to NYC-VENUES-NEED-URLS.json`);
