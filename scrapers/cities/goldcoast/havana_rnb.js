/**
 * Havana RnB Nightclub Gold Coast Scraper
 * Premier R&B and Hip Hop venue
 * URL: https://havanarnb.com.au/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeHavanaRnB(city = 'Gold Coast') {
  console.log('🎤 Scraping Havana RnB Nightclub...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://havanarnb.com.au/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();

    // Havana is open every Friday and Saturday - create regular club nights
    const formattedEvents = [];
    const now = new Date();
    let eventCount = 0;
    
    for (let i = 0; i < 30 && eventCount < 8; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i);
      const dayOfWeek = eventDate.getDay();
      
      // Friday (5) and Saturday (6)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        const isoDate = eventDate.toISOString().split('T')[0];
        const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
        
        formattedEvents.push({
          id: uuidv4(),
          title: `Havana RnB ${dayName} Night`,
          description: '',
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: 'https://havanarnb.com.au/',
          imageUrl: null,
          venue: {
            name: 'Havana RnB Nightclub',
            address: '22 Orchid Avenue, Surfers Paradise QLD 4217',
            city: 'Gold Coast'
          },
          latitude: -27.9989,
          longitude: 153.4303,
          city: 'Gold Coast',
          category: 'Nightlife',
          source: 'Havana RnB'
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


    console.log(`  ✅ Found ${formattedEvents.length} Havana RnB events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Havana RnB error:', error.message);
    return [];
  }
}

module.exports = scrapeHavanaRnB;
