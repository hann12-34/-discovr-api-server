#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
const files = fs.readdirSync(cityDir).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

console.log('🔍 IDENTIFYING SYNTAX ERRORS\n');

const errors = [];

for (const file of files) {
  try {
    const filePath = path.join(cityDir, file);
    delete require.cache[require.resolve(filePath)];
    require(filePath);
  } catch (error) {
    if (error.message.includes('SyntaxError') || error.message.includes('Unexpected')) {
      errors.push({ file, error: error.message });
      console.log(`💥 ${file}`);
      console.log(`   ${error.message.substring(0, 100)}`);
    }
  }
}

console.log(`\n❌ TOTAL: ${errors.length} syntax errors\n`);
errors.forEach(({file}) => console.log(`  - ${file}`));
