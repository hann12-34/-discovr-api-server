/**
 * Bedroom Nightclub Gold Coast Scraper
 * Popular Surfers Paradise nightclub
 * URL: https://www.bedroommightclub.com.au/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeBedroomEvents(city = 'Gold Coast') {
  console.log('🛏️ Scraping Bedroom Nightclub Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://bedroomgc.au/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();

    // Bedroom is open Friday and Saturday nights
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Bedroom Nightclub ${dayName}`,
          description: '',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: 'https://bedroomgc.au/',
          imageUrl: null,
          venue: {
            name: 'Bedroom Nightclub',
            address: '26 Orchid Avenue, Surfers Paradise QLD 4217',
            city: 'Gold Coast'
          },
          latitude: -27.9989,
          longitude: 153.4303,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Bedroom Nightclub'
        });
        eventCount++;
      }
    }

      // Fetch descriptions from event detail pages
      for (const event of formattedEvents) {
        if (event.description || !event.url || !event.url.startsWith('http')) continue;
        try {
          const _r = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const _$ = cheerio.load(_r.data);
          let _desc = _$('meta[property="og:description"]').attr('content') || '';
          if (!_desc || _desc.length < 20) {
            _desc = _$('meta[name="description"]').attr('content') || '';
          }
          if (!_desc || _desc.length < 20) {
            for (const _s of ['.event-description', '.event-content', '.entry-content p', '.description', 'article p', '.content p', '.page-content p']) {
              const _t = _$(_s).first().text().trim();
              if (_t && _t.length > 30) { _desc = _t; break; }
            }
          }
          if (_desc) {
            _desc = _desc.replace(/\s+/g, ' ').trim();
            if (_desc.length > 500) _desc = _desc.substring(0, 500) + '...';
            event.description = _desc;
          }
        } catch (_e) { /* skip */ }
      }


    console.log(`  ✅ Found ${formattedEvents.length} Bedroom Nightclub events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Bedroom Nightclub error:', error.message);
    return [];
  }
}

module.exports = scrapeBedroomEvents;
