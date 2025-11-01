const fs = require('fs');
const path = require('path');

// Keep ONLY these scrapers that use real venue URLs
const realCalgaryScrapers = [
  'scrape-calgary-zoo.js',
  'scrape-grey-eagle-resort-events.js',
  'scrape-heritage-park.js',
  'scrape-jubilee-auditorium.js',
  'scrape-spruce-meadows-events.js',
  'scrape-the-palace-theatre-events.js'
];

const realMontrealScrapers = [
  'scrape-bell-centre-real.js',
  'scrape-place-des-arts-real.js',
  'scrape-mtelus-real.js',
  'scrape-corona-theatre-real.js',
  'scrape-theatre-st-denis-real.js',
  'scrape-olympia-real.js',
  'scrape-new-city-gas-real.js',
  'scrape-stereo-nightclub.js',
  'scrape-club-soda-real.js',
  'scrape-foufounes-real.js',
  'scrape-diving-bell-social.js',
  'scrape-newspeak-real.js'
];

function cleanCity(cityName, keepList) {
  console.log(`\n🧹 Cleaning ${cityName} - keeping ONLY real venue scrapers...\n`);
  
  const scrapersDir = path.join(__dirname, 'scrapers', 'cities', cityName);
  const allFiles = fs.readdirSync(scrapersDir);
  const scraperFiles = allFiles.filter(file => 
    file.endsWith('.js') && 
    !file.includes('test') &&
    !file.includes('index') &&
    !file.includes('backup') &&
    !file.includes('.bak') &&
    !file.includes('template')
  );
  
  let removed = 0;
  
  for (const file of scraperFiles) {
    if (!keepList.includes(file)) {
      const filepath = path.join(scrapersDir, file);
      const backupPath = filepath + '.aggregator-backup';
      fs.renameSync(filepath, backupPath);
      removed++;
    }
  }
  
  console.log(`✅ Kept: ${keepList.length} real venue scrapers`);
  console.log(`🗑️  Removed: ${removed} aggregator scrapers (backed up as .aggregator-backup)`);
  
  return { kept: keepList.length, removed };
}

console.log('=' .repeat(60));
console.log('🔧 REVERTING TO REAL VENUE URLS ONLY');
console.log('='.repeat(60));

const calgaryResults = cleanCity('Calgary', realCalgaryScrapers);
const montrealResults = cleanCity('Montreal', realMontrealScrapers);

console.log('\n' + '='.repeat(60));
console.log('📊 CLEANUP SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Calgary: ${calgaryResults.kept} real venue scrapers`);
console.log(`✅ Montreal: ${montrealResults.kept} real venue scrapers`);
console.log(`\n🗑️  Total removed: ${calgaryResults.removed + montrealResults.removed} aggregator scrapers`);
console.log(`\n💡 ALL scrapers now use REAL venue URLs - NO aggregators!`);
