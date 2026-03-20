/**
 * Substation Scraper - REAL Puppeteer
 * DIY live music venue in Seattle
 * URL: https://www.substationseattle.com/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeSubstation(city = 'Seattle') {
  console.log('🚇 Scraping Substation...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.substationseattle.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      const bodyText = document.body.innerText;
      const eventItems = document.querySelectorAll('.eventlist-event, .event, article, [class*="event"], .summary-item');
      
      eventItems.forEach(item => {
        try {
          const text = item.innerText;
          if (text.length < 10) return;
          
          const titleEl = item.querySelector('h1, h2, h3, .eventlist-title, .summary-title');
          let title = titleEl ? titleEl.textContent.trim() : null;
          
          if (!title || title.length < 3) return;
          
          const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[\s,]*(\d{4})?/i);
          if (!dateMatch) return;
          
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr];
          
          const yearMatch = text.match(/\b(202[4-9])\b/) || bodyText.match(/\b(202[4-9])\b/);
          if (!yearMatch) return;
          const year = yearMatch[1];
          
          const isoDate = `${year}-${month}-${day}`;
          
          const img = item.querySelector('img:not([src*="logo"])');
          const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
          
          const link = item.querySelector('a[href]');
          const eventUrl = link ? link.href : 'https://www.substationseattle.com/';
          
          const key = title + isoDate;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              title: title.substring(0, 100),
              date: isoDate,
              imageUrl: imageUrl,
              url: eventUrl
            });
          }
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Substation events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: 'Substation',
        address: '645 NW 45th St, Seattle, WA 98107',
        city: 'Seattle'
      },
      latitude: 47.6616,
      longitude: -122.3656,
      city: 'Seattle',
      category: 'Nightlife',
      source: 'Substation'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date} ${e.imageUrl ? '🖼️' : ''}`));

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

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Substation error:', error.message);
    return [];
  }
}

module.exports = scrapeSubstation;
