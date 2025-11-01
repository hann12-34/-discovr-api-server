/**
 * Complete analysis of all New York scrapers
 */

const fs = require('fs');
const path = require('path');

const nyDir = 'scrapers/cities/New York';
const files = fs.readdirSync(nyDir).filter(f => f.endsWith('.js') && !f.includes('test'));

const issues = {
  stubs: [],
  missingAddress: [],
  undefinedDescription: [],
  noUUID: [],
  noEventsCheck: []
};

files.forEach(file => {
  const filePath = path.join(nyDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for stub (returns empty array without trying to scrape)
  if (content.includes('return [];') && !content.includes('events.push')) {
    issues.stubs.push(file);
  }
  
  // Check for missing address in venue objects
  if (content.includes('venue:') && !content.includes('address:')) {
    issues.missingAddress.push(file);
  }
  
  // Check for undefined description
  if (content.match(/description\s*&&/) && !content.match(/const\s+description\s*=/)) {
    issues.undefinedDescription.push(file);
  }
  
  // Check for missing UUID
  if (content.includes('events.push') && !content.includes('uuidv4') && !content.includes('id:')) {
    issues.noUUID.push(file);
  }
  
  // Check if it validates events properly (not extracting UI elements)
  if (content.includes('events.push') && !content.includes('isValidEvent') && !content.includes('filterEvents')) {
    issues.noEventsCheck.push(file);
  }
});

console.log('🔍 NEW YORK SCRAPER COMPLETE ANALYSIS\n');
console.log('=' .repeat(50));
console.log(`📁 Total scrapers: ${files.length}\n`);

console.log(`🚧 STUB SCRAPERS (${issues.stubs.length}):`);
issues.stubs.forEach(f => console.log(`   - ${f}`));

console.log(`\n📍 MISSING ADDRESS (${issues.missingAddress.length}):`);
issues.missingAddress.slice(0, 10).forEach(f => console.log(`   - ${f}`));
if (issues.missingAddress.length > 10) console.log(`   ... and ${issues.missingAddress.length - 10} more`);

console.log(`\n🐛 UNDEFINED DESCRIPTION (${issues.undefinedDescription.length}):`);
issues.undefinedDescription.forEach(f => console.log(`   - ${f}`));

console.log(`\n🆔 MISSING UUID (${issues.noUUID.length}):`);
issues.noUUID.forEach(f => console.log(`   - ${f}`));

console.log(`\n⚠️  NO EVENT VALIDATION (${issues.noEventsCheck.length}):`);
issues.noEventsCheck.slice(0, 10).forEach(f => console.log(`   - ${f}`));
if (issues.noEventsCheck.length > 10) console.log(`   ... and ${issues.noEventsCheck.length - 10} more`);

const totalIssues = issues.stubs.length + issues.missingAddress.length + 
                    issues.undefinedDescription.length + issues.noUUID.length;

console.log('\n' + '='.repeat(50));
console.log(`📊 TOTAL ISSUES: ${totalIssues}`);
console.log(`🎯 TARGET: Fix all issues → 35/35 (100%) working scrapers`);
