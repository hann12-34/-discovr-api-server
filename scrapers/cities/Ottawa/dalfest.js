/**
 * Ottawa Dalfest Events Scraper
 * Dalhousie Street Festival
 * URL: https://www.dalfest.ca/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeDalfest(city = 'Ottawa') {
  console.log('🎪 Scraping Dalfest Ottawa...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.dalfest.ca/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      // Look for festival information
      const title = document.querySelector('h1, .title')?.textContent?.trim() || 'Dalfest Ottawa';
      const img = document.querySelector('img')?.src;
      
      // Look for date
      const fullText = document.body.textContent;
      const dateMatch = fullText.match(/(June|July|August|September)\s*(\d{1,2})[\s,\-]*(\d{4})?/i);
      
      if (dateMatch) {
        results.push({
          title: 'Dalfest - Dalhousie Street Festival',
          dateStr: dateMatch[0],
          url: 'https://www.dalfest.ca/',
          imageUrl: img
        });
      }
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { june: '06', july: '07', august: '08', september: '09' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(June|July|August|September)\s*(\d{1,2})[\s,\-]*(\d{4})?/i);
        if (dateMatch) {
          const month = months[dateMatch[1].toLowerCase()];
          const day = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3] || new Date().getFullYear().toString();
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      // Default to summer date if not found
      if (!isoDate) {
        const currentYear = new Date().getFullYear();
        isoDate = `${currentYear}-08-15`;
      }
      
      if (new Date(isoDate) < new Date()) {
        const nextYear = new Date().getFullYear() + 1;
        isoDate = `${nextYear}-08-15`;
      }
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Dalfest',
          address: 'Dalhousie Street, Ottawa, ON K1N 7C4',
          city: 'Ottawa'
        },
        latitude: 45.4286,
        longitude: -75.6932,
        city: 'Ottawa',
        category: 'Festivals',
        source: 'Dalfest'
      });
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


    console.log(`  ✅ Found ${formattedEvents.length} Dalfest events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Dalfest error:', error.message);
    return [];
  }
}

module.exports = scrapeDalfest;
