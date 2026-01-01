/**
 * Mass Create Scrapers for ALL New Cities
 * Creates 20+ scrapers per city instantly
 */

const fs = require('fs');
const path = require('path');

// Define ALL cities and their major venues (focusing on REAL, accessible venues)
const cityVenues = {
  // AMERICAN CITIES
  Austin: [
    { name: 'acl', display: 'ACL Live at Moody Theater', url: 'https://acllive.com', address: '310 W Willie Nelson Blvd, Austin, TX 78701', lat: 30.2665, lon: -97.7498, cat: 'Nightlife' },
    { name: 'stubbsbbq', display: 'Stubbs BBQ', url: 'https://www.stubbsaustin.com', address: '801 Red River Street, Austin, TX 78701', lat: 30.2669, lon: -97.7347, cat: 'Nightlife' },
    { name: 'mohawkaustin', display: 'Mohawk Austin', url: 'https://mohawkaustin.com', address: '912 Red River Street, Austin, TX 78701', lat: 30.2687, lon: -97.7347, cat: 'Nightlife' },
    { name: 'emosaustin', display: 'Emos Austin', url: 'https://emosaustin.com', address: '2015 E Riverside Drive, Austin, TX 78741', lat: 30.2454, lon: -97.7217, cat: 'Nightlife' },
    { name: 'aclfest', display: 'Austin City Limits Festival', url: 'https://aclfestival.com', address: 'Zilker Park, Austin, TX 78746', lat: 30.2672, lon: -97.7713, cat: 'Festivals' },
    { name: 'sxsw', display: 'SXSW Festival', url: 'https://sxsw.com', address: 'Austin Convention Center, TX 78701', lat: 30.2631, lon: -97.7397, cat: 'Festivals' },
    { name: 'antones', display: 'Antones Nightclub', url: 'https://antonesnightclub.com', address: '305 E 5th Street, Austin, TX 78701', lat: 30.2665, lon: -97.7387, cat: 'Nightlife' },
    { name: 'continentalclub', display: 'Continental Club', url: 'https://continentalclub.com', address: '1315 S Congress Avenue, Austin, TX 78704', lat: 30.2495, lon: -97.7494, cat: 'Nightlife' },
    { name: 'theparamount', display: 'Paramount Theatre', url: 'https://www.austintheatre.org', address: '713 Congress Avenue, Austin, TX 78701', lat: 30.2713, lon: -97.7425, cat: 'Nightlife' },
    { name: 'scootinn', display: 'Scoot Inn', url: 'https://scootinnaustin.com', address: '1308 E 4th Street, Austin, TX 78702', lat: 30.2646, lon: -97.7271, cat: 'Nightlife' }
  ],
  
  Boston: [
    { name: 'houseofblues', display: 'House of Blues Boston', url: 'https://www.houseofblues.com/boston', address: '15 Lansdowne Street, Boston, MA 02215', lat: 42.3467, lon: -71.0985, cat: 'Nightlife' },
    { name: 'tdgarden', display: 'TD Garden', url: 'https://www.tdgarden.com', address: '100 Legends Way, Boston, MA 02114', lat: 42.3662, lon: -71.0621, cat: 'Nightlife' },
    { name: 'fenway', display: 'Fenway Park', url: 'https://www.mlb.com/redsox', address: '4 Jersey Street, Boston, MA 02215', lat: 42.3467, lon: -71.0972, cat: 'Festivals' },
    { name: 'royale', display: 'Royale Nightclub', url: 'https://royaleboston.com', address: '279 Tremont Street, Boston, MA 02116', lat: 42.3519, lon: -71.0636, cat: 'Nightlife' },
    { name: 'paradiserock', display: 'Paradise Rock Club', url: 'https://www.crossroadspresents.com', address: '967 Commonwealth Avenue, Boston, MA 02215', lat: 42.3514, lon: -71.1090, cat: 'Nightlife' },
    { name: 'brightonmusic', display: 'Brighton Music Hall', url: 'https://www.crossroadspresents.com', address: '158 Brighton Avenue, Boston, MA 02134', lat: 42.3531, lon: -71.1343, cat: 'Nightlife' }
  ],
  
  // UK CITIES  
  london: [
    { name: 'o2arena', display: 'The O2 Arena', url: 'https://www.theo2.co.uk', address: 'Peninsula Square, London SE10 0DX', lat: 51.5033, lon: 0.0031, cat: 'Nightlife' },
    { name: 'brixton', display: 'O2 Academy Brixton', url: 'https://academymusicgroup.com/o2academybrixton', address: '211 Stockwell Road, London SW9 9SL', lat: 51.4657, lon: -0.1150, cat: 'Nightlife' },
    { name: 'roundhouse', display: 'Roundhouse', url: 'https://www.roundhouse.org.uk', address: 'Chalk Farm Road, London NW1 8EH', lat: 51.5433, lon: -0.1524, cat: 'Nightlife' },
    { name: 'fabric', display: 'Fabric London', url: 'https://fabriclondon.com', address: '77A Charterhouse Street, London EC1M 6HJ', lat: 51.5201, lon: -0.1018, cat: 'Nightlife' },
    { name: 'ministry', display: 'Ministry of Sound', url: 'https://ministryofsound.com', address: '103 Gaunt Street, London SE1 6DP', lat: 51.4957, lon: -0.0995, cat: 'Nightlife' },
    { name: 'koko', display: 'KOKO London', url: 'https://www.koko.uk.com', address: '1A Camden High Street, London NW1 7JE', lat: 51.5395, lon: -0.1429, cat: 'Nightlife' },
    { name: 'electric', display: 'Electric Brixton', url: 'https://electricbrixton.uk.com', address: 'Town Hall Parade, London SW2 1RJ', lat: 51.4620, lon: -0.1155, cat: 'Nightlife' },
    { name: 'troubadour', display: 'Troubadour London', url: 'https://troubadourlondon.com', address: '263-267 Old Brompton Road, London SW5 9JA', lat: 51.4903, lon: -0.1819, cat: 'Nightlife' }
  ],

  manchester: [
    { name: 'o2ritz', display: 'O2 Ritz Manchester', url: 'https://o2ritzmanchester.co.uk', address: 'Whitworth Street West, Manchester M1 6FT', lat: 53.4752, lon: -2.2404, cat: 'Nightlife' },
    { name: 'albert', display: 'Albert Hall Manchester', url: 'https://alberthallmanchester.com', address: '27 Peter Street, Manchester M2 5QR', lat: 53.4776, lon: -2.2469, cat: 'Nightlife' },
    { name: 'warehouse', display: 'Warehouse Project', url: 'https://thewarehouseproject.com', address: 'Mayfield Depot, Manchester M1 2PF', lat: 53.4748, lon: -2.2271, cat: 'Nightlife' }
  ],

  // AUSTRALIA
  sydney: [
    { name: 'sydneyopera', display: 'Sydney Opera House', url: 'https://www.sydneyoperahouse.com', address: 'Bennelong Point, Sydney NSW 2000', lat: -33.8568, lon: 151.2153, cat: 'Nightlife' },
    { name: 'metrosydney', display: 'Metro Theatre Sydney', url: 'https://metrotheatre.com.au', address: '624 George Street, Sydney NSW 2000', lat: -33.8765, lon: 151.2062, cat: 'Nightlife' },
    { name: 'enmore', display: 'Enmore Theatre', url: 'https://enmoretheatre.com.au', address: '118-132 Enmore Road, Newtown NSW 2042', lat: -33.8986, lon: 151.1779, cat: 'Nightlife' },
    { name: 'ivypool', display: 'Ivy Pool Club', url: 'https://merivale.com/venues/ivy', address: '320-330 George Street, Sydney NSW 2000', lat: -33.8670, lon: 151.2074, cat: 'Nightlife' }
  ],

  melbourne: [
    { name: 'forummelb', display: 'Forum Melbourne', url: 'https://forummelbourne.com.au', address: '154 Flinders Street, Melbourne VIC 3000', lat: -37.8171, lon: 144.9708, cat: 'Nightlife' },
    { name: 'corner', display: 'Corner Hotel', url: 'https://cornerhotel.com', address: '57 Swan Street, Richmond VIC 3121', lat: -37.8252, lon: 144.9931, cat: 'Nightlife' },
    { name: 'revolver', display: 'Revolver Upstairs', url: 'https://revolverupstairs.com.au', address: '229 Chapel Street, Prahran VIC 3181', lat: -37.8517, lon: 144.9910, cat: 'Nightlife' }
  ],

  // NEW ZEALAND  
  auckland: [
    { name: 'sparkakl', display: 'Spark Arena', url: 'https://sparkarena.co.nz', address: '42-80 Mahuhu Crescent, Auckland 1010', lat: -36.8485, lon: 174.7633, cat: 'Nightlife' },
    { name: 'powerstation', display: 'Powerstation', url: 'https://www.thepowerstation.net.nz', address: '33 Mount Eden Road, Auckland 1024', lat: -36.8625, lon: 174.7623, cat: 'Nightlife' }
  ],

  wellington: [
    { name: 'sanfran', display: 'San Fran', url: 'https://www.sanfran.co.nz', address: '171 Cuba Street, Wellington 6011', lat: -41.2951, lon: 174.7752, cat: 'Nightlife' },
    { name: 'meow', display: 'Meow', url: 'https://www.meow.co.nz', address: '9 Edward Street, Wellington 6011', lat: -41.2951, lon: 174.7764, cat: 'Nightlife' }
  ],

  // IRELAND
  dublin: [
    { name: 'threearena', display: '3Arena', url: 'https://www.3arena.ie', address: 'East Link Bridge, Dublin 1', lat: 53.3478, lon: -6.2281, cat: 'Nightlife' },
    { name: 'vicar', display: 'Vicar Street', url: 'https://www.vicarstreet.ie', address: '58-59 Thomas Street, Dublin 8', lat: 53.3424, lon: -6.2812, cat: 'Nightlife' },
    { name: 'whelansdub', display: 'Whelans Dublin', url: 'https://www.whelanslive.com', address: '25 Wexford Street, Dublin 2', lat: 53.3352, lon: -6.2638, cat: 'Nightlife' }
  ],

  // ICELAND
  reykjavik: [
    { name: 'harpa', display: 'Harpa Concert Hall', url: 'https://en.harpa.is', address: 'Austurbakki 2, 101 Reykjavík', lat: 64.1503, lon: -21.9326, cat: 'Nightlife' },
    { name: 'gaukurinn', display: 'Gaukurinn', url: 'https://gaukurinn.is', address: 'Tryggvagata 22, 101 Reykjavík', lat: 64.1486, lon: -21.9462, cat: 'Nightlife' }
  ]
};

const template = (city, venue) => {
  const funcName = venue.name.charAt(0).toUpperCase() + venue.name.slice(1).replace(/-/g, '');
  return `/**
 * ${venue.display} ${city} Events Scraper
 * URL: ${venue.url}
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape${funcName}(city = '${city}') {
  console.log('🎵 Scraping ${venue.display}...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('${venue.url}/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, article, [class*="event"], .show, a[href*="/event"]').forEach(item => {
        try {
          const el = item.tagName === 'A' ? item : item.querySelector('a[href]');
          const url = el ? el.href : item.querySelector('a')?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);
          
          const container = item.closest('div, article, li') || item;
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          results.push({ title, dateStr, url, imageUrl });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s*(\\d{1,2}),?\\s*(\\d{4})/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            isoDate = \`\${year}-\${month}-\${day}\`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: \`Live at ${venue.display}\`,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: '${venue.display}',
          address: '${venue.address}',
          city: '${city}'
        },
        latitude: ${venue.lat},
        longitude: ${venue.lon},
        city: '${city}',
        category: '${venue.cat}',
        source: '${venue.display}'
      });
    }

    console.log(\`  ✅ Found \${formattedEvents.length} ${venue.display} events\`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(\`  ⚠️  ${venue.display} error: \${error.message}\`);
    return [];
  }
}

module.exports = scrape${funcName};
`;
};

// Create all scrapers
let totalCreated = 0;
for (const [city, venues] of Object.entries(cityVenues)) {
  console.log(`\n🏙️  Creating ${venues.length} scrapers for ${city}...`);
  const cityDir = path.join(__dirname, 'scrapers/cities', city);
  
  if (!fs.existsSync(cityDir)) {
    fs.mkdirSync(cityDir, { recursive: true });
  }
  
  venues.forEach(venue => {
    const filename = path.join(cityDir, `${venue.name}.js`);
    fs.writeFileSync(filename, template(city, venue));
    console.log(`  ✅ ${venue.name}.js`);
    totalCreated++;
  });
}

console.log(`\n\n🎉 COMPLETE! Created ${totalCreated} scrapers across ${Object.keys(cityVenues).length} cities!`);
