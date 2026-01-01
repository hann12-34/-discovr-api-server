/**
 * Mass Create Edmonton Scrapers for Major Venues
 */

const fs = require('fs');
const path = require('path');

const edmontonVenues = [
  {
    name: 'rogersplace',
    displayName: 'Rogers Place',
    url: 'https://rogersplace.com',
    address: '10220 104 Avenue NW, Edmonton, AB T5J 0H6',
    lat: 53.5467,
    lon: -113.4973,
    category: 'Nightlife'
  },
  {
    name: 'commonwealth',
    displayName: 'Commonwealth Stadium',
    url: 'https://commonwealth-stadium.com',
    address: '11000 Stadium Road NW, Edmonton, AB T5H 4E2',
    lat: 53.5597,
    lon: -113.4764,
    category: 'Festivals'
  },
  {
    name: 'newcity',
    displayName: 'New City Likwid Lounge',
    url: 'https://newcity.ca',
    address: '10081 Jasper Avenue, Edmonton, AB T5J 1V4',
    lat: 53.5420,
    lon: -113.5019,
    category: 'Nightlife'
  },
  {
    name: 'muttart',
    displayName: 'Muttart Hall',
    url: 'https://yegtickets.ca',
    address: '9797 Jasper Avenue, Edmonton, AB T5J 1N9',
    lat: 53.5439,
    lon: -113.4914,
    category: 'Nightlife'
  },
  {
    name: 'blackdog',
    displayName: 'Black Dog Freehouse',
    url: 'https://theblackdog.ca',
    address: '10425 Whyte Avenue, Edmonton, AB T6E 1Z9',
    lat: 53.5194,
    lon: -113.5001,
    category: 'Nightlife'
  },
  {
    name: 'thecommonwealth',
    displayName: 'The Common',
    url: 'https://thecommonedmonton.com',
    address: '10551 107 Avenue NW, Edmonton, AB T5H 0W6',
    lat: 53.5506,
    lon: -113.5051,
    category: 'Nightlife'
  },
  {
    name: 'themercer',
    displayName: 'The Mercer Tavern',
    url: 'https://themercertavern.ca',
    address: '10318 Whyte Avenue, Edmonton, AB T6E 1Z7',
    lat: 53.5195,
    lon: -113.4991,
    category: 'Nightlife'
  },
  {
    name: 'jubilee',
    displayName: 'Jubilee Auditorium',
    url: 'https://jubileeauditorium.com',
    address: '11455 87 Avenue NW, Edmonton, AB T6G 2T2',
    lat: 53.5171,
    lon: -113.5213,
    category: 'Nightlife'
  },
  {
    name: 'rexbar',
    displayName: 'The Rec Room',
    url: 'https://therecroom.com/edmonton',
    address: '8882 170 Street NW, Edmonton, AB T5T 4M2',
    lat: 53.5260,
    lon: -113.6288,
    category: 'Nightlife'
  },
  {
    name: 'yeglive',
    displayName: 'YEG Live Music Venue',
    url: 'https://yeglive.ca',
    address: '10324 82 Avenue NW, Edmonton, AB T6E 1Z8',
    lat: 53.5194,
    lon: -113.4993,
    category: 'Nightlife'
  },
  {
    name: 'edmontonfolkfest',
    displayName: 'Edmonton Folk Music Festival',
    url: 'https://edmontonfolkfest.org',
    address: 'Gallagher Park, Edmonton, AB T6E 6K2',
    lat: 53.5166,
    lon: -113.4794,
    category: 'Festivals'
  },
  {
    name: 'fringe',
    displayName: 'Edmonton Fringe Festival',
    url: 'https://fringetheatre.ca',
    address: 'Old Strathcona, Edmonton, AB T6E 1Z9',
    lat: 53.5195,
    lon: -113.5000,
    category: 'Festivals'
  },
  {
    name: 'k-days',
    displayName: 'K-Days Festival',
    url: 'https://k-days.com',
    address: '7515 118 Avenue NW, Edmonton, AB T5B 4X5',
    lat: 53.5728,
    lon: -113.4664,
    category: 'Festivals'
  },
  {
    name: 'edmontonjazz',
    displayName: 'Edmonton Jazz Festival',
    url: 'https://edmontonjazz.com',
    address: 'Various Venues, Edmonton, AB',
    lat: 53.5461,
    lon: -113.4938,
    category: 'Festivals'
  },
  {
    name: 'icecastle',
    displayName: 'Ice Castles Edmonton',
    url: 'https://icecastles.com/edmonton',
    address: 'Hawrelak Park, Edmonton, AB T6R 1X2',
    lat: 53.5183,
    lon: -113.5550,
    category: 'Festivals'
  },
  {
    name: 'northlands',
    displayName: 'Northlands Coliseum',
    url: 'https://northlands.com',
    address: '7300 116 Avenue NW, Edmonton, AB T5B 4M9',
    lat: 53.5677,
    lon: -113.4707,
    category: 'Nightlife'
  },
  {
    name: 'garneau',
    displayName: 'Garneau Theatre',
    url: 'https://magiclanterntheatres.ca',
    address: '8712 109 Street NW, Edmonton, AB T6G 1E9',
    lat: 53.5196,
    lon: -113.5135,
    category: 'Nightlife'
  },
  {
    name: 'midway',
    displayName: 'Midway Music Hall',
    url: 'https://midwaybar.ca',
    address: '10022 102 Avenue NW, Edmonton, AB T5J 0G9',
    lat: 53.5447,
    lon: -113.5000,
    category: 'Nightlife'
  },
  {
    name: 'pawn',
    displayName: 'The Pawn Shop',
    url: 'https://pawnshop.ca',
    address: '10551 82 Avenue NW, Edmonton, AB T6E 2A3',
    lat: 53.5194,
    lon: -113.5051,
    category: 'Nightlife'
  },
  {
    name: 'thestrat',
    displayName: 'The Strat',
    url: 'https://thestrat.ca',
    address: '10329 82 Avenue NW, Edmonton, AB T6E 1Z8',
    lat: 53.5194,
    lon: -113.4993,
    category: 'Nightlife'
  },
  {
    name: 'citadeltheatre',
    displayName: 'Citadel Theatre',
    url: 'https://citadeltheatre.com',
    address: '9828 101A Avenue NW, Edmonton, AB T5J 3C6',
    lat: 53.5444,
    lon: -113.4989,
    category: 'Nightlife'
  }
];

const template = (venue) => `/**
 * ${venue.displayName} Edmonton Events Scraper
 * URL: ${venue.url}
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape${venue.name.charAt(0).toUpperCase() + venue.name.slice(1).replace(/-/g, '')}(city = 'Edmonton') {
  console.log('🎵 Scraping ${venue.displayName} Edmonton...');

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
          city: 'Edmonton'
        },
        latitude: ${venue.lat},
        longitude: ${venue.lon},
        city: 'Edmonton',
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

module.exports = scrape${venue.name.charAt(0).toUpperCase() + venue.name.slice(1).replace(/-/g, '')};
`;

// Create all scrapers
console.log(`Creating ${edmontonVenues.length} Edmonton scrapers...\n`);

edmontonVenues.forEach(venue => {
  const filename = path.join(__dirname, 'scrapers/cities/Edmonton', `${venue.name}.js`);
  fs.writeFileSync(filename, template(venue));
  console.log(`✅ Created ${venue.name}.js`);
});

console.log(`\n✅ All ${edmontonVenues.length} scrapers created!`);
