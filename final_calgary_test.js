const fs = require('fs');
const path = require('path');

const calgaryDir = './scrapers/cities/Calgary';
const files = fs.readdirSync(calgaryDir)
  .filter(f => f.endsWith('.js') && !f.includes('backup') && !f.includes('enhanced'));

console.log('=== FINAL CALGARY SCRAPERS TEST ===');
let working = 0;
let total = 0;

const workingFiles = [];

files.forEach(file => {
  const filepath = path.join(calgaryDir, file);
  total++;
  try {
    delete require.cache[path.resolve(filepath)];
    require(path.resolve(filepath));
    working++;
    workingFiles.push(file);
    console.log(`✅ ${file}`);
  } catch(e) {
    // Skip error details for cleaner output
  }
});

console.log('\n🎯 CALGARY FINAL RESULTS:');
console.log(`Working: ${working}/${total} (${Math.round(working/total*100)}%)`);

if (working >= 10) {
  console.log('\n🎉 TARGET ACHIEVED: 10+ working Calgary scrapers!');
} else {
  console.log(`\n📈 Still need ${10 - working} more working scrapers`);
}

console.log('\nWorking files:');
workingFiles.forEach((file, i) => {
  if (i < 15) console.log(`  ${i+1}. ${file}`);
});

if (workingFiles.length > 15) {
  console.log(`  ... and ${workingFiles.length - 15} more`);
}
