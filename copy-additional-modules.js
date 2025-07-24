/**
 * Script to copy additional missing modules from the backup directory
 * This includes modules from events/ and venues/ directories
 */

const fs = require('fs');
const path = require('path');

// Settings
const BACKUP_DIR = path.join(__dirname, '..', 'discovr-api-server 2');
const EVENTS_DIR = path.join(BACKUP_DIR, 'scrapers', 'events');
const VENUES_DIR = path.join(BACKUP_DIR, 'scrapers', 'venues');
const RESTORED_DIR = path.join(__dirname, 'restored-scrapers');
const TEST_DIR = path.join(__dirname, 'test-runner');

// Create necessary directories
if (!fs.existsSync(path.join(RESTORED_DIR, 'events'))) {
  fs.mkdirSync(path.join(RESTORED_DIR, 'events'), { recursive: true });
}

if (!fs.existsSync(path.join(RESTORED_DIR, 'venues'))) {
  fs.mkdirSync(path.join(RESTORED_DIR, 'venues'), { recursive: true });
}

if (!fs.existsSync(path.join(TEST_DIR, 'events'))) {
  fs.mkdirSync(path.join(TEST_DIR, 'events'), { recursive: true });
}

if (!fs.existsSync(path.join(TEST_DIR, 'venues'))) {
  fs.mkdirSync(path.join(TEST_DIR, 'venues'), { recursive: true });
}

// Find files in a directory
function findFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return [];
  }
  
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .map(file => ({
      name: file,
      path: path.join(dir, file)
    }));
}

// Copy files from a source directory to a target directory
function copyFiles(files, targetDir) {
  let copiedCount = 0;
  
  for (const file of files) {
    const targetPath = path.join(targetDir, file.name);
    
    try {
      fs.copyFileSync(file.path, targetPath);
      console.log(`✅ Copied ${file.name}`);
      copiedCount++;
    } catch (error) {
      console.error(`❌ Error copying ${file.name}: ${error.message}`);
    }
  }
  
  return copiedCount;
}

// Copy missing modules
function copyMissingModules() {
  console.log('======================================================');
  console.log('COPYING ADDITIONAL MISSING MODULES');
  console.log('======================================================');
  
  // Copy events modules
  console.log('\n📁 Copying events modules...');
  const eventsFiles = findFiles(EVENTS_DIR);
  const eventsCount = copyFiles(eventsFiles, path.join(RESTORED_DIR, 'events'));
  console.log(`✅ Copied ${eventsCount} events modules`);
  
  // Copy venues modules
  console.log('\n📁 Copying venues modules...');
  const venuesFiles = findFiles(VENUES_DIR);
  const venuesCount = copyFiles(venuesFiles, path.join(RESTORED_DIR, 'venues'));
  console.log(`✅ Copied ${venuesCount} venues modules`);
  
  // Copy to test directory
  console.log('\n📁 Copying modules to test directory...');
  
  // Copy events to test dir
  copyFiles(eventsFiles, path.join(TEST_DIR, 'events'));
  
  // Copy venues to test dir
  copyFiles(venuesFiles, path.join(TEST_DIR, 'venues'));
  
  // Copy all restored modules to test directory
  const restoredVancouverFiles = findFiles(path.join(RESTORED_DIR, 'cities', 'vancouver'));
  copyFiles(restoredVancouverFiles, path.join(TEST_DIR, 'cities', 'vancouver'));
  
  return {
    events: eventsCount,
    venues: venuesCount
  };
}

// Run the script
const result = copyMissingModules();
console.log('\n======================================================');
console.log('COPY RESULTS SUMMARY');
console.log('======================================================');
console.log(`Total events modules: ${result.events}`);
console.log(`Total venues modules: ${result.venues}`);
console.log('All necessary modules have been copied to:');
console.log(`- ${RESTORED_DIR}`);
console.log(`- ${TEST_DIR}`);
