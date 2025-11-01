/**
 * Complete analysis of Toronto scrapers - dates, addresses, and quality
 */

const fs = require('fs');
const path = require('path');

const torontoDir = 'scrapers/cities/Toronto';
const files = fs.readdirSync(torontoDir).filter(f => 
  f.endsWith('.js') && !f.includes('test') && !f.includes('backup')
);

const issues = {
  nullDates: [],
  tbaDates: [],
  noAddress: [],
  genericAddress: [],
  missingVenueAddress: []
};

files.forEach(file => {
  const filePath = path.join(torontoDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for date issues
  if (content.match(/date:\s*null/i)) {
    issues.nullDates.push(file);
  }
  if (content.includes("'Date TBA'") || content.includes('"Date TBA"')) {
    issues.tbaDates.push(file);
  }
  
  // Check for address issues
  if (!content.includes('address:')) {
    if (content.includes('venue:') && content.includes('events.push')) {
      issues.noAddress.push(file);
    }
  } else {
    // Check for generic addresses
    if (content.includes("address: 'Toronto'") && !content.includes("'Toronto, ON")) {
      issues.genericAddress.push(file);
    }
    
    // Check if venue object is missing address field
    const venuePattern = /venue:\s*\{\s*name:[^}]+\}/g;
    const matches = content.match(venuePattern);
    if (matches && matches.some(m => !m.includes('address'))) {
      issues.missingVenueAddress.push(file);
    }
  }
});

console.log('📊 TORONTO SCRAPERS COMPLETE ANALYSIS\n');
console.log('='.repeat(80));
console.log(`📁 Total Toronto Scrapers: ${files.length}`);
console.log('='.repeat(80));

console.log(`\n❌ NULL DATES (${issues.nullDates.length}):`);
if (issues.nullDates.length > 0) {
  issues.nullDates.forEach(f => console.log(`   - ${f}`));
} else {
  console.log('   ✅ None!');
}

console.log(`\n📅 TBA DATES (${issues.tbaDates.length}):`);
if (issues.tbaDates.length > 0) {
  issues.tbaDates.slice(0, 10).forEach(f => console.log(`   - ${f}`));
  if (issues.tbaDates.length > 10) {
    console.log(`   ... and ${issues.tbaDates.length - 10} more`);
  }
}

console.log(`\n📍 NO ADDRESS FIELD (${issues.noAddress.length}):`);
if (issues.noAddress.length > 0) {
  issues.noAddress.forEach(f => console.log(`   - ${f}`));
} else {
  console.log('   ✅ None!');
}

console.log(`\n🔍 GENERIC ADDRESS (${issues.genericAddress.length}):`);
if (issues.genericAddress.length > 0) {
  issues.genericAddress.slice(0, 10).forEach(f => console.log(`   - ${f}`));
  if (issues.genericAddress.length > 10) {
    console.log(`   ... and ${issues.genericAddress.length - 10} more`);
  }
}

console.log(`\n⚠️  VENUE MISSING ADDRESS (${issues.missingVenueAddress.length}):`);
if (issues.missingVenueAddress.length > 0) {
  issues.missingVenueAddress.slice(0, 10).forEach(f => console.log(`   - ${f}`));
  if (issues.missingVenueAddress.length > 10) {
    console.log(`   ... and ${issues.missingVenueAddress.length - 10} more`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('🎯 SUMMARY:');
console.log(`   Total Issues: ${issues.nullDates.length + issues.noAddress.length + issues.genericAddress.length}`);
console.log('='.repeat(80));
