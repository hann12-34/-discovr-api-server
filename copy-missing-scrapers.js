/**
 * Script to copy missing scraper modules from the backup directory to the main directory
 * This helps restore all required scraper modules for the Vancouver test scripts
 */

const fs = require('fs');
const path = require('path');

// Settings
const MAIN_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
const BACKUP_DIR = path.join(__dirname, '..', 'discovr-api-server 2', 'scrapers', 'cities', 'vancouver');
const DEST_DIR = path.join(__dirname, 'restored-scrapers', 'cities', 'vancouver');

// Create destination directory if it doesn't exist
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

// List of common missing modules from the error logs
const criticalModules = [
  'commodoreBallroomEvents.js',
  'rickshawTheatreEvents.js',
  'foxCabaret.js',
  'vogueTheatreEvents.js',
  'undergroundComedyClubEvents.js',
  'orpheumTheatreEvents.js',
  'rogersArenaEvents.js',
  'pneEvents.js',
  'metropolitanEvents.js',
  'metropolisEvents.js',
  'vancouverAsianFilmFestivalEvents.js',
  'vancouverCityEvents.js',
  'vancouverCivicTheatres.js',
  'vancouverFilmFestivalEvents.js',
  'vancouverMysteriesEvents.js',
  'veganMarketEvents.js',
  'vsffEvents.js',
  'westernFrontEvents.js',
  'yaletownJazz.js'
];

// Get all files from the backup directory
function getBackupFiles() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.js') && !file.endsWith('.bak.js'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file)
      }));
  } catch (error) {
    console.error(`Error reading backup directory: ${error.message}`);
    return [];
  }
}

// Get all files from the main directory
function getMainFiles() {
  try {
    return fs.readdirSync(MAIN_DIR)
      .filter(file => file.endsWith('.js') && !file.startsWith('test-'))
      .map(file => file);
  } catch (error) {
    console.error(`Error reading main directory: ${error.message}`);
    return [];
  }
}

// Copy a file from source to destination
function copyFile(source, dest) {
  try {
    const content = fs.readFileSync(source, 'utf8');
    fs.writeFileSync(dest, content);
    return true;
  } catch (error) {
    console.error(`Error copying ${source} to ${dest}: ${error.message}`);
    return false;
  }
}

// Main function to copy missing scrapers
function copyMissingScrapers() {
  console.log('======================================================');
  console.log('COPYING MISSING SCRAPER MODULES FROM BACKUP');
  console.log('======================================================');
  
  const backupFiles = getBackupFiles();
  const mainFiles = getMainFiles();
  
  console.log(`Found ${backupFiles.length} scraper files in backup directory`);
  console.log(`Found ${mainFiles.length} scraper files in main directory`);
  
  // First, copy critical modules
  console.log('\nCopying critical modules first:');
  let copiedCount = 0;
  
  for (const criticalModule of criticalModules) {
    const backupFile = backupFiles.find(file => file.name === criticalModule);
    
    if (backupFile) {
      const destPath = path.join(DEST_DIR, criticalModule);
      const mainPath = path.join(MAIN_DIR, criticalModule);
      
      if (!mainFiles.includes(criticalModule)) {
        console.log(`✓ Copying critical module: ${criticalModule}`);
        const success = copyFile(backupFile.path, destPath);
        
        if (success) {
          copiedCount++;
        }
      } else {
        console.log(`- Module already exists in main directory: ${criticalModule}`);
      }
    } else {
      console.log(`✗ Critical module not found in backup: ${criticalModule}`);
    }
  }
  
  // Now copy all remaining files that don't exist in main
  console.log('\nCopying remaining modules:');
  
  for (const backupFile of backupFiles) {
    // Skip files we've already processed
    if (criticalModules.includes(backupFile.name)) {
      continue;
    }
    
    if (!mainFiles.includes(backupFile.name)) {
      const destPath = path.join(DEST_DIR, backupFile.name);
      console.log(`✓ Copying module: ${backupFile.name}`);
      const success = copyFile(backupFile.path, destPath);
      
      if (success) {
        copiedCount++;
      }
    }
  }
  
  // Also copy the index.js file to maintain the scraper registry
  const indexBackupPath = path.join(BACKUP_DIR, 'index.js');
  const indexDestPath = path.join(DEST_DIR, 'index.js');
  
  if (fs.existsSync(indexBackupPath)) {
    console.log('\nCopying index.js (scraper registry):');
    const success = copyFile(indexBackupPath, indexDestPath);
    
    if (success) {
      copiedCount++;
      console.log('✓ Successfully copied index.js');
    } else {
      console.log('✗ Failed to copy index.js');
    }
  }
  
  // Print summary
  console.log('\n======================================================');
  console.log('COPY RESULTS SUMMARY');
  console.log('======================================================');
  console.log(`Total files copied: ${copiedCount}`);
  console.log(`Files are available in: ${DEST_DIR}`);
  console.log('\nNext step: Update test files to point to these restored scrapers');
  
  return {
    copiedCount,
    destDir: DEST_DIR
  };
}

// Run the script
copyMissingScrapers();
