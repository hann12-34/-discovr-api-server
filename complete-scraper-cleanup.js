/**
 * Complete Vancouver Scrapers Cleanup
 * - Keeps only scrapers referenced in index.js
 * - Moves test files to a test directory
 * - Moves all other files to backup
 */

const fs = require('fs');
const path = require('path');

// Directories
const SCRAPERS_DIR = path.join(__dirname, 'scrapers/cities/vancouver');
const BACKUP_DIR = path.join(SCRAPERS_DIR, 'backup');
const TEST_DIR = path.join(SCRAPERS_DIR, 'tests');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Read the index.js file to find all scrapers that are currently in use
const indexContent = fs.readFileSync(path.join(SCRAPERS_DIR, 'index.js'), 'utf8');

// Extract all require statements to find imported scrapers
const requireRegex = /require\(['"]\.\/([^'"]+)['"]\)/g;
const activeScraperNames = new Set();
let match;

// Extract active scraper names from require statements
while (match = requireRegex.exec(indexContent)) {
  const scraperName = match[1] + '.js';
  activeScraperNames.add(scraperName);
}

// Check if a file is referenced in index.js (even if commented out)
function isReferencedInIndex(filename) {
  // Check for both commented and uncommented requires
  const pattern = new RegExp(`(//\\s*)?const\\s+\\w+\\s*=\\s*require\\(['"]\\.\\/${filename.replace('.js', '')}['"]\\)`, 'g');
  return pattern.test(indexContent);
}

console.log(`Found ${activeScraperNames.size} active scrapers imported in index.js`);

// List all JS files in the directory
const allFiles = fs.readdirSync(SCRAPERS_DIR)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

console.log(`Found ${allFiles.length} total JS files in the scrapers directory`);

// Categorize files
const testFiles = [];
const referencedFiles = [];
const otherFiles = [];

allFiles.forEach(file => {
  // Special case for puppeteer-helper.js - we want to keep it
  if (file === 'puppeteer-helper.js') {
    referencedFiles.push(file);
  } 
  // Test files
  else if (file.startsWith('test-') || file.includes('-test') || file.startsWith('verify-') || file.startsWith('import-')) {
    testFiles.push(file);
  }
  // Referenced files (active or commented)
  else if (isReferencedInIndex(file)) {
    referencedFiles.push(file);
  }
  // Everything else
  else {
    otherFiles.push(file);
  }
});

console.log(`\nCategorized files:`);
console.log(`- ${referencedFiles.length} referenced files (keeping in main directory)`);
console.log(`- ${testFiles.length} test files (moving to tests directory)`);
console.log(`- ${otherFiles.length} other files (moving to backup directory)`);

// Function to move a file
function moveFile(file, sourceDir, destDir) {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  
  try {
    // Check if file exists before moving
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      fs.unlinkSync(sourcePath);
      return true;
    } else {
      console.error(`  ✗ File not found: ${file}`);
      return false;
    }
  } catch (err) {
    console.error(`  ✗ Failed to move ${file}: ${err.message}`);
    return false;
  }
}

// Move test files
console.log('\nMoving test files to tests directory:');
let testMoveCount = 0;
testFiles.forEach(file => {
  if (moveFile(file, SCRAPERS_DIR, TEST_DIR)) {
    console.log(`  ✓ Moved test file: ${file}`);
    testMoveCount++;
  }
});
console.log(`Moved ${testMoveCount} test files to ${TEST_DIR}`);

// Move other files
console.log('\nMoving other files to backup directory:');
let otherMoveCount = 0;
otherFiles.forEach(file => {
  if (moveFile(file, SCRAPERS_DIR, BACKUP_DIR)) {
    console.log(`  ✓ Moved to backup: ${file}`);
    otherMoveCount++;
  }
});
console.log(`Moved ${otherMoveCount} other files to ${BACKUP_DIR}`);

// Create summary files
const summary = {
  date: new Date().toISOString(),
  action: "Complete Vancouver Scrapers Cleanup",
  keptFiles: referencedFiles,
  testFilesMoved: testFiles,
  backupFilesMoved: otherFiles
};

fs.writeFileSync(
  path.join(SCRAPERS_DIR, 'cleanup-summary.json'), 
  JSON.stringify(summary, null, 2)
);

console.log('\nCleanup summary saved to cleanup-summary.json');
console.log('\nFinal count:');
console.log(`- ${referencedFiles.length} files kept in main directory`);
console.log(`- ${testMoveCount} test files moved to tests directory`);
console.log(`- ${otherMoveCount} other files moved to backup directory`);

// Check if there are any JSON or data files we should handle
const dataFiles = fs.readdirSync(SCRAPERS_DIR)
  .filter(file => !file.endsWith('.js') && file !== 'backup' && file !== 'tests' && file !== 'cleanup-summary.json');

if (dataFiles.length > 0) {
  console.log('\nNOTE: Found additional non-JS files that were not processed:');
  dataFiles.forEach(file => console.log(`  - ${file}`));
}
