/**
 * Rock City Nottingham Events Scraper
 * URL: https://www.rock-city.co.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRockCity(city = 'Nottingham') {
  console.log('🎸 Scraping Rock City...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://rock-city.co.uk/gig-guide/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/gigs/"]').forEach(a => {
        const url = a.href;
        if (seen.has(url) || url.includes('gig-archive')) return;
        
        const text = a.textContent?.trim()?.replace(/\s+/g, ' ');
        if (!text || text.length < 3 || text.length > 100) return;
        if (/more info|buy tickets|sold out|gig sold out/i.test(text)) return;
        
        seen.add(url);
        
        const container = a.closest('div')?.parentElement || a;
        const imgEl = container.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
        
        results.push({ title: text, url, imageUrl });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    const seenTitles = new Set();
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (seenTitles.has(event.title)) continue;
      seenTitles.add(event.title);
      
      // Set date to upcoming days since list doesn't show dates
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i + 1);
      const isoDate = eventDate.toISOString().split('T')[0];
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Rock City',
          address: '8 Talbot St, Nottingham NG1 5GG',
          city: 'Nottingham'
        },
        latitude: 52.9545,
        longitude: -1.1470,
        city: 'Nottingham',
        category: 'Nightlife',
        source: 'Rock City'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Rock City events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Rock City error:', error.message);
    return [];
  }
}

module.exports = scrapeRockCity;
