#!/usr/bin/env node

/**
 * PRIORITIZE EMPTY SCRAPERS
 * Identify high-value venues that need fixing
 */

// High-value Vancouver venues (major venues worth fixing)
const HIGH_VALUE_VENUES = [
  // Concert Halls & Theatres
  'queenel', 'orpheum', 'commodore', 'roxy', 'rickshaw', 'biltmore',
  'vogue', 'rio', 'fortune', 'fox', 'venue', 'media',
  
  // Arts & Culture
  'gallery', 'museum', 'symphony', 'opera', 'ballet', 'theatre',
  'cultch', 'firehall', 'carousel', 'vancity',
  
  // Sports & Arenas
  'rogers', 'bcplace', 'pacific', 'coliseum',
  
  // Festivals
  'pride', 'fringe', 'jazz', 'folk', 'film', 'fest',
  'celebration', 'summer', 'italian', 'greek', 'dragon',
  
  // Popular Venues
  'granville', 'stanley', 'english', 'gastown',
  'science', 'aquarium', 'garden', 'park'
];

const fs = require('fs');
const path = require('path');

const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
const files = fs.readdirSync(cityDir)
  .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

console.log('🎯 HIGH-VALUE EMPTY SCRAPERS TO FIX\n');
console.log('='.repeat(70));

const highValue = [];
const lowValue = [];

files.forEach(file => {
  const fileName = file.toLowerCase().replace('.js', '');
  const isHighValue = HIGH_VALUE_VENUES.some(venue => fileName.includes(venue));
  
  if (isHighValue) {
    highValue.push(file);
  } else {
    lowValue.push(file);
  }
});

console.log(`\n📌 HIGH PRIORITY (${highValue.length} scrapers):`);
console.log('These are major venues worth fixing\n');
highValue.sort().forEach(file => {
  console.log(`  ${file}`);
});

console.log(`\n\n📊 STATS:`);
console.log(`Total scrapers: ${files.length}`);
console.log(`High priority: ${highValue.length} (${Math.round(highValue.length/files.length*100)}%)`);
console.log(`Low priority: ${lowValue.length} (${Math.round(lowValue.length/files.length*100)}%)`);
console.log(`\n💡 Focus on fixing the high priority scrapers for maximum impact!`);
