const fs = require('fs');
const data = JSON.parse(fs.readFileSync('NYC-74-CATEGORIZED.json', 'utf8'));

console.log('📋 69 STUB FILES:\n');

data.stubs.forEach((stub, i) => {
  console.log(`${i+1}. ${stub.file}`);
});

// Extract just file names for easier processing
const stubNames = data.stubs.map(s => s.file.replace('.js', '').replace('scrape-', ''));
fs.writeFileSync('stub-names.txt', stubNames.join('\n'));
console.log('\n✅ Saved to stub-names.txt');
