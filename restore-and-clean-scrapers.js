/**
 * Script to restore all scrapers from backup and then only remove scrapers not in the keep list
 */

const fs = require('fs');
const path = require('path');

// List of scrapers to keep (based on your list, including 0 event scrapers)
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
  'vancouverAsianFilmFestivalEvents.js',
  
  // Zero event scrapers that we want to keep for later work
  'biltmoreCabaretEvents.js',
  'chanCentre.js',
  'chanCentreEvents.js',
  'cherryBlossomFestEvents.js',
  'coastalJazzFestival.js',
  'contemporaryArtGalleryEvents.js',
  'danceFestivalEvents.js',
  'doxaFilmFestivalEvents.js',
  'fortuneSoundClubBridge.js',
  'fringeFestivalEvents.js',
  'gastownGrandPrixEvents.js',
  'granvilleMarketEvents.js',
  'helloBCEvents.js',
  'helloBCEventsScraper.js',
  'hrMacMillanSpaceCentreEvents.js',
  'junctionPublicMarket.js',
  'metropolisEvents.js',
  'museumOfVancouverEvents.js',
  'orpheumEvents.js',
  'queenElizabethTheatreEvents.js',
  'queerArtsFestivalEvents.js',
  'redRoom.js',
  'scienceWorldVancouverEvents.js',
  'steamworksBrewingEvents.js',
  'summerCinemaEvents.js',
  'theatreUnderTheStarsEvents.js',
  'tourismVancouverEvents.js',
  'ubcBotanicalGardenEvents.js',
  'undergroundComedyClubEvents.js',
  'vancouverAquariumEvents.js',
  'vancouverArtGalleryEvents.js',
  'vancouverCityEvents.js',
  'vancouverCivicTheatres.js',
  'vancouverMaritimeMuseumEvents.js',
  'vancouverSymphonyEvents.js',
  'veganMarketEvents.js'
];

// Special files to always keep (index, utility files)
const specialFiles = [
  'index.js',
  'helpers.js'
];

// Directories
const vancouverScrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
const backupDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver_backup');

// First, restore all files from backup
console.log("Restoring files from backup...");
if (fs.existsSync(backupDir)) {
  try {
    const backupFiles = fs.readdirSync(backupDir);
    
    backupFiles.forEach(file => {
      // Only process JavaScript files
      if (!file.endsWith('.js')) {
        return;
      }
      
      const sourcePath = path.join(backupDir, file);
      const targetPath = path.join(vancouverScrapersDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Restored: ${file}`);
      }
    });
    
    console.log("Restoration complete!");
  } catch (error) {
    console.error('Error during restoration:', error);
    process.exit(1);
  }
} else {
  console.log("No backup directory found. Proceeding with removal only.");
}

// Create a new backup directory for the files we're removing
const newBackupDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver_removed');
if (!fs.existsSync(newBackupDir)) {
  fs.mkdirSync(newBackupDir);
}

// Function to check if a file is a test file or utility
function isTestOrUtility(filename) {
  return filename.startsWith('test-') || 
         filename.startsWith('verify-') || 
         filename.startsWith('validate-') ||
         filename === 'validate_scrapers.js';
}

// Now process all files and remove ones not in the keep list
console.log("\nProcessing files to remove scrapers not in the keep list...");
try {
  const files = fs.readdirSync(vancouverScrapersDir);
  
  let removedCount = 0;
  let keptCount = 0;
  
  files.forEach(file => {
    // Skip directories and utils directory
    const filePath = path.join(vancouverScrapersDir, file);
    if (!fs.statSync(filePath).isFile() || filePath.includes('/utils/')) {
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
    const backupPath = path.join(newBackupDir, file);
    fs.copyFileSync(filePath, backupPath);
    fs.unlinkSync(filePath);
    removedCount++;
  });
  
  console.log(`Completed: Removed ${removedCount} scrapers and kept ${keptCount + specialFiles.length} scrapers.`);
  console.log(`Removed files backed up to: ${newBackupDir}`);
} catch (error) {
  console.error('Error:', error);
}
