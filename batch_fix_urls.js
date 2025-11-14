const fs = require('fs');
const path = require('path');

// URL fixes for broken scrapers
const urlFixes = [
  {
    file: 'scrape-aga-khan-museum-events.js',
    oldUrl: 'https://www.agakhanmuseum.org/visit/whats-on',
    newUrl: 'https://agakhanmuseum.org/whats-on/',
    baseUrl: 'https://agakhanmuseum.org'
  },
  {
    file: 'scrape-buddies-in-bad-times-theatre-events.js',
    oldUrl: 'https://buddiesinbadtimes.com/shows',
    newUrl: 'https://buddiesinbadtimes.com/',
    baseUrl: 'https://buddiesinbadtimes.com'
  }
];

const torontoDir = './scrapers/cities/Toronto';

console.log('🔧 Batch Fixing URLs\n');

for (const fix of urlFixes) {
  const filePath = path.join(torontoDir, fix.file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log('⚠️  File not found:', fix.file);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace old URL with new URL
    if (content.includes(fix.oldUrl)) {
      content = content.replace(new RegExp(fix.oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.newUrl);
      
      // Also update base URL if it appears
      const oldDomain = fix.oldUrl.match(/https?:\/\/[^\/]+/)[0];
      if (oldDomain !== fix.baseUrl) {
        content = content.replace(new RegExp(oldDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.baseUrl);
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Fixed:', fix.file);
      console.log('   Old:', fix.oldUrl);
      console.log('   New:', fix.newUrl);
      console.log('');
    } else {
      console.log('⚠️  URL not found in file:', fix.file);
    }
  } catch (err) {
    console.log('❌ Error fixing', fix.file + ':', err.message);
  }
}

console.log('✅ Batch fix complete');
