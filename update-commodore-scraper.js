/**
 * Script to update the Commodore Ballroom scraper with the fixed version
 */

const fs = require('fs');
const path = require('path');

const originalScraperPath = path.resolve(__dirname, './scrapers/cities/vancouver/commodoreBallroomEvents.js');
const fixedScraperPath = path.resolve(__dirname, './scrapers/cities/vancouver/commodoreBallroomEvents.fixed.js');
const backupScraperPath = path.resolve(__dirname, './scrapers/cities/vancouver/commodoreBallroomEvents.backup.js');

async function updateCommodoreScraper() {
  try {
    console.log('📋 Updating Commodore Ballroom scraper...');
    
    // Check if files exist
    if (!fs.existsSync(originalScraperPath)) {
      console.error('❌ Original scraper file not found at:', originalScraperPath);
      return;
    }
    
    if (!fs.existsSync(fixedScraperPath)) {
      console.error('❌ Fixed scraper file not found at:', fixedScraperPath);
      return;
    }
    
    // Create backup of original scraper
    console.log('📦 Creating backup of original scraper...');
    fs.copyFileSync(originalScraperPath, backupScraperPath);
    console.log('✅ Backup created at:', backupScraperPath);
    
    // Replace original scraper with fixed version
    console.log('🔄 Replacing original scraper with fixed version...');
    const fixedScraperContent = fs.readFileSync(fixedScraperPath, 'utf8');
    fs.writeFileSync(originalScraperPath, fixedScraperContent);
    console.log('✅ Scraper updated successfully!');
    
    console.log('\n📝 Summary:');
    console.log('1. Original scraper backed up to:', backupScraperPath);
    console.log('2. Fixed scraper copied to:', originalScraperPath);
    console.log('3. The Commodore Ballroom scraper now uses the Ticketmaster API exclusively');
    console.log('4. All fallback methods have been removed');
    console.log('5. The scraper is now more reliable and maintainable');
    
  } catch (error) {
    console.error('❌ Error updating scraper:', error);
  }
}

updateCommodoreScraper().catch(console.error);
