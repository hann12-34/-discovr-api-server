/**
 * Identify all scrapers with placeholder dates that need fixing
 */

const fs = require('fs');
const path = require('path');

const cities = [
  { name: 'Vancouver', dir: 'scrapers/cities/Vancouver' },
  { name: 'Montreal', dir: 'scrapers/cities/Montreal' },
  { name: 'Calgary', dir: 'scrapers/cities/Calgary' },
  { name: 'Toronto', dir: 'scrapers/cities/Toronto' },
  { name: 'New York', dir: 'scrapers/cities/New York' }
];

const scrapersNeedingFixes = [];

cities.forEach(({ name: cityName, dir }) => {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir).filter(f => 
    f.endsWith('.js') && !f.includes('test') && !f.includes('backup')
  );
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Check for placeholder dates
    const hasPlaceholder = content.includes('Date TBA') || 
                          content.includes('Check website for dates') ||
                          content.includes('date: null');
    
    if (hasPlaceholder) {
      // Extract venue name and URL
      const venueMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
      const urlMatch = content.match(/(?:baseUrl|eventsUrl|axios\.get)\s*\(?['"]([^'"]+)['"]/);
      
      scrapersNeedingFixes.push({
        city: cityName,
        file: file,
        venue: venueMatch ? venueMatch[1] : 'Unknown',
        url: urlMatch ? urlMatch[1] : 'Unknown',
        path: path.join(dir, file)
      });
    }
  });
});

console.log('📋 SCRAPERS NEEDING DATE EXTRACTION:\n');
console.log(`Total: ${scrapersNeedingFixes.length} scrapers\n`);

// Group by city
const byCity = scrapersNeedingFixes.reduce((acc, scraper) => {
  if (!acc[scraper.city]) acc[scraper.city] = [];
  acc[scraper.city].push(scraper);
  return acc;
}, {});

Object.entries(byCity).forEach(([city, scrapers]) => {
  console.log(`\n${city} (${scrapers.length} scrapers):`);
  scrapers.slice(0, 10).forEach(s => {
    console.log(`   - ${s.venue} (${s.file})`);
    console.log(`     URL: ${s.url}`);
  });
  if (scrapers.length > 10) {
    console.log(`   ... and ${scrapers.length - 10} more`);
  }
});

// Save to file for processing
fs.writeFileSync('scrapers-needing-dates.json', JSON.stringify(scrapersNeedingFixes, null, 2));
console.log(`\n✅ Saved list to scrapers-needing-dates.json`);
