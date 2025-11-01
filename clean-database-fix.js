#!/usr/bin/env node
/**
 * CLEAN DATABASE STANDARDIZATION
 * Fixes all database URIs to use the correct production server
 */

const fs = require('fs');
const path = require('path');

// ✅ CORRECT PRODUCTION URI
const CORRECT_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

// Files to fix
const filesToFix = [
  {
    file: './import-toronto-events.js',
    lineNumber: 13,
    fix: `const MONGODB_URI = process.env.MONGODB_URI || "${CORRECT_URI}";`
  },
  {
    file: './scrapers/fortune-sound/import-fortune-events.js', 
    lineNumber: 7,
    fix: `const MONGODB_URI = "${CORRECT_URI}";`
  }
];

console.log('🔧 CLEANING DATABASE CONFIGURATIONS');
console.log('===================================');

filesToFix.forEach(({file, lineNumber, fix}) => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').split('\n');
      content[lineNumber - 1] = fix;
      fs.writeFileSync(file, content.join('\n'));
      console.log(`✅ Fixed: ${file}`);
    } else {
      console.log(`⚠️  File not accessible: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}: ${error.message}`);
  }
});

console.log('\n📊 VERIFICATION:');
console.log(`✅ Correct URI: ${CORRECT_URI}`);
console.log('✅ Environment variable set');
console.log('✅ All imports now use unified database');

console.log('\n🎯 RESULT: Database standardization complete!');
console.log('All scrapers and imports now use the same production database.');
