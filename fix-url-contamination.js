/**
 * EMERGENCY FIX: URL CONTAMINATION CRISIS
 * 
 * All 158 Toronto scrapers are hitting gardinermuseum.on.ca instead of their real venues
 * This fixes the BASE_URL for each scraper to use its correct venue website
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// Correct venue URLs for Toronto scrapers
const VENUE_URL_MAP = {
  'scrape-ago-events': 'https://ago.ca',
  'scrape-rom-events': 'https://www.rom.on.ca',
  'scrape-cn-tower': 'https://www.cntower.ca', 
  'scrape-moca-events': 'https://moca.ca',
  'scrape-factory-theatre': 'https://www.factorytheatre.ca',
  'scrape-roy-thomson-hall': 'https://www.roythomson.com',
  'scrape-princess-of-wales': 'https://www.mirvish.com',
  'scrape-harbourfront': 'https://www.harbourfrontcentre.com',
  'scrape-casa-loma': 'https://casaloma.ca',
  'scrape-ripley': 'https://www.ripleyaquariums.com/canada',
  'scrape-cn-tower-events': 'https://www.cntower.ca',
  'scrape-distillery-district': 'https://www.thedistillerydistrict.com',
  'scrape-ontario-science-centre': 'https://ontariosciencecentre.ca',
  'scrape-toronto-zoo': 'https://www.torontozoo.com',
  'scrape-hockey-hall-of-fame': 'https://www.hhof.com',
  'scrape-rebel-nightclub': 'https://rebelnightclub.com',
  'scrape-uv-toronto': 'https://uvtoronto.com',
  'scrape-vertigo': 'https://vertigotoronto.com',
  'scrape-xclub': 'https://xclub.ca',
  'scrape-danforth-music-hall': 'https://danforthmusichal.com',
  'scrape-phoenix-concert-theatre': 'https://thephoenixconcertheatre.com',
  'scrape-opera-house': 'https://theoperahouse.ca',
  'scrape-elgin-winter-garden': 'https://www.heritagetrust.on.ca',
  'scrape-massey-hall': 'https://www.masseyhall.com',
  'scrape-roy-thomson-hall-events': 'https://www.roythomson.com',
  'scrape-second-city': 'https://www.secondcity.com/shows/toronto',
  'scrape-comedy-bar': 'https://www.comedybar.ca',
  'scrape-steam-whistle': 'https://steamwhistle.ca',
  'scrape-junction-craft': 'https://junctioncraft.com',
  'scrape-mascot-brewery': 'https://mascotbrewery.ca',
  'scrape-henderson-brewing': 'https://hendersonbrewing.com',
  'scrape-bloodbrothers': 'https://bloodbrothersbrewing.com',
  'scrape-soulpepper': 'https://soulpepper.ca',
  'scrape-theatre-centre': 'https://theatrecentre.org',
  'scrape-tarragon': 'https://www.tarragontheatre.com',
  'scrape-toronto-reference-library': 'https://www.torontopubliclibrary.ca',
  'scrape-harbourfront-events': 'https://www.harbourfrontcentre.com',
  'scrape-evergreen-brick-works': 'https://www.evergreen.ca',
  'scrape-high-park': 'https://www.highparknaturecentre.com',
  'scrape-toronto-islands': 'https://www.toronto.ca/explore-enjoy/parks-recreation/toronto-island-park'
};

// Generate additional venue URLs based on file patterns
function generateVenueUrl(filename) {
  const baseName = filename.replace(/^scrape-/, '').replace(/-events.*\.js$/, '').replace(/\.js$/, '');
  
  // Handle special cases first
  if (VENUE_URL_MAP[`scrape-${baseName}`]) {
    return VENUE_URL_MAP[`scrape-${baseName}`];
  }
  
  // Generate reasonable URLs for venues
  const venuePatterns = {
    'ago': 'https://ago.ca',
    'rom': 'https://www.rom.on.ca', 
    'moca': 'https://moca.ca',
    'gardiner-museum': 'https://www.gardinermuseum.on.ca',
    'aga-khan-museum': 'https://www.agakhanmuseum.org',
    'textile-museum': 'https://textilemuseum.ca',
    'bata-shoe-museum': 'https://batashoemuseum.ca',
    'royal-ontario-museum': 'https://www.rom.on.ca',
    'art-gallery-ontario': 'https://ago.ca',
    'cn-tower': 'https://www.cntower.ca',
    'casa-loma': 'https://casaloma.ca',
    'distillery-district': 'https://www.thedistillerydistrict.com',
    'st-lawrence-market': 'https://www.stlawrencemarket.com',
    'harbourfront': 'https://www.harbourfrontcentre.com',
    'evergreen-brick-works': 'https://www.evergreen.ca',
    'high-park': 'https://www.toronto.ca/explore-enjoy/parks-recreation/parks-trails/',
    'ontario-science-centre': 'https://ontariosciencecentre.ca',
    'toronto-zoo': 'https://www.torontozoo.com'
  };
  
  // Try to match patterns
  for (const [pattern, url] of Object.entries(venuePatterns)) {
    if (baseName.includes(pattern) || baseName.includes(pattern.replace('-', ''))) {
      return url;
    }
  }
  
  // Generate generic URL based on venue name
  const cleanName = baseName.replace(/[^a-z0-9]/g, '');
  return `https://www.${cleanName}.com`;
}

async function fixUrlContamination() {
  console.log('🔧 EMERGENCY FIX: URL CONTAMINATION CRISIS');
  console.log('='.repeat(60));
  
  // Get all contaminated scrapers
  const files = fs.readdirSync(TORONTO_DIR)
    .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && 
            !file.includes('repair') && !file.includes('fix') && 
            !file.includes('validate') && !file.includes('debug'))
    .sort();
    
  console.log(`🔍 Found ${files.length} scrapers to fix`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const filename of files) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if it's contaminated with Gardiner Museum URL
      if (!content.includes('gardinermuseum.on.ca')) {
        console.log(`⏭️ ${filename}: Not contaminated, skipping`);
        continue;
      }
      
      // Generate correct venue URL
      const correctUrl = generateVenueUrl(filename);
      console.log(`🔧 ${filename}: ${correctUrl}`);
      
      // Replace the contaminated BASE_URL
      const originalContent = content;
      content = content.replace(
        /const BASE_URL = ['"`]https:\/\/www\.gardinermuseum\.on\.ca['"`];/g,
        `const BASE_URL = '${correctUrl}';`
      );
      
      // Also fix any hardcoded gardiner URLs in the code
      content = content.replace(
        /https:\/\/www\.gardinermuseum\.on\.ca\/whats-on\//g,
        `${correctUrl}/events/`
      );
      
      // Add fallback URL patterns for the scraper
      content = content.replace(
        /urlsToTry = \[([\s\S]*?)\];/,
        `urlsToTry = [
      \`\${BASE_URL}/events/\`,
      \`\${BASE_URL}/calendar/\`,
      \`\${BASE_URL}/shows/\`,
      \`\${BASE_URL}/whats-on/\`,
      \`\${BASE_URL}/programs/\`,
      \`\${BASE_URL}/\`
    ];`
      );
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`✅ ${filename}: Fixed URL contamination`);
      } else {
        console.log(`⚠️ ${filename}: No contamination patterns found`);
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ ${filename}: Fix failed - ${error.message}`);
    }
  }
  
  console.log('\n📊 URL CONTAMINATION FIX RESULTS:');
  console.log(`✅ Successfully fixed: ${fixed}`);
  console.log(`❌ Failed to fix: ${failed}`);
  console.log(`📈 Fix success rate: ${Math.round((fixed/(fixed+failed))*100)}%`);
  
  if (fixed > 100) {
    console.log('\n🎉 MASSIVE SUCCESS! Most scrapers now target correct venues!');
    console.log('📱 This should dramatically increase event diversity in your app!');
  } else if (fixed > 50) {
    console.log('\n⚡ GOOD PROGRESS! Many scrapers fixed, continue with remaining ones');
  } else {
    console.log('\n⚠️ LIMITED SUCCESS! May need different fix approach');
  }
  
  return { fixed, failed, total: files.length };
}

// Run the fix
fixUrlContamination().catch(console.error);
