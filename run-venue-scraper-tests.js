/**
 * Script to run specific venue scraper tests
 * Creates a temporary directory structure to match test imports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Target venues to test
const targetVenues = [
  'metropolis', // Metropolis at Metrotown
  'rickshaw',   // Rickshaw Theatre
  'cultch',     // The Cultch
  'commodore'   // Commodore Ballroom (additional example)
];

// Settings
const PROJECT_ROOT = __dirname;
const SCRAPERS_DIR = path.join(PROJECT_ROOT, 'scrapers', 'cities', 'vancouver');
const TESTS_DIR = path.join(SCRAPERS_DIR, 'tests');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp-test-structure');

// Ensure the temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Create the expected directory structure
const tempScrapersDir = path.join(TEMP_DIR, 'scrapers', 'cities', 'vancouver');
fs.mkdirSync(tempScrapersDir, { recursive: true });

// Find and copy relevant scraper files to the temp directory
console.log('Looking for active scrapers in:', SCRAPERS_DIR);
const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
  .filter(file => file.endsWith('.js') && !file.startsWith('index'));

console.log(`Found ${scraperFiles.length} scraper files`);

// Copy all scrapers to temp directory
scraperFiles.forEach(file => {
  const sourcePath = path.join(SCRAPERS_DIR, file);
  const destPath = path.join(tempScrapersDir, file);
  fs.copyFileSync(sourcePath, destPath);
});

console.log('Scrapers copied to temporary directory');

// Find matching test files for target venues
console.log('\nLooking for test files for target venues:', targetVenues.join(', '));
const testFiles = fs.readdirSync(TESTS_DIR)
  .filter(file => 
    file.endsWith('.js') && 
    targetVenues.some(venue => file.toLowerCase().includes(venue))
  );

console.log(`Found ${testFiles.length} matching test files:`);
testFiles.forEach(file => console.log(`- ${file}`));

// Run each test with the correct path structure
console.log('\nRunning venue-specific tests...');
testFiles.forEach((file, index) => {
  const testFilePath = path.join(TESTS_DIR, file);
  
  // Create a modified version of the test file with corrected paths
  const tempTestFile = path.join(TEMP_DIR, file);
  let testContent = fs.readFileSync(testFilePath, 'utf-8');
  
  // Fix the require paths - change './scrapers/cities/vancouver/' to '../'
  testContent = testContent.replace(
    /require\(['"]\.\/scrapers\/cities\/vancouver\/([^'"]+)['"]\)/g,
    "require('../$1')"
  );
  
  // Also fix other common path patterns
  testContent = testContent.replace(
    /require\(['"]\.\/cities\/vancouver\/([^'"]+)['"]\)/g,
    "require('../$1')"
  );
  
  fs.writeFileSync(tempTestFile, testContent);
  
  console.log(`\n[${index + 1}/${testFiles.length}] Running: ${file}`);
  try {
    const output = execSync(`node "${tempTestFile}"`, {
      cwd: tempScrapersDir, // Run from the temp scrapers directory
      timeout: 30000, // 30 seconds timeout
      encoding: 'utf-8'
    });
    
    console.log('✅ Success!');
    console.log(output.trim());
  } catch (error) {
    console.log('❌ Failed');
    if (error.stdout) console.log(error.stdout.trim());
    if (error.stderr) console.log(error.stderr.trim());
  }
});

console.log('\nAll venue-specific tests completed');
console.log('Temporary directory will not be deleted in case you need to inspect it');
console.log(`Location: ${TEMP_DIR}`);
