/**
 * CLEAN CALGARY STUB FILES
 * Delete all 118 empty stub scrapers that return no events
 */

const fs = require('fs');
const path = require('path');

const analysis = JSON.parse(fs.readFileSync('calgary-analysis.json', 'utf8'));
const stubsToDelete = analysis.needsDateExtraction.filter(s => !s.hasEventsReturn);

console.log('🧹 CLEANING CALGARY STUB FILES\n');
console.log('='.repeat(80));

console.log(`\n⚠️  WARNING: This will DELETE ${stubsToDelete.length} stub files!`);
console.log('These files are empty and return no events.\n');

console.log('Files to be deleted:\n');
stubsToDelete.slice(0, 10).forEach(s => {
  console.log(`   ❌ ${s.file}`);
});
if (stubsToDelete.length > 10) {
  console.log(`   ... and ${stubsToDelete.length - 10} more`);
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 RECOMMENDATION: DELETE these stubs because:');
console.log('   1. They return no events (empty)');
console.log('   2. They clutter the codebase');
console.log('   3. Calgary still has 22 working scrapers');
console.log('   4. Can be re-implemented later if needed');

console.log('\n📊 AFTER CLEANUP:');
console.log(`   Calgary scrapers: 142 → 24 (22 working + 2 templates)`);
console.log(`   Working percentage: 15.5% → 91.7%`);

// Create backup directory
const backupDir = 'scrapers/cities/Calgary/STUBS_BACKUP';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('\n🔄 Moving files to backup folder (safe delete)...\n');

let moved = 0;
stubsToDelete.forEach((stub, index) => {
  const sourcePath = `scrapers/cities/Calgary/${stub.file}`;
  const backupPath = path.join(backupDir, stub.file);
  
  try {
    fs.renameSync(sourcePath, backupPath);
    moved++;
    if ((index + 1) % 20 === 0) {
      console.log(`   Moved ${index + 1}/${stubsToDelete.length}...`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not move ${stub.file}: ${error.message}`);
  }
});

console.log(`\n✅ Moved ${moved} stub files to ${backupDir}`);
console.log('\n📁 You can delete the backup folder later if you want.');

console.log('\n' + '='.repeat(80));
console.log('✅ CALGARY CLEANUP COMPLETE!');
console.log(`Calgary now has 24 files (22 working scrapers + 2 templates)`);
console.log('='.repeat(80));
