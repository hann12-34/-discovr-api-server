const axios = require('axios');
const fs = require('fs');

// Comprehensive NYC venue research - major venues with known event pages
const venues = [
  { file: 'scrape-beacon-theatre.js', name: 'Beacon Theatre', url: 'https://www.msg.com/the-beacon-theatre' },
  { file: 'scrape-brooklyn-museum.js', name: 'Brooklyn Museum', url: 'https://www.brooklynmuseum.org/exhibitions' },
  { file: 'scrape-central-park-summerstage.js', name: 'SummerStage', url: 'https://www.summerstage.org/' },
  { file: 'scrape-guggenheim.js', name: 'Guggenheim', url: 'https://www.guggenheim.org/exhibitions' },
  { file: 'scrape-metropolitan-museum.js', name: 'The Met', url: 'https://www.metmuseum.org/events' },
  { file: 'scrape-moma.js', name: 'MoMA', url: 'https://www.moma.org/calendar/' },
  { file: 'scrape-natural-history-museum.js', name: 'Natural History Museum', url: 'https://www.amnh.org/exhibitions' },
  { file: 'scrape-whitney-museum.js', name: 'Whitney Museum', url: 'https://whitney.org/exhibitions' },
  { file: 'scrape-brooklyn-botanic-garden.js', name: 'Brooklyn Botanic Garden', url: 'https://www.bbg.org/visit/event_calendar' },
  { file: 'scrape-prospect-park-bandshell.js', name: 'Prospect Park Bandshell', url: 'https://www.bricartsmedia.org/celebrate-brooklyn' },
  { file: 'scrape-union-square-events.js', name: 'Union Square', url: 'https://www.unionsquarenyc.org/events' },
  { file: 'scrape-south-street-seaport.js', name: 'South Street Seaport', url: 'https://southstreetseaport.com/events/' },
  { file: 'scrape-intrepid-museum.js', name: 'Intrepid Museum', url: 'https://www.intrepidmuseum.org/events' },
  { file: 'scrape-jazz-standard.js', name: 'Jazz Standard', url: 'https://www.jazzstandard.com/' },
  { file: 'scrape-village-vanguard.js', name: 'Village Vanguard', url: 'https://villagevanguard.com/' },
  { file: 'scrape-smalls-jazz-club.js', name: 'Smalls Jazz Club', url: 'https://www.smallslive.com/' },
  { file: 'scrape-rockwood-music.js', name: 'Rockwood Music Hall', url: 'https://www.rockwoodmusichall.com/calendar' },
  { file: 'scrape-littlefield.js', name: 'Littlefield', url: 'https://littlefieldnyc.com/' },
  { file: 'scrape-berlin-nyc.js', name: 'Berlin', url: 'https://www.berlinnyc.com/' },
  { file: 'scrape-nublu.js', name: 'Nublu', url: 'https://www.nublu.net/' }
];

async function testUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return { status: 'success', code: 200 };
  } catch (error) {
    return { status: 'failed', error: error.code || error.message.substring(0, 30) };
  }
}

async function research() {
  console.log('🔍 Researching NYC venue URLs...\n');
  const working = [];
  
  for (const venue of venues) {
    const result = await testUrl(venue.url);
    if (result.status === 'success') {
      console.log(`✅ ${venue.name} → ${venue.url}`);
      working.push(venue);
    } else {
      console.log(`❌ ${venue.name} → ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n✅ Found ${working.length}/${venues.length} working URLs`);
  fs.writeFileSync('NYC_MORE_WORKING.json', JSON.stringify(working, null, 2));
  return working;
}

research().catch(console.error);
