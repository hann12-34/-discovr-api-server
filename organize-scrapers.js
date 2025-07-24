/**
 * Script to organize Vancouver scrapers
 * - Keep only scrapers that are currently used in index.js
 * - Move all others to a backup directory
 */

const fs = require('fs');
const path = require('path');

// Directories
const SCRAPERS_DIR = path.join(__dirname, 'scrapers/cities/vancouver');
const BACKUP_DIR = path.join(SCRAPERS_DIR, 'backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Read the index.js file to find all scrapers that are currently in use
const indexContent = fs.readFileSync(path.join(SCRAPERS_DIR, 'index.js'), 'utf8');

// Extract all require statements to find imported scrapers
const requireRegex = /require\(['"]\.\/([^'"]+)['"]\)/g;
const importedScrapers = new Set();
let match;

while (match = requireRegex.exec(indexContent)) {
  const scraperName = match[1] + '.js';
  importedScrapers.add(scraperName);
}

console.log(`Found ${importedScrapers.size} scrapers imported in index.js`);

// List all JS files in the directory
const allFiles = fs.readdirSync(SCRAPERS_DIR).filter(file => 
  file.endsWith('.js') && 
  file !== 'index.js' &&
  !file.startsWith('test-') &&
  !file.startsWith('verify-')
);

console.log(`Found ${allFiles.length} total JS files in the scrapers directory`);

// Identify files to move (not in index.js)
const filesToMove = allFiles.filter(file => !importedScrapers.has(file));

console.log(`Moving ${filesToMove.length} unused scrapers to backup directory:`);

// Move files to backup
let movedCount = 0;
filesToMove.forEach(file => {
  const sourcePath = path.join(SCRAPERS_DIR, file);
  const destPath = path.join(BACKUP_DIR, file);
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    fs.unlinkSync(sourcePath);
    console.log(`  ✓ Moved: ${file}`);
    movedCount++;
  } catch (err) {
    console.error(`  ✗ Failed to move ${file}: ${err.message}`);
  }
});

console.log(`\nSuccessfully moved ${movedCount} files to ${BACKUP_DIR}`);
console.log(`Keeping ${allFiles.length - filesToMove.length} scrapers in main directory`);

// Now let's create a summary file in the backup directory
const summary = {
  date: new Date().toISOString(),
  backupReason: "Organizing scrapers - keeping only those currently in use in index.js",
  movedFiles: filesToMove,
  keptFiles: allFiles.filter(file => importedScrapers.has(file))
};

fs.writeFileSync(
  path.join(BACKUP_DIR, 'backup-info.json'), 
  JSON.stringify(summary, null, 2)
);

console.log('\nBackup summary saved to backup-info.json');
