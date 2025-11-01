const axios = require('axios');

// Research all remaining NYC venues needing working URLs
const remainingNYCVenues = [
  { name: 'Baby\'s All Right', urls: ['https://www.babysallright.com/calendar', 'https://www.ticketweb.com/venue/babys-all-right-brooklyn-ny/171901'], address: '146 Broadway Brooklyn NY 11211', file: 'babys-all-right.js' },
  { name: 'Apollo Theater', urls: ['https://www.apollotheater.org/', 'https://www.ticketmaster.com/apollo-theater-new-york-tickets/artist/736365'], address: '253 W 125th St New York NY 10027', file: 'apollo-theater.js' },
  { name: 'Brooklyn Academy of Music', urls: ['https://www.bam.org/', 'https://www.brooklyn.cuny.edu/web/arts/bam.php'], address: '30 Lafayette Ave Brooklyn NY 11217', file: 'brooklyn-academy-music.js' },
  { name: 'Forest Hills Stadium', urls: ['https://foresthillsstadium.com/', 'https://www.msg.com/forest-hills-stadium'], address: '1 Tennis Pl Queens NY 11375', file: 'forest-hills-stadium.js' },
  { name: 'Hammerstein Ballroom', urls: ['https://www.msg.com/calendar', 'https://www.axs.com/venues/103396/hammerstein-ballroom-tickets'], address: '311 W 34th St New York NY 10001', file: 'hammerstein-ballroom.js' },
  { name: 'Lincoln Center Festival', urls: ['https://www.lincolncenter.org/series/lincoln-center-festival', 'https://www.lincolncenter.org/lincoln-center-at-home'], address: '10 Lincoln Center Plaza New York NY 10023', file: 'lincoln-center-festival.js' },
  { name: 'LiveNation NYC', urls: ['https://www.livenation.com/city/new-york-ny/12814/concert-tickets', 'https://concerts.livenation.com/new-york-new-york-events'], address: 'Various NYC Venues', file: 'livenation-nyc.js' },
  { name: 'Moynihan Train Hall', urls: ['https://www.msg.com/events', 'https://www.eventbrite.com/d/ny--new-york/moynihan-train-hall/'], address: '421 8th Ave New York NY 10001', file: 'moynihan-train-hall.js' },
  { name: 'NYC Fashion Week', urls: ['https://www.nyfw.com/', 'https://fashionweekdates.com/new-york-fashion-week-dates/'], address: 'Various NYC Locations', file: 'nyc-fashion-week.js' },
  { name: 'SOBs', urls: ['https://www.sobs.com/calendar/', 'https://www.ticketweb.com/venue/sobs-new-york-ny/62'], address: '204 Varick St New York NY 10014', file: 'sobs.js' },
  { name: 'Webster Hall', urls: ['https://www.websterhall.com/events/', 'https://www.axs.com/venues/100654/webster-hall-tickets'], address: '125 E 11th St New York NY 10003', file: 'webster-hall.js' },
  { name: 'Music Hall of Williamsburg', urls: ['https://www.musichallofwilliamsburg.com/events', 'https://www.boweryballroom.com/venue/music-hall-of-williamsburg'], address: '66 N 6th St Brooklyn NY 11249', file: 'music-hall-williamsburg.js' },
  { name: 'Barclays Center', urls: ['https://www.barclayscenter.com/events', 'https://www.ticketmaster.com/barclays-center-tickets-brooklyn/venue/400320'], address: '620 Atlantic Ave Brooklyn NY 11217', file: 'barclays-center.js' },
  { name: 'Brooklyn Bowl', urls: ['https://www.brooklynbowl.com/new-york/events/', 'https://www.ticketmaster.com/brooklyn-bowl-tickets-brooklyn/venue/238799'], address: '61 Wythe Ave Brooklyn NY 11249', file: 'scrape-brooklyn-bowl.js' }
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
                       response.data.toLowerCase().includes('show') ||
                       response.data.toLowerCase().includes('ticket');
      return { status: 'success', code: 200, hasEvents };
    }
    return { status: 'failed', code: response.status };
  } catch (error) {
    return { status: 'failed', error: error.code || error.message.substring(0, 30) };
  }
}

async function researchRemaining() {
  console.log('🔍 Researching remaining NYC venues...\n');
  
  const results = [];
  
  for (const venue of remainingNYCVenues) {
    console.log(`📍 ${venue.name}`);
    let bestUrl = null;
    
    for (const url of venue.urls) {
      const result = await testUrl(url);
      const status = result.status === 'success' ? '✅' : '❌';
      const extra = result.hasEvents ? ' [EVENTS]' : '';
      console.log(`   ${url.substring(0, 50)}... - ${status} ${result.code || result.error}${extra}`);
      
      if (result.status === 'success' && !bestUrl) {
        bestUrl = url;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (bestUrl) {
      console.log(`   🎯 ${bestUrl}\n`);
      results.push({ ...venue, workingUrl: bestUrl });
    } else {
      console.log(`   ⚠️  No working URL\n`);
    }
  }
  
  console.log(`\n✅ Found ${results.length}/${remainingNYCVenues.length} working URLs`);
  
  const fs = require('fs');
  fs.writeFileSync('NYC_REMAINING.json', JSON.stringify(results, null, 2));
  
  return results;
}

researchRemaining().catch(console.error);
