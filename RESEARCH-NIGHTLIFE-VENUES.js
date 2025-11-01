const axios = require('axios');

// REAL nightlife venues with actual event pages
const calgaryNightlifeVenues = [
  { name: 'Cowboys Music Festival', urls: ['https://www.cowboysnightclub.com/events/', 'https://www.cowboysnightclub.com/'], address: '421 12 Ave SE Calgary AB T2G 1A3' },
  { name: 'The Palace Theatre', urls: ['https://thepalacetheatre.ca/events/', 'https://thepalacetheatre.ca/'], address: '219 8 Ave SW Calgary AB T2P 1B5' },
  { name: 'Commonwealth Bar & Stage', urls: ['https://www.thecommonwealth.ca/events', 'https://www.thecommonwealth.ca/'], address: '731 10 Ave SW Calgary AB T2R 0B3' },
  { name: 'Broken City', urls: ['https://www.brokencity.ca/', 'https://www.instagram.com/brokencityyyc/'], address: '613 11 Ave SW Calgary AB T2R 0E1' },
  { name: 'HiFi Club', urls: ['https://hificlub.ca/events/', 'https://hificlub.ca/'], address: '219 10 Ave SW Calgary AB T2R 0A6' },
  { name: 'Habitat Living Sound', urls: ['https://habitatlivingsound.com/events/', 'https://habitatlivingsound.com/'], address: '		403 8 Ave SE Calgary AB T2G 0K9' },
  { name: 'Junction', urls: ['https://www.junctioncalgary.com/', 'https://www.showclix.com/venue/junction'], address: '116 8 Ave SE Calgary AB T2G 0K5' },
  { name: 'The Hifi Club', urls: ['https://hificlub.ca/', 'https://ra.co/clubs/85743/events'], address: '219 10 Ave SW Calgary AB T2R 0A6' },
  { name: 'Dickens Pub', urls: ['https://www.dickenspub.ca/events/', 'https://www.dickenspub.ca/'], address: '1000 8th Ave SW Calgary AB T2P 3M7' },
  { name: 'National on 10th', urls: ['https://nationalon10th.com/', 'https://www.instagram.com/nationalon10th/'], address: '1210 10 Ave SW Calgary AB T2R 0B2' }
];

const montrealNightlifeVenues = [
  { name: 'Stereo Nightclub', urls: ['https://stereo-nightclub.com/en/events/', 'https://stereo-nightclub.com/'], address: '858 Rue Sainte-Catherine E Montreal QC H2L 2E3' },
  { name: 'New City Gas', urls: ['https://newcitygas.com/events/', 'https://newcitygas.com/'], address: '950 Rue Ottawa Montreal QC H3C 1S4' },
  { name: 'Club Soda', urls: ['https://www.evenko.ca/en/events/venue/club-soda', 'https://clubsoda.ca/'], address: '1225 Boulevard Saint-Laurent Montreal QC H2X 2S6' },
  { name: 'Foufounes Electriques', urls: ['https://foufounes.ca/agenda/', 'https://foufounes.ca/'], address: '87 Rue Sainte-Catherine E Montreal QC H2X 1K5' },
  { name: 'Le Belmont', urls: ['https://www.lebelmont.com/', 'https://www.instagram.com/lebelmontmtl/'], address: '4483 Boulevard Saint-Laurent Montreal QC H2T 1R2' },
  { name: 'Bar Le Ritz PDB', urls: ['https://www.barleritzpdb.com/', 'https://www.ticketweb.ca/venue/bar-le-ritz-pdb-montreal-qc/489'], address: '179 Rue Jean-Talon O Montreal QC H2R 2X2' },
  { name: 'Salon Daome', urls: ['https://salondaome.com/', 'https://www.instagram.com/salondaome/'], address: '141 Avenue du Mont-Royal E Montreal QC H2T 1N8' },
  { name: 'Cafe Cleo', urls: ['https://www.cafecleo.ca/', 'https://www.instagram.com/cafe.cleo/'], address: '3865 Boulevard Saint-Laurent Montreal QC H2W 1Y2' },
  { name: 'Bar Datcha', urls: ['https://www.bardatcha.com/', 'https://www.instagram.com/bar_datcha/'], address: '4601 Boulevard Saint-Laurent Montreal QC H2T 1R2' },
  { name: 'Turbo Hauss', urls: ['https://turbohauss.com/', 'https://www.showclix.com/venue/turbo-hauss'], address: '2040 Rue Saint-Denis Montreal QC H2X 3K7' },
  { name: 'Bar Chez Jose', urls: ['https://www.barchezjose.com/', 'https://www.instagram.com/barchezjose/'], address: '173 Rue Ontario E Montreal QC H2X 1H5' },
  { name: 'Tokyo Bar', urls: ['https://www.tokyobar.ca/', 'https://www.instagram.com/tokyobarmtl/'], address: '3709 Boulevard Saint-Laurent Montreal QC H2X 2V7' },
  { name: 'Newspeak', urls: ['https://ra.co/clubs/108766/events', 'https://newspeakmontreal.com/'], address: '5589 Boulevard Saint-Laurent Montreal QC H2T 1S8' },
  { name: 'Diving Bell Social Club', urls: ['https://www.divingbellsocial.com/', 'https://www.instagram.com/divingbellsocial/'], address: '3956 Boulevard Saint-Laurent Montreal QC H2W 1Y3' }
];

async function testUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (response.status === 200) {
      const hasEvents = response.data.toLowerCase().includes('event') || 
                       response.data.toLowerCase().includes('show');
      return { status: 'success', code: 200, hasEvents, length: response.data.length };
    }
    return { status: 'failed', code: response.status };
  } catch (error) {
    return { status: 'failed', error: error.code || error.message.substring(0, 30) };
  }
}

async function researchNightlife(cityName, venues) {
  console.log(`\n🌙 Researching ${cityName} Nightlife Venues...\n`);
  
  const results = [];
  
  for (const venue of venues) {
    console.log(`📍 ${venue.name}`);
    let bestUrl = null;
    
    for (const url of venue.urls) {
      const result = await testUrl(url);
      const status = result.status === 'success' ? '✅' : '❌';
      const extra = result.hasEvents ? ' [HAS EVENTS]' : '';
      console.log(`   ${url.substring(0, 50)}... - ${status} ${result.code || result.error}${extra}`);
      
      if (result.status === 'success' && !bestUrl) {
        bestUrl = url;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (bestUrl) {
      console.log(`   🎯 Using: ${bestUrl}`);
      results.push({ name: venue.name, url: bestUrl, address: venue.address });
    } else {
      console.log(`   ⚠️  No working URL`);
    }
    console.log('');
  }
  
  return results;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('🌙 NIGHTLIFE VENUE RESEARCH');
  console.log('='.repeat(60));
  
  const calgaryResults = await researchNightlife('Calgary', calgaryNightlifeVenues);
  const montrealResults = await researchNightlife('Montreal', montrealNightlifeVenues);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESEARCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Calgary: ${calgaryResults.length}/${calgaryNightlifeVenues.length} working venues`);
  console.log(`✅ Montreal: ${montrealResults.length}/${montrealNightlifeVenues.length} working venues`);
  
  const fs = require('fs');
  fs.writeFileSync('NIGHTLIFE_RESEARCH.json', JSON.stringify({ calgary: calgaryResults, montreal: montrealResults }, null, 2));
  console.log('\n💾 Results saved to NIGHTLIFE_RESEARCH.json');
}

main().catch(console.error);
