/**
 * Script to remove Vancouver scrapers with 0 events and others not in the keep list
 */

const fs = require('fs');
const path = require('path');

// List of scrapers to keep (based on your list)
const keepScrapers = [
  // Top performers (10+ events)
  'bardOnTheBeach.js',
  'richmondNightMarket.js',
  'commodoreBallroomEvents.js',
  'theatreUnderTheStars.js',
  'vogueTheatre.js',
  'vancouverFringe.js',
  'fortuneSoundClub.js',
  'improvCentreEvents.js',
  'yaletownJazz.js',
  'shipyardsNightMarket.js',
  'foxCabaret.js',
  'barNoneClub.js',
  'pneFair.js',
  'pneSummerNightConcerts.js',
  'malonesEvents.js',
  'arcDiningEvents.js',
  'dragonBoatFestivalEvents.js',
  'gastownSundaySet.js',
  'vancouverSymphony.js',
  
  // Medium performers (5-9 events)
  'granvilleIsland.js',
  'granvilleIslandEvents.js',
  'granvilleIslandMarket.js',
  'museumOfAnthropology.js',
  'orpheumTheatre.js',
  'vancouverAquarium.js',
  'vancouverArtGallery.js',
  'vancouverJazzFestival.js',
  'bardOnTheBeachEvents.js',
  'bcPlaceStadium.js',
  'biltmoreCabaret.js',
  'capilanoSuspensionBridge.js',
  'chineseGardenEvents.js',
  'imperialTheatre.js',
  'kitsilanoShowboat.js',
  'scienceWorld.js',
  'spaceCenter.js',
  'stanleyPark.js',
  'steamworksBrewing.js',
  'vancouverPride.js',
  'wiseHall.js',
  'broadwayVancouverEvents.js',
  'celebritiesNightclub.js',
  'helloBCEventsAdditional.js',
  'helloGoodbyeBarEvents.js',
  'hrMacMillanSpaceCentre.js',
  'irishHeather.js',
  'laowaiBar.js',
  'museumOfVancouver.js',
  'polygonGallery.js',
  'theCentreVancouver.js',
  'vancouverFolkFest.js',
  'vancouverInternationalFilmFestival.js',
  'venueNightclub.js',
  
  // Low performers (1-4 events)
  'canadaPlaceEvents.js',
  'festivalDEteEvents.js',
  'harbourEventCentre.js',
  'levelsNightclub.js',
  'redRoom_OLD.js',
  'redRoomEvents_new.js',
  'redRoomEvents.js',
  'vancouverArtAndLeisure.js',
  'vancouverConventionCentreEvents.js',
  'runToEndEndoEvents.js',
  'vancouverMysteriesEvents.js',
  'carnavalDelSol.js',
  'moaUbcEvents.js',
  'vsffEvents.js',
  'anthropologyMuseumEvents.js',
  'bcPlaceEvents.js',
  'billReidGalleryEvents.js',
  'cultureCrawlEvents.js',
  'folkFestEvents.js',
  'japanMarketEvents.js',
  'khatsahlanoEvents.js',
  'museumOfAnthropologyEvents.js',
  'musqueamEvents.js',
  'queerFilmFestivalEvents.js',
  'squamishBeerFestival.js',
  'vancouverAsianFilmFestivalEvents.js'
];

// Special files to always keep (index, utility files)
const specialFiles = [
  'index.js',
  'helpers.js'
];

// Directory containing the Vancouver scrapers
const vancouverScrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

// Create a backup directory
const backupDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver_backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Function to check if a file is a test file or utility
function isTestOrUtility(filename) {
  return filename.startsWith('test-') || 
         filename.startsWith('verify-') || 
         filename.startsWith('validate-') ||
         filename === 'validate_scrapers.js';
}

// Get list of all files in the Vancouver scrapers directory
try {
  const files = fs.readdirSync(vancouverScrapersDir);
  
  let removedCount = 0;
  let keptCount = 0;
  
  files.forEach(file => {
    // Skip directories
    const filePath = path.join(vancouverScrapersDir, file);
    if (!fs.statSync(filePath).isFile()) {
      return;
    }
    
    // Only process JavaScript files
    if (!file.endsWith('.js')) {
      return;
    }
    
    // Skip test files and utility scripts
    if (isTestOrUtility(file)) {
      console.log(`Skipping test/utility file: ${file}`);
      return;
    }
    
    // Keep files that are in our keep list
    if (keepScrapers.includes(file) || specialFiles.includes(file)) {
      console.log(`Keeping scraper: ${file}`);
      keptCount++;
      return;
    }
    
    // Backup and remove the file
    console.log(`Removing scraper: ${file}`);
    const backupPath = path.join(backupDir, file);
    fs.copyFileSync(filePath, backupPath);
    fs.unlinkSync(filePath);
    removedCount++;
  });
  
  console.log(`Completed: Removed ${removedCount} scrapers and kept ${keptCount} scrapers.`);
  console.log(`Backups saved to: ${backupDir}`);
} catch (error) {
  console.error('Error:', error);
}
