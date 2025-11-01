const axios = require('axios');

// Research ALL NYC venues that need working URLs
const nycVenues = [
  { name: 'Apollo Theater', urls: ['https://www.apollotheater.org/events/', 'https://www.ticketmaster.com/apollo-theater-tickets-new-york/venue/83976'], address: '253 W 125th St New York NY 10027' },
  { name: 'Brooklyn Academy of Music', urls: ['https://www.bam.org/whats-on', 'https://www.bam.org/events'], address: '30 Lafayette Ave Brooklyn NY 11217' },
  { name: 'Brooklyn Steel', urls: ['https://www.brooklynsteel.com/', 'https://www.ticketmaster.com/brooklyn-steel-tickets-brooklyn/venue/477967'], address: '319 Frost St Brooklyn NY 11222' },
  { name: 'Brooklyn Mirage', urls: ['https://avantgardner.com/events/', 'https://www.ticketmaster.com/the-brooklyn-mirage-tickets-brooklyn/venue/477968'], address: '140 Stewart Ave Brooklyn NY 11237' },
  { name: 'Carnegie Hall', urls: ['https://www.carnegiehall.org/calendar', 'https://www.ticketmaster.com/carnegie-hall-tickets-new-york/venue/83929'], address: '881 7th Ave New York NY 10019' },
  { name: 'Citi Field', urls: ['https://www.mlb.com/mets/tickets', 'https://www.ticketmaster.com/citi-field-tickets-flushing/venue/182341'], address: '123-01 Roosevelt Ave Queens NY 11368' },
  { name: 'Comedy Cellar', urls: ['https://www.comedycellar.com/shows/', 'https://www.comedycellar.com/'], address: '117 MacDougal St New York NY 10012' },
  { name: 'Forest Hills Stadium', urls: ['https://foresthillsstadium.com/events/', 'https://www.ticketmaster.com/forest-hills-stadium-tickets-forest-hills/venue/83962'], address: '1 Tennis Pl Queens NY 11375' },
  { name: 'Governors Ball', urls: ['https://www.governorsballmusicfestival.com/', 'https://www.ticketmaster.com/governors-ball-music-festival-tickets/artist/1714606'], address: 'Flushing Meadows Corona Park Queens NY 11368' },
  { name: 'Hammerstein Ballroom', urls: ['https://www.mcstudios.com/hammerstein-ballroom', 'https://www.ticketmaster.com/hammerstein-ballroom-tickets-new-york/venue/83951'], address: '311 W 34th St New York NY 10001' },
  { name: 'Javits Center', urls: ['https://www.javitscenter.com/events/', 'https://www.javitscenter.com/'], address: '429 11th Ave New York NY 10001' },
  { name: 'Lincoln Center', urls: ['https://www.lincolncenter.org/whats-on', 'https://www.lincolncenter.org/'], address: '10 Lincoln Center Plaza New York NY 10023' },
  { name: 'Madison Square Garden', urls: ['https://www.msg.com/calendar', 'https://www.ticketmaster.com/madison-square-garden-tickets-new-york/venue/83959'], address: '4 Pennsylvania Plaza New York NY 10001' },
  { name: 'Pier 17', urls: ['https://www.pier17ny.com/events/', 'https://www.pier17ny.com/'], address: '89 South St New York NY 10038' },
  { name: 'PlayStation Theater', urls: ['https://www.msg.com/theatre-at-msg', 'https://www.ticketmaster.com/playstation-theater-tickets-new-york/venue/237854'], address: '1515 Broadway New York NY 10036' },
  { name: 'Radio City Music Hall', urls: ['https://www.msg.com/radio-city-music-hall', 'https://www.ticketmaster.com/radio-city-music-hall-tickets-new-york/venue/83939'], address: '1260 6th Ave New York NY 10020' },
  { name: 'Summit One Vanderbilt', urls: ['https://summitov.com/', 'https://summitov.com/tickets/'], address: 'One Vanderbilt Ave New York NY 10017' },
  { name: 'Times Square', urls: ['https://www.timessquarenyc.org/events', 'https://www.eventbrite.com/d/ny--new-york/times-square/'], address: 'Times Square New York NY 10036' },
  { name: 'Yankee Stadium', urls: ['https://www.mlb.com/yankees/tickets', 'https://www.ticketmaster.com/yankee-stadium-tickets-bronx/venue/83976'], address: '1 E 161st St Bronx NY 10451' },
  { name: 'Brookfield Place', urls: ['https://brookfieldplaceny.com/events/', 'https://brookfieldplaceny.com/'], address: '230 Vesey St New York NY 10281' }
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

async function researchAllNYCVenues() {
  console.log('='.repeat(60));
  console.log('🔍 RESEARCHING ALL NYC VENUES');
  console.log('='.repeat(60));
  console.log('');
  
  const results = [];
  
  for (const venue of nycVenues) {
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
  
  console.log('='.repeat(60));
  console.log(`✅ Found: ${results.length}/${nycVenues.length} working venue URLs`);
  console.log('='.repeat(60));
  
  const fs = require('fs');
  fs.writeFileSync('NYC_VENUES_RESEARCH.json', JSON.stringify(results, null, 2));
  console.log('💾 Saved to NYC_VENUES_RESEARCH.json');
  
  return results;
}

researchAllNYCVenues().catch(console.error);
