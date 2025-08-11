/**
 * FIX: Missing Venue and Source Fields
 * 
 * Updates Toronto scrapers to populate proper venue and source fields
 * so events display correctly in the mobile app with proper city filtering
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// Venue mapping based on scraper names and URLs
const VENUE_MAPPING = {
  'scrape-ago-events': { venue: 'Art Gallery of Ontario', city: 'Toronto, ON' },
  'scrape-rom-events': { venue: 'Royal Ontario Museum', city: 'Toronto, ON' },
  'scrape-cn-tower': { venue: 'CN Tower', city: 'Toronto, ON' },
  'scrape-moca-events': { venue: 'Museum of Contemporary Art Toronto', city: 'Toronto, ON' },
  'scrape-casa-loma': { venue: 'Casa Loma', city: 'Toronto, ON' },
  'scrape-harbourfront': { venue: 'Harbourfront Centre', city: 'Toronto, ON' },
  'scrape-distillery-district': { venue: 'Distillery District', city: 'Toronto, ON' },
  'scrape-ontario-science-centre': { venue: 'Ontario Science Centre', city: 'Toronto, ON' },
  'scrape-toronto-zoo': { venue: 'Toronto Zoo', city: 'Toronto, ON' },
  'scrape-ripley': { venue: 'Ripley\'s Aquarium of Canada', city: 'Toronto, ON' },
  'scrape-gardiner-museum': { venue: 'Gardiner Museum', city: 'Toronto, ON' },
  'scrape-textile-museum': { venue: 'Textile Museum of Canada', city: 'Toronto, ON' },
  'scrape-bata-shoe-museum': { venue: 'Bata Shoe Museum', city: 'Toronto, ON' },
  'scrape-aga-khan-museum': { venue: 'Aga Khan Museum', city: 'Toronto, ON' },
  'scrape-massey-hall': { venue: 'Massey Hall', city: 'Toronto, ON' },
  'scrape-roy-thomson-hall': { venue: 'Roy Thomson Hall', city: 'Toronto, ON' },
  'scrape-phoenix-concert-theatre': { venue: 'Phoenix Concert Theatre', city: 'Toronto, ON' },
  'scrape-danforth-music-hall': { venue: 'Danforth Music Hall', city: 'Toronto, ON' },
  'scrape-opera-house': { venue: 'The Opera House', city: 'Toronto, ON' },
  'scrape-elgin-winter-garden': { venue: 'Elgin and Winter Garden Theatre Centre', city: 'Toronto, ON' },
  'scrape-princess-of-wales': { venue: 'Princess of Wales Theatre', city: 'Toronto, ON' },
  'scrape-royal-alexandra': { venue: 'Royal Alexandra Theatre', city: 'Toronto, ON' },
  'scrape-factory-theatre': { venue: 'Factory Theatre', city: 'Toronto, ON' },
  'scrape-soulpepper': { venue: 'Soulpepper Theatre', city: 'Toronto, ON' },
  'scrape-theatre-centre': { venue: 'Theatre Centre', city: 'Toronto, ON' },
  'scrape-tarragon': { venue: 'Tarragon Theatre', city: 'Toronto, ON' },
  'scrape-rebel-nightclub': { venue: 'Rebel Nightclub', city: 'Toronto, ON' },
  'scrape-vertigo': { venue: 'Vertigo', city: 'Toronto, ON' },
  'scrape-xclub': { venue: 'XClub', city: 'Toronto, ON' },
  'scrape-uv-toronto': { venue: 'UV Toronto', city: 'Toronto, ON' }
};

function getVenueFromScraperName(filename) {
  // Extract base name from filename
  const baseName = filename.replace(/^scrape-/, '').replace(/-events.*\.js$/, '').replace(/\.js$/, '');
  const lookupKey = `scrape-${baseName}`;
  
  // Try exact match first
  if (VENUE_MAPPING[lookupKey]) {
    return VENUE_MAPPING[lookupKey];
  }
  
  // Try partial matches
  for (const [key, venue] of Object.entries(VENUE_MAPPING)) {
    if (key.includes(baseName) || baseName.includes(key.replace('scrape-', ''))) {
      return venue;
    }
  }
  
  // Generate reasonable venue name from filename
  const venueName = baseName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return { venue: venueName, city: 'Toronto, ON' };
}

async function fixVenueSourceFields() {
  console.log('🏢 FIXING VENUE AND SOURCE FIELDS');
  console.log('='.repeat(50));
  
  // Focus on the test scrapers first
  const priorityScrapers = [
    'scrape-ago-events-clean.js',
    'scrape-rom-events-clean.js', 
    'scrape-cn-tower-events-clean.js',
    'scrape-moca-events.js',
    'scrape-casa-loma-events-clean.js'
  ];
  
  let fixed = 0;
  let failed = 0;
  
  for (const filename of priorityScrapers) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${filename}: File not found, skipping`);
        continue;
      }
      
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      console.log(`\n🔧 Fixing ${filename}:`);
      
      // Get venue info for this scraper
      const venueInfo = getVenueFromScraperName(filename);
      console.log(`   🏢 Venue: ${venueInfo.venue}`);
      console.log(`   📍 City: ${venueInfo.city}`);
      
      // Fix venue field assignments
      // Look for patterns like: venue: 'Unknown'
      content = content.replace(
        /venue:\s*['"`]Unknown['"`]/g,
        `venue: '${venueInfo.venue}'`
      );
      
      // Look for patterns like: venue: getGardinerVenue(city) or similar
      content = content.replace(
        /venue:\s*get\w+Venue\([^)]*\)/g,
        `venue: '${venueInfo.venue}'`
      );
      
      // Fix source field assignments
      // Look for patterns like: source: 'Unknown'
      content = content.replace(
        /source:\s*['"`]Unknown['"`]/g,
        `source: workingUrl`
      );
      
      // Look for missing source fields in event objects
      // Find event objects and ensure they have source field
      content = content.replace(
        /(candidateEvents\.push\(\{[^}]*?)(\})/g,
        (match, eventStart, eventEnd) => {
          if (!eventStart.includes('source:')) {
            return `${eventStart},
          source: workingUrl${eventEnd}`;
          }
          return match;
        }
      );
      
      // Fix city field to ensure it's properly set
      content = content.replace(
        /city:\s*['"`]Toronto['"`]/g,
        `city: '${venueInfo.city}'`
      );
      
      // Add city field if missing from event objects
      content = content.replace(
        /(candidateEvents\.push\(\{[^}]*?)(\})/g,
        (match, eventStart, eventEnd) => {
          if (!eventStart.includes('city:')) {
            return `${eventStart},
          city: '${venueInfo.city}'${eventEnd}`;
          }
          return match;
        }
      );
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`✅ Fixed venue and source fields`);
      } else {
        console.log(`⚠️ No changes needed`);
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ ${filename}: Fix failed - ${error.message}`);
    }
  }
  
  console.log('\n📊 VENUE/SOURCE FIELD FIX RESULTS:');
  console.log(`✅ Successfully fixed: ${fixed}`);
  console.log(`❌ Failed to fix: ${failed}`);
  
  if (fixed >= 3) {
    console.log('\n🎉 SUCCESS! Scrapers should now have proper venue/source data!');
    console.log('📱 Toronto events should now display correctly in mobile app!');
  } else {
    console.log('\n⚠️ Limited success - may need manual inspection');
  }
  
  return { fixed, failed };
}

// Run the fix
fixVenueSourceFields().catch(console.error);
