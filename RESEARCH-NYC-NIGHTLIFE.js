const axios = require('axios');

// Real NYC nightlife venues with actual event pages
const nycNightlifeVenues = [
  // Manhattan Nightlife
  { name: 'Webster Hall', urls: ['https://www.websterhall.com/events', 'https://www.axs.com/venues/100654/webster-hall-tickets'], address: '125 E 11th St New York NY 10003' },
  { name: 'Marquee New York', urls: ['https://marqueeny.com/', 'https://www.residentadvisor.net/clubs/3562'], address: '289 10th Ave New York NY 10001' },
  { name: 'Output', urls: ['https://ra.co/clubs/24883', 'https://www.residentadvisor.net/clubs/24883'], address: '74 Wythe Ave Brooklyn NY 11249' },
  { name: 'Elsewhere', urls: ['https://www.elsewherebrooklyn.com/events/', 'https://www.ticketweb.com/venue/elsewhere-brooklyn-ny/404815'], address: '599 Johnson Ave Brooklyn NY 11237' },
  { name: 'Good Room', urls: ['https://goodroombk.com/', 'https://ra.co/clubs/62906'], address: '98 Meserole Ave Brooklyn NY 11222' },
  { name: 'Nowadays', urls: ['https://nowadays.nyc/', 'https://ra.co/clubs/108908'], address: '56-06 Cooper Ave Queens NY 11385' },
  { name: 'Avant Gardner', urls: ['https://avantgardner.com/events/', 'https://www.ticketmaster.com/avant-gardner-tickets/artist/2477074'], address: '140 Stewart Ave Brooklyn NY 11237' },
  { name: 'Schimanski', urls: ['https://schimanskibrooklyn.com/', 'https://ra.co/clubs/130916'], address: '54 N 11th St Brooklyn NY 11249' },
  
  // Historic Music Venues
  { name: 'SOBs', urls: ['https://www.sobs.com/events/', 'https://www.ticketweb.com/venue/sobs-new-york-ny/62'], address: '204 Varick St New York NY 10014' },
  { name: 'Le Poisson Rouge', urls: ['https://lepoissonrouge.com/events/', 'https://www.ticketmaster.com/le-poisson-rouge-tickets-new-york/venue/236575'], address: '158 Bleecker St New York NY 10012' },
  { name: 'Brooklyn Bowl', urls: ['https://www.brooklynbowl.com/events/', 'https://www.ticketmaster.com/brooklyn-bowl-tickets-brooklyn/venue/238799'], address: '61 Wythe Ave Brooklyn NY 11249' },
  { name: 'Baby\'s All Right', urls: ['https://babysallright.com/', 'https://www.ticketweb.com/venue/babys-all-right-brooklyn-ny/171901'], address: '146 Broadway Brooklyn NY 11211' },
  { name: 'Mercury Lounge', urls: ['https://mercuryloungenyc.com/', 'https://www.ticketweb.com/venue/mercury-lounge-new-york-ny/88'], address: '217 E Houston St New York NY 10002' },
  { name: 'Bowery Ballroom', urls: ['https://www.boweryballroom.com/events', 'https://www.ticketmaster.com/bowery-ballroom-tickets-new-york/venue/83947'], address: '6 Delancey St New York NY 10002' },
  
  // Warehouse & Underground
  { name: 'The Brooklyn Mirage', urls: ['https://avantgardner.com/events/', 'https://ra.co/clubs/116408'], address: '140 Stewart Ave Brooklyn NY 11237' },
  { name: 'Superior Ingredients', urls: ['https://www.superioringredients.nyc/', 'https://ra.co/clubs/146808'], address: '147 N 10th St Brooklyn NY 11249' },
  { name: 'House of Yes', urls: ['https://houseofyes.org/events/', 'https://www.residentadvisor.net/clubs/82896'], address: '2 Wyckoff Ave Brooklyn NY 11237' },
  { name: 'Bossa Nova Civic Club', urls: ['https://bossanovacivicclub.com/', 'https://ra.co/clubs/74558'], address: '1271 Myrtle Ave Brooklyn NY 11221' },
  
  // Clubs & Lounges
  { name: 'Cielo', urls: ['https://www.cieloclub.com/', 'https://ra.co/clubs/3536'], address: '18 Little W 12th St New York NY 10014' },
  { name: 'The DL', urls: ['https://www.thedlnyc.com/', 'https://www.residentadvisor.net/clubs/47756'], address: '95 Delancey St New York NY 10002' }
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

async function researchNYCNightlife() {
  console.log('=' .repeat(60));
  console.log('🌙 NYC NIGHTLIFE VENUE RESEARCH');
  console.log('='.repeat(60));
  console.log('\n');
  
  const results = [];
  
  for (const venue of nycNightlifeVenues) {
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
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESEARCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Found: ${results.length}/${nycNightlifeVenues.length} working NYC nightlife venues`);
  
  const fs = require('fs');
  fs.writeFileSync('NYC_NIGHTLIFE_RESEARCH.json', JSON.stringify(results, null, 2));
  console.log('💾 Results saved to NYC_NIGHTLIFE_RESEARCH.json');
  
  return results;
}

researchNYCNightlife().catch(console.error);
