/**
 * Mass Create Ottawa Scrapers for Major Venues
 */

const fs = require('fs');
const path = require('path');

const ottawaVenues = [
  {
    name: 'mercury-lounge',
    displayName: 'Mercury Lounge',
    url: 'https://mercurylounge.ca',
    address: '56 Byward Market Square, Ottawa, ON K1N 7A2',
    lat: 45.4284,
    lon: -75.6922,
    category: 'Nightlife'
  },
  {
    name: 'irenes',
    displayName: 'Irene\'s Pub',
    url: 'https://irenespub.com',
    address: '885 Bank Street, Ottawa, ON K1S 3W4',
    lat: 45.3956,
    lon: -75.6833,
    category: 'Nightlife'
  },
  {
    name: 'blacksheep',
    displayName: 'Black Sheep Inn',
    url: 'https://blacksheepinn.com',
    address: '753 Bank Street, Ottawa, ON K1S 3V3',
    lat: 45.4011,
    lon: -75.6838,
    category: 'Nightlife'
  },
  {
    name: 'arlingtonfive',
    displayName: 'Arlington Five',
    url: 'https://arlingtonfive.ca',
    address: '7 Arlington Avenue, Ottawa, ON K2P 1C3',
    lat: 45.4139,
    lon: -75.6977,
    category: 'Nightlife'
  },
  {
    name: 'laffe',
    displayName: 'Laffé',
    url: 'https://laffe.ca',
    address: '171 Laurier Avenue West, Ottawa, ON K1P 5J2',
    lat: 45.4212,
    lon: -75.6973,
    category: 'Nightlife'
  },
  {
    name: 'zaphods',
    displayName: 'Zaphod Beeblebrox',
    url: 'https://zaphodb.ca',
    address: '27 York Street, Ottawa, ON K1N 5S7',
    lat: 45.4292,
    lon: -75.6917,
    category: 'Nightlife'
  },
  {
    name: 'houseoftarg',
    displayName: 'House of TARG',
    url: 'https://houseoftarg.com',
    address: '1077 Bank Street, Ottawa, ON K1S 3X2',
    lat: 45.3886,
    lon: -75.6826,
    category: 'Nightlife'
  },
  {
    name: 'brass',
    displayName: 'Brass Monkey',
    url: 'https://brassmonkeyottawa.com',
    address: '346 Elgin Street, Ottawa, ON K2P 1M8',
    lat: 45.4169,
    lon: -75.6936,
    category: 'Nightlife'
  },
  {
    name: 'glowfair',
    displayName: 'Glowfair',
    url: 'https://glowfair.com',
    address: '150 Elgin Street, Ottawa, ON K2P 1L4',
    lat: 45.4209,
    lon: -75.6924,
    category: 'Nightlife'
  },
  {
    name: 'aberdeen',
    displayName: 'Aberdeen Pavilion',
    url: 'https://lansdownepark.ca',
    address: '1000 Exhibition Way, Ottawa, ON K1S 5J3',
    lat: 45.3989,
    lon: -75.6832,
    category: 'Festivals'
  },
  {
    name: 'ottawabluesfest',
    displayName: 'Ottawa Bluesfest',
    url: 'https://ottawabluesfest.ca',
    address: 'LeBreton Flats Park, Ottawa, ON K1R 7X7',
    lat: 45.4155,
    lon: -75.7115,
    category: 'Festivals'
  },
  {
    name: 'ottawajazzfest',
    displayName: 'Ottawa Jazz Festival',
    url: 'https://ottawajazzfestival.com',
    address: 'Confederation Park, Ottawa, ON K1P 5K9',
    lat: 45.4216,
    lon: -75.6936,
    category: 'Festivals'
  },
  {
    name: 'chambersfest',
    displayName: 'Chamberfest Ottawa',
    url: 'https://chamberfest.com',
    address: 'Various Venues, Ottawa, ON',
    lat: 45.4215,
    lon: -75.6972,
    category: 'Festivals'
  },
  {
    name: 'winterlude',
    displayName: 'Winterlude Festival',
    url: 'https://canada.ca/en/canadian-heritage/campaigns/winterlude.html',
    address: 'Confederation Park, Ottawa, ON K1A 0M5',
    lat: 45.4216,
    lon: -75.6936,
    category: 'Festivals'
  },
  {
    name: 'cityviewbp',
    displayName: 'Cityview Brewpub',
    url: 'https://cityviewbrew.com',
    address: '2108 Carling Avenue, Ottawa, ON K2A 1H1',
    lat: 45.3956,
    lon: -75.7548,
    category: 'Nightlife'
  },
  {
    name: 'heart',
    displayName: 'Heart & Crown',
    url: 'https://heartandcrown.ca',
    address: '67 Clarence Street, Ottawa, ON K1N 5P6',
    lat: 45.4285,
    lon: -75.6926,
    category: 'Nightlife'
  }
];

const template = (venue) => `/**
 * ${venue.displayName} Ottawa Events Scraper
 * URL: ${venue.url}
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape${venue.name.charAt(0).toUpperCase() + venue.name.slice(1)}(city = 'Ottawa') {
  console.log('🎵 Scraping ${venue.displayName} Ottawa...');

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
      
      document.querySelectorAll('.event, article, [class*="event"], .show, .tribe-events-list-event-row, a[href*="/event"]').forEach(item => {
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
        description: \`Live at ${venue.displayName}\`,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: '${venue.displayName}',
          address: '${venue.address}',
          city: 'Ottawa'
        },
        latitude: ${venue.lat},
        longitude: ${venue.lon},
        city: 'Ottawa',
        category: '${venue.category}',
        source: '${venue.displayName}'
      });
    }

    console.log(\`  ✅ Found \${formattedEvents.length} ${venue.displayName} events\`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(\`  ⚠️  ${venue.displayName} error: \${error.message}\`);
    return [];
  }
}

module.exports = scrape${venue.name.charAt(0).toUpperCase() + venue.name.slice(1)};
`;

// Create all scrapers
console.log(`Creating ${ottawaVenues.length} Ottawa scrapers...\n`);

ottawaVenues.forEach(venue => {
  const filename = path.join(__dirname, 'scrapers/cities/Ottawa', `${venue.name}.js`);
  fs.writeFileSync(filename, template(venue));
  console.log(`✅ Created ${venue.name}.js`);
});

console.log(`\n✅ All ${ottawaVenues.length} scrapers created!`);
console.log('\nRun: node test-ottawa-batch.js to test them all');
