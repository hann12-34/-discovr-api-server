/**
 * Batch create Manchester nightlife scrapers
 */

const fs = require('fs');
const path = require('path');

const venues = [
  {
    name: 'The Venue Nightclub',
    filename: 'the_venue.js',
    url: 'https://www.thevenuenightclub.co.uk',
    address: '119-121 Princess Street, Manchester M1 7AG',
    lat: 53.4760,
    lng: -2.2384
  },
  {
    name: 'Cinco Lounge',
    filename: 'cinco.js',
    url: 'https://www.cinco-manchester.co.uk',
    address: 'Princess Street, Manchester M1 6DE',
    lat: 53.4762,
    lng: -2.2390
  },
  {
    name: 'Joshua Brooks',
    filename: 'joshua_brooks.js',
    url: 'https://www.joshuabrooks.co.uk',
    address: '106 Princess Street, Manchester M1 6NG',
    lat: 53.4763,
    lng: -2.2382
  },
  {
    name: 'Sound Control',
    filename: 'sound_control.js',
    url: 'https://www.soundcontrolmanchester.co.uk',
    address: 'New Wakefield Street, Manchester M1 5NP',
    lat: 53.4769,
    lng: -2.2363
  },
  {
    name: 'Cruz 101',
    filename: 'cruz101.js',
    url: 'https://www.cruz101.com',
    address: '101 Princess Street, Manchester M1 6DD',
    lat: 53.4765,
    lng: -2.2385
  },
  {
    name: 'The Bread Shed',
    filename: 'bread_shed.js',
    url: 'https://www.thebreadshed.co.uk',
    address: '4 Baring Street, Manchester M1 2PZ',
    lat: 53.4772,
    lng: -2.2355
  },
  {
    name: 'Contact Theatre',
    filename: 'contact.js',
    url: 'https://contactmcr.com',
    address: 'Oxford Road, Manchester M15 6JA',
    lat: 53.4658,
    lng: -2.2324
  },
  {
    name: 'HOME Manchester',
    filename: 'home.js',
    url: 'https://homemcr.org',
    address: '2 Tony Wilson Place, Manchester M15 4FN',
    lat: 53.4733,
    lng: -2.2528
  },
  {
    name: 'The Lowry',
    filename: 'lowry.js',
    url: 'https://thelowry.com',
    address: 'Pier 8, Salford Quays M50 3AZ',
    lat: 53.4712,
    lng: -2.2965
  },
  {
    name: 'Manchester Castlefield Bowl',
    filename: 'castlefield.js',
    url: 'https://www.castlefieldmanchester.com',
    address: 'Liverpool Road, Manchester M3 4FP',
    lat: 53.4764,
    lng: -2.2526
  }
];

const template = (venue) => `/**
 * ${venue.name} Manchester
 * URL: ${venue.url}
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape${venue.name.replace(/[^a-zA-Z0-9]/g, '')}(city = 'Manchester') {
  console.log('🎵 Scraping ${venue.name}...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('${venue.url}/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('.event, article, [class*="event"], .show, .listing').forEach(el => {
        try {
          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3 || seen.has(title)) return;
          seen.add(title);
          
          const link = el.querySelector('a');
          const url = link ? link.href : '';
          
          const img = el.querySelector('img:not([src*="logo"])');
          const imageUrl = img ? (img.src || img.dataset.src) : null;
          
          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          results.push({ title, url, imageUrl, dateStr });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s*(\\d{1,2}),?\\s*(\\d{4})?/i);
          if (match) {
            const month = (months.indexOf(match[1].toLowerCase().substring(0, 3)) + 1).toString().padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = \`\${year}-\${month}-\${day}\`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: \`Event at ${venue.name}\`,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url || '${venue.url}',
        imageUrl: event.imageUrl,
        venue: {
          name: '${venue.name}',
          address: '${venue.address}',
          city: 'Manchester'
        },
        latitude: ${venue.lat},
        longitude: ${venue.lng},
        city: 'Manchester',
        category: 'Nightlife',
        source: '${venue.name}'
      });
    }

    console.log(\`  ✅ Found \${formattedEvents.length} ${venue.name} events\`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  ${venue.name} error:', error.message);
    return [];
  }
}

module.exports = scrape${venue.name.replace(/[^a-zA-Z0-9]/g, '')};
`;

const dir = path.join(__dirname, 'scrapers', 'cities', 'manchester');

venues.forEach(venue => {
  const filepath = path.join(dir, venue.filename);
  fs.writeFileSync(filepath, template(venue));
  console.log(`✅ Created ${venue.filename}`);
});

console.log(`\n✅ Created ${venues.length} Manchester scrapers!`);
