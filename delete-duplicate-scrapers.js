const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');

// List of duplicate scrapers to delete (keeping only the main one)
const duplicatesToDelete = [
  // Harbourfront Centre - keep only main, delete 10 specialized ones
  'scrape-harbourfront-centre-alt-events.js',
  'scrape-harbourfront-centre-community-events.js',
  'scrape-harbourfront-centre-concert-stage-events.js',
  'scrape-harbourfront-centre-dance-events.js',
  'scrape-harbourfront-centre-galleries-events.js',
  'scrape-harbourfront-centre-studio-events.js',
  'scrape-harbourfront-centre-theatre-events.js',
  'scrape-harbourfront-centre-winter-events.js',
  'scrape-harbourfront-centre-workshops-events.js',
  'scrape-harbourfront-centre-youth-events.js',
  
  // Harbourfront general - keep main, delete 5 others
  'scrape-harbourfront-canoe-landing-events.js',
  'scrape-harbourfront-festival-events.js',
  'scrape-harbourfront-park-events.js',
  'scrape-harbourfront-reading-series-alt-events.js',
  'scrape-harbourfront-reading-series-events.js',
  'scrape-harbourfront-summer-events.js',
  'scrape-harbourfront-centre-third-alt-events.js',
  'scrape-harbourfront-centre-fourth-alt-events.js',
  
  // Phoenix - keep main, delete 2 others
  'scrape-phoenix-concert-events.js',
  'scrape-phoenix-concert-theatre-events.js',
  'scrape-phoenix-concert-theatre-3rd-alt-events.js',
  
  // Other duplicates - keep main, delete -alt versions
  'scrape-danforth-music-hall-alt-events.js',
  'scrape-danforth-music-hall-second-alt-events.js',
  'scrape-distillery-district-alt-events.js',
  'scrape-factory-theatre-alt-events.js',
  'scrape-music-gallery-alt-events.js',
  'scrape-opera-house-alt-events.js',
  'scrape-soulpepper-theatre-alt-events.js',
  'scrape-tarragon-theatre-alt-events.js',
  'scrape-theatre-centre-alt-events.js',
  'scrape-tiff-bell-lightbox-alt-events.js',
  'scrape-distillery-district-shops-events.js'
];

let deletedCount = 0;
let notFoundCount = 0;

console.log(`🗑️  Deleting ${duplicatesToDelete.length} duplicate scrapers...\n`);

duplicatesToDelete.forEach(file => {
  const filePath = path.join(scrapersDir, file);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Deleted: ${file}`);
    deletedCount++;
  } else {
    console.log(`⚠️  Not found: ${file}`);
    notFoundCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`Deleted: ${deletedCount}`);
console.log(`Not found: ${notFoundCount}`);
console.log(`\n🎉 Duplicate scrapers removed!`);
