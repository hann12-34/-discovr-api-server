/**
 * Boost Events for Low-Count Cities
 * Target: Seattle, LA, Montreal - minimum 190 events each
 * Gets events from ALL available scrapers
 */

const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// ========== SEATTLE VENUES ==========
const SEATTLE_VENUES = {
  'The Showbox': { address: '1426 1st Ave, Seattle, WA 98101', lat: 47.6085, lng: -122.3402 },
  'Showbox SoDo': { address: '1700 1st Ave S, Seattle, WA 98134', lat: 47.5802, lng: -122.3342 },
  'Neumos': { address: '925 E Pike St, Seattle, WA 98122', lat: 47.6143, lng: -122.3203 },
  'The Crocodile': { address: '2505 1st Ave, Seattle, WA 98121', lat: 47.6156, lng: -122.3478 },
  'Tractor Tavern': { address: '5213 Ballard Ave NW, Seattle, WA 98107', lat: 47.6656, lng: -122.3845 },
  'Nectar Lounge': { address: '412 N 36th St, Seattle, WA 98103', lat: 47.6519, lng: -122.3505 },
  'Kremwerk': { address: '1809 Minor Ave, Seattle, WA 98101', lat: 47.6178, lng: -122.3319 },
  'The Neptune': { address: '1303 NE 45th St, Seattle, WA 98105', lat: 47.6614, lng: -122.3142 },
  'The Paramount': { address: '911 Pine St, Seattle, WA 98101', lat: 47.6133, lng: -122.3314 },
  'The Moore': { address: '1932 2nd Ave, Seattle, WA 98101', lat: 47.6117, lng: -122.3414 },
  'Climate Pledge Arena': { address: '334 1st Ave N, Seattle, WA 98109', lat: 47.6221, lng: -122.3540 },
  'Chop Suey': { address: '1325 E Madison St, Seattle, WA 98122', lat: 47.6152, lng: -122.3133 },
  'Barboza': { address: '925 E Pike St, Seattle, WA 98122', lat: 47.6143, lng: -122.3203 },
  'High Dive': { address: '513 N 36th St, Seattle, WA 98103', lat: 47.6519, lng: -122.3505 },
  'The Vera Project': { address: '305 Harrison St, Seattle, WA 98109', lat: 47.6218, lng: -122.3517 },
  'Clock-Out Lounge': { address: '4864 Beacon Ave S, Seattle, WA 98108', lat: 47.5558, lng: -122.3065 },
  'Ora': { address: '616 1st Ave N, Seattle, WA 98109', lat: 47.6240, lng: -122.3553 },
  'Q Nightclub': { address: '1426 2nd Ave, Seattle, WA 98101', lat: 47.6088, lng: -122.3412 },
  'Foundation': { address: '2218 NW Market St, Seattle, WA 98107', lat: 47.6688, lng: -122.3854 }
};

// ========== LA VENUES ==========
const LA_VENUES = {
  'Academy LA': { address: '6021 Hollywood Blvd, Los Angeles, CA 90028', lat: 34.1017, lng: -118.3194 },
  'Exchange LA': { address: '618 S Spring St, Los Angeles, CA 90014', lat: 34.0453, lng: -118.2509 },
  'Avalon Hollywood': { address: '1735 Vine St, Los Angeles, CA 90028', lat: 34.1026, lng: -118.3268 },
  'Sound Nightclub': { address: '1642 N Las Palmas Ave, Los Angeles, CA 90028', lat: 34.1011, lng: -118.3344 },
  'Hollywood Bowl': { address: '2301 N Highland Ave, Los Angeles, CA 90068', lat: 34.1122, lng: -118.3391 },
  'Greek Theatre': { address: '2700 N Vermont Ave, Los Angeles, CA 90027', lat: 34.1195, lng: -118.2966 },
  'The Wiltern': { address: '3790 Wilshire Blvd, Los Angeles, CA 90010', lat: 34.0612, lng: -118.3099 },
  'The Roxy': { address: '9009 W Sunset Blvd, West Hollywood, CA 90069', lat: 34.0903, lng: -118.3889 },
  'Troubadour': { address: '9081 N Santa Monica Blvd, West Hollywood, CA 90069', lat: 34.0817, lng: -118.3893 },
  'El Rey Theatre': { address: '5515 Wilshire Blvd, Los Angeles, CA 90036', lat: 34.0621, lng: -118.3482 },
  'The Fonda': { address: '6126 Hollywood Blvd, Los Angeles, CA 90028', lat: 34.1017, lng: -118.3231 },
  'Hollywood Palladium': { address: '6215 Sunset Blvd, Los Angeles, CA 90028', lat: 34.0981, lng: -118.3206 },
  'The Echo': { address: '1822 Sunset Blvd, Los Angeles, CA 90026', lat: 34.0774, lng: -118.2604 },
  'Echoplex': { address: '1154 Glendale Blvd, Los Angeles, CA 90026', lat: 34.0774, lng: -118.2604 },
  'The Novo': { address: '800 W Olympic Blvd, Los Angeles, CA 90015', lat: 34.0449, lng: -118.2660 },
  'The Forum': { address: '3900 W Manchester Blvd, Inglewood, CA 90305', lat: 33.9583, lng: -118.3419 },
  'Crypto.com Arena': { address: '1111 S Figueroa St, Los Angeles, CA 90015', lat: 34.0430, lng: -118.2673 },
  'Lodge Room': { address: '104 N Ave 56, Los Angeles, CA 90042', lat: 34.1110, lng: -118.1889 },
  'Moroccan Lounge': { address: '901 E 1st St, Los Angeles, CA 90012', lat: 34.0486, lng: -118.2372 },
  'Zebulon': { address: '2478 Fletcher Dr, Los Angeles, CA 90039', lat: 34.0975, lng: -118.2492 },
  'The Abbey': { address: '692 N Robertson Blvd, West Hollywood, CA 90069', lat: 34.0854, lng: -118.3853 },
  'Create Nightclub': { address: '6021 Hollywood Blvd, Los Angeles, CA 90028', lat: 34.1017, lng: -118.3194 },
  'Union': { address: '4067 W Pico Blvd, Los Angeles, CA 90019', lat: 34.0477, lng: -118.3263 },
  'Shrine Auditorium': { address: '665 W Jefferson Blvd, Los Angeles, CA 90007', lat: 34.0246, lng: -118.2830 },
  'Teragram Ballroom': { address: '1234 W 7th St, Los Angeles, CA 90017', lat: 34.0520, lng: -118.2647 },
  'Regent Theater': { address: '448 S Main St, Los Angeles, CA 90013', lat: 34.0476, lng: -118.2493 },
  '1720': { address: '1720 E 16th St, Los Angeles, CA 90021', lat: 34.0221, lng: -118.2375 },
  'Daisy': { address: '7001 Santa Monica Blvd, West Hollywood, CA 90038', lat: 34.0905, lng: -118.3447 },
  'Catch One': { address: '4067 W Pico Blvd, Los Angeles, CA 90019', lat: 34.0477, lng: -118.3263 },
  'DO LA': { address: '1613 N Cahuenga Blvd, Los Angeles, CA 90028', lat: 34.0999, lng: -118.3290 }
};

// ========== MONTREAL VENUES ==========
const MONTREAL_VENUES = {
  'Bell Centre': { address: '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0', lat: 45.4961, lng: -73.5693 },
  'Place des Arts': { address: '175 Rue Sainte-Catherine O, Montreal, QC H2X 1Y9', lat: 45.5081, lng: -73.5668 },
  'MTELUS': { address: '59 Rue Sainte-Catherine E, Montreal, QC H2X 1K5', lat: 45.5115, lng: -73.5625 },
  'New City Gas': { address: '950 Rue Ottawa, Montreal, QC H3C 1S4', lat: 45.4963, lng: -73.5487 },
  'Stereo': { address: '858 Rue Sainte-Catherine E, Montreal, QC H2L 2E5', lat: 45.5175, lng: -73.5505 },
  'Foufounes Électriques': { address: '87 Rue Sainte-Catherine E, Montreal, QC H2X 1K3', lat: 45.5110, lng: -73.5603 },
  'Theatre St-Denis': { address: '1594 Rue Saint-Denis, Montreal, QC H2X 3K4', lat: 45.5167, lng: -73.5617 },
  'L\'Olympia': { address: '1004 Rue Sainte-Catherine E, Montreal, QC H2L 2G2', lat: 45.5187, lng: -73.5479 },
  'Corona Theatre': { address: '2490 Rue Notre-Dame O, Montreal, QC H3J 1N5', lat: 45.4763, lng: -73.5807 },
  'La Tulipe': { address: '4530 Av Papineau, Montreal, QC H2H 1V3', lat: 45.5330, lng: -73.5756 },
  'Club Soda': { address: '1225 Boul Saint-Laurent, Montreal, QC H2X 2S6', lat: 45.5098, lng: -73.5631 },
  'Le National': { address: '1220 Rue Sainte-Catherine E, Montreal, QC H2L 2H2', lat: 45.5203, lng: -73.5445 },
  'Casa del Popolo': { address: '4873 Boul Saint-Laurent, Montreal, QC H2T 1R6', lat: 45.5249, lng: -73.5887 },
  'Bar Le Ritz PDB': { address: '179 Rue Jean-Talon O, Montreal, QC H2R 2X2', lat: 45.5356, lng: -73.6215 },
  'Le Belmont': { address: '4483 Boul Saint-Laurent, Montreal, QC H2W 1Z8', lat: 45.5214, lng: -73.5861 },
  'Turbo Haüs': { address: '2040 Rue Saint-Denis, Montreal, QC H2X 3K7', lat: 45.5171, lng: -73.5615 },
  'Datcha': { address: '98 Av Laurier O, Montreal, QC H2T 2N4', lat: 45.5230, lng: -73.5989 },
  'Beachclub': { address: '36 Bd Ste-Rose, Laval, QC H7L 1K3', lat: 45.6153, lng: -73.7825 },
  'Comedy Nest': { address: '2313 Rue Sainte-Catherine O, Montreal, QC H3H 1N2', lat: 45.4904, lng: -73.5835 },
  'Théâtre Maisonneuve': { address: '175 Rue Sainte-Catherine O, Montreal, QC H2X 1Y9', lat: 45.5081, lng: -73.5668 },
  'Stade Olympique': { address: '4545 Av Pierre-De Coubertin, Montreal, QC H1V 0B2', lat: 45.5579, lng: -73.5516 }
};

async function scrapeSTGPresents(browser) {
  console.log('  Scraping STG Presents (Seattle)...');
  const events = [];
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto('https://www.stgpresents.org/calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const pageEvents = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('.event, article, [class*="event"]').forEach(el => {
        const title = el.querySelector('h2, h3, .title')?.textContent?.trim();
        const dateText = el.querySelector('.date, time')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        const img = el.querySelector('img')?.src;
        const venue = el.textContent.includes('Neptune') ? 'The Neptune' :
                      el.textContent.includes('Paramount') ? 'The Paramount' :
                      el.textContent.includes('Moore') ? 'The Moore' : 'STG Venue';
        
        if (title && title.length > 3) {
          results.push({ title, dateText, link, img, venue });
        }
      });
      return results;
    });
    
    events.push(...pageEvents.map(e => ({...e, city: 'Seattle', source: 'STG Presents'})));
    await page.close();
  } catch (e) {
    console.log('    STG error:', e.message);
  }
  
  return events;
}

async function scrapeAxsVenue(browser, venueId, venueName, city, venueInfo) {
  console.log(`  Scraping ${venueName}...`);
  const events = [];
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto(`https://www.axs.com/venues/${venueId}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const pageEvents = await page.evaluate((vn) => {
      const results = [];
      document.querySelectorAll('[class*="event"], article').forEach(el => {
        const title = el.querySelector('h2, h3, .title, a')?.textContent?.trim();
        const dateText = el.querySelector('.date, time, [class*="date"]')?.textContent?.trim();
        const link = el.querySelector('a')?.href;
        const img = el.querySelector('img')?.src;
        
        if (title && title.length > 3) {
          results.push({ title, dateText, link, img, venue: vn });
        }
      });
      return results;
    }, venueName);
    
    events.push(...pageEvents.map(e => ({...e, city, source: venueName, venueInfo})));
    await page.close();
  } catch (e) {}
  
  return events;
}

async function scrapeResidentAdvisor(city, region) {
  console.log(`  Scraping Resident Advisor (${city})...`);
  const events = [];
  
  try {
    const response = await axios.get(`https://ra.co/events/${region}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('article, [class*="event"], li[class*="Event"]').each((i, el) => {
      const title = $(el).find('h3, h4, .title, a').first().text().trim();
      const venue = $(el).find('.venue, [class*="venue"]').first().text().trim();
      const dateText = $(el).find('.date, time').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      const img = $(el).find('img').first().attr('src');
      
      if (title && title.length > 3) {
        events.push({ title, venue: venue || 'Various', dateText, link, img, city, source: 'Resident Advisor' });
      }
    });
  } catch (e) {}
  
  return events;
}

async function scrapeSongkick(city, metroId) {
  console.log(`  Scraping Songkick (${city})...`);
  const events = [];
  
  try {
    const response = await axios.get(`https://www.songkick.com/metro-areas/${metroId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('[class*="event"], article, .event-listing').each((i, el) => {
      const title = $(el).find('a strong, .artist-name, h3').first().text().trim();
      const venue = $(el).find('.venue-name, [class*="venue"]').first().text().trim();
      const dateText = $(el).find('.date, time').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      
      if (title && title.length > 3) {
        events.push({ title, venue: venue || city, dateText, link, city, source: 'Songkick' });
      }
    });
  } catch (e) {}
  
  return events;
}

async function scrapeBandsInTown(city) {
  console.log(`  Scraping Bandsintown (${city})...`);
  const events = [];
  
  try {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const response = await axios.get(`https://www.bandsintown.com/c/${citySlug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    $('[class*="Event"], article').each((i, el) => {
      const title = $(el).find('.event-name, h3, a').first().text().trim();
      const venue = $(el).find('.venue, [class*="venue"]').first().text().trim();
      const dateText = $(el).find('.date, time').first().text().trim();
      const img = $(el).find('img').first().attr('src');
      
      if (title && title.length > 3) {
        events.push({ title, venue: venue || city, dateText, img, city, source: 'Bandsintown' });
      }
    });
  } catch (e) {}
  
  return events;
}

function parseDate(dateText) {
  if (!dateText) return null;
  
  const months = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  // Try various date patterns
  const patterns = [
    /(\w{3})\s+(\d{1,2}),?\s*(\d{4})?/i,  // Dec 15, 2025
    /(\d{1,2})\s+(\w{3})\s*(\d{4})?/i,    // 15 Dec 2025
    /(\d{4})-(\d{2})-(\d{2})/             // 2025-12-15
  ];
  
  for (const pattern of patterns) {
    const match = dateText.match(pattern);
    if (match) {
      if (pattern === patterns[2]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      const monthStr = match[1].toLowerCase().substring(0, 3);
      const month = months[monthStr];
      if (month) {
        const day = (match[2] || '01').padStart(2, '0');
        const year = match[3] || '2025';
        return `${year}-${month}-${day}`;
      }
    }
  }
  
  return null;
}

async function boostCities() {
  console.log('🚀 BOOSTING EVENTS FOR LOW CITIES\n');
  console.log('Target: Seattle, LA, Montreal - minimum 190 events each\n');
  
  const client = new MongoClient(MONGODB_URI);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    await client.connect();
    const collection = client.db('discovr').collection('events');
    
    const allNewEvents = [];
    
    // ========== SEATTLE ==========
    console.log('\n📍 SEATTLE:');
    const seattleEvents = [];
    
    // STG Presents
    seattleEvents.push(...await scrapeSTGPresents(browser));
    
    // Resident Advisor
    seattleEvents.push(...await scrapeResidentAdvisor('Seattle', 'us/seattle'));
    
    // Songkick
    seattleEvents.push(...await scrapeSongkick('Seattle', '2846-us-seattle'));
    
    // Bandsintown
    seattleEvents.push(...await scrapeBandsInTown('Seattle'));
    
    console.log(`  Found ${seattleEvents.length} Seattle events`);
    allNewEvents.push(...seattleEvents);
    
    // ========== LOS ANGELES ==========
    console.log('\n📍 LOS ANGELES:');
    const laEvents = [];
    
    // Resident Advisor
    laEvents.push(...await scrapeResidentAdvisor('Los Angeles', 'us/losangeles'));
    
    // Songkick
    laEvents.push(...await scrapeSongkick('Los Angeles', '17835-us-los-angeles'));
    
    // Bandsintown
    laEvents.push(...await scrapeBandsInTown('Los Angeles'));
    
    console.log(`  Found ${laEvents.length} LA events`);
    allNewEvents.push(...laEvents);
    
    // ========== MONTREAL ==========
    console.log('\n📍 MONTREAL:');
    const montrealEvents = [];
    
    // Resident Advisor
    montrealEvents.push(...await scrapeResidentAdvisor('Montreal', 'ca/montreal'));
    
    // Songkick  
    montrealEvents.push(...await scrapeSongkick('Montreal', '27399-canada-montreal'));
    
    // Bandsintown
    montrealEvents.push(...await scrapeBandsInTown('Montreal'));
    
    console.log(`  Found ${montrealEvents.length} Montreal events`);
    allNewEvents.push(...montrealEvents);
    
    // ========== PROCESS AND SAVE ==========
    console.log(`\n📝 Processing ${allNewEvents.length} total events...`);
    
    const venueMap = { ...SEATTLE_VENUES, ...LA_VENUES, ...MONTREAL_VENUES };
    let saved = 0;
    let skipped = 0;
    
    for (const event of allNewEvents) {
      // Parse date
      const date = parseDate(event.dateText);
      if (!date) {
        skipped++;
        continue;
      }
      
      // Check for duplicate
      const existing = await collection.findOne({
        title: event.title,
        city: event.city,
        date: date
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Get venue info
      let venueInfo = venueMap[event.venue];
      if (!venueInfo) {
        // Try to match venue name
        for (const [name, info] of Object.entries(venueMap)) {
          if (event.venue?.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(event.venue?.toLowerCase())) {
            venueInfo = info;
            break;
          }
        }
      }
      
      // Default venue info by city
      if (!venueInfo) {
        if (event.city === 'Seattle') {
          venueInfo = SEATTLE_VENUES['The Showbox'];
        } else if (event.city === 'Los Angeles') {
          venueInfo = LA_VENUES['The Fonda'];
        } else {
          venueInfo = MONTREAL_VENUES['MTELUS'];
        }
      }
      
      const newEvent = {
        id: uuidv4(),
        title: event.title,
        date: date,
        startDate: new Date(date + 'T12:00:00.000Z'),
        url: event.link || '',
        image: event.img || null,
        imageURL: event.img || null,
        venue: {
          name: event.venue || event.source,
          address: venueInfo.address,
          city: event.city
        },
        latitude: venueInfo.lat,
        longitude: venueInfo.lng,
        city: event.city,
        category: 'Entertainment',
        source: event.source,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await collection.insertOne(newEvent);
      saved++;
    }
    
    console.log(`\n✅ Saved ${saved} new events (skipped ${skipped} duplicates/invalid)`);
    
    // Final counts
    console.log('\n📊 FINAL COUNTS:');
    for (const city of ['Seattle', 'Los Angeles', 'Montreal']) {
      const count = await collection.countDocuments({ city });
      const status = count >= 190 ? '✅' : '⚠️';
      console.log(`${status} ${city}: ${count} events`);
    }
    
  } finally {
    await browser.close();
    await client.close();
  }
}

boostCities().catch(console.error);
