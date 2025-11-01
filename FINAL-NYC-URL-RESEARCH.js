const axios = require('axios');
const fs = require('fs');

// Final comprehensive NYC venue URL research
const venueUrls = [
  { file: 'scrape-92y.js', name: '92nd Street Y', url: 'https://www.92ny.org/event' },
  { file: 'scrape-bell-house.js', name: 'The Bell House', url: 'https://www.thebellhouseny.com/events' },
  { file: 'scrape-birdland-jazz.js', name: 'Birdland Jazz', url: 'https://www.birdlandjazz.com/events' },
  { file: 'scrape-blue-note.js', name: 'Blue Note', url: 'https://www.bluenote.net/newyork/events' },
  { file: 'scrape-bryant-park.js', name: 'Bryant Park', url: 'https://bryantpark.org/events' },
  { file: 'scrape-city-winery.js', name: 'City Winery', url: 'https://citywinery.com/newyork/events' },
  { file: 'scrape-gramercy-theatre.js', name: 'Gramercy Theatre', url: 'https://www.gramercytheatre.com/events' },
  { file: 'scrape-joe-s-pub.js', name: 'Joes Pub', url: 'https://publictheater.org/programs/joes-pub/calendar/' },
  { file: 'scrape-knitting-factory.js', name: 'Knitting Factory', url: 'https://bk.knittingfactory.com/calendar/' },
  { file: 'scrape-public-theater.js', name: 'Public Theater', url: 'https://publictheater.org/productions/' }
];

async function testUrls() {
  console.log('🔍 Testing venue URLs...\n');
  const working = [];
  
  for (const venue of venueUrls) {
    try {
      const response = await axios.get(venue.url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${venue.name} - ${venue.url}`);
        working.push(venue);
      } else {
        console.log(`❌ ${venue.name} - Status ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ ${venue.name} - ${e.code || e.message.substring(0, 30)}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✅ ${working.length}/${venueUrls.length} URLs working`);
  fs.writeFileSync('NYC_WORKING_URLS.json', JSON.stringify(working, null, 2));
  return working;
}

testUrls().catch(console.error);
