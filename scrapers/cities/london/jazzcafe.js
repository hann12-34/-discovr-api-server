/**
 * Jazz Cafe Events Scraper (London)
 * Iconic live music venue in Camden
 * URL: https://thejazzcafelondon.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeJazzCafe(city = 'London') {
  console.log('🎷 Scraping Jazz Cafe...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thejazzcafelondon.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      
      const eventItems = document.querySelectorAll('.event-card, .event, [class*="event"], article, .gig');
      
      eventItems.forEach(item => {
        try {
          const titleEl = item.querySelector('h2, h3, h4, .title, .event-title, .name, .artist');
          const title = titleEl ? titleEl.textContent.trim() : null;
          
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('time, .date, [class*="date"], [datetime]');
          let dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const linkEl = item.querySelector('a[href]');
          let url = linkEl ? linkEl.href : null;
          
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          const descEl = item.querySelector('.description, .summary, p');
          const description = descEl ? descEl.textContent.trim().substring(0, 300) : null;
          
          if (title) {
            results.push({ title, dateStr, url, imageUrl, description });
          }
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    console.log(`  📦 Found ${events.length} raw events`);

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Live jazz at The Jazz Cafe`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'The Jazz Cafe',
          address: '5 Parkway, Camden, London NW1 7PG',
          city: 'London'
        },
        latitude: 51.5392,
        longitude: -0.1414,
        city: 'London',
        category: 'Nightlife',
        source: 'Jazz Cafe'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Jazz Cafe events`);
    formattedEvents.forEach(e => console.log(`    ✓ ${e.title} | ${e.date}`));
    
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Jazz Cafe error:', error.message);
    return [];
  }
}

module.exports = scrapeJazzCafe;
