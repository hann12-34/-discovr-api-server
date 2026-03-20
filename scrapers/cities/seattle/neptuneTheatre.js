/**
 * Neptune Theatre Scraper - REAL Puppeteer
 * Historic U-District concert venue
 * URL: https://www.stgpresents.org/neptune
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeNeptuneTheatre(city = 'Seattle') {
  console.log('🎭 Scraping Neptune Theatre...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.stgpresents.org/calendar?venue=neptune', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // NO new Date() - year must come from page
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('.event-card, .m-staffPicks__item, article, [class*="event"]');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 12 && line.length < 80 && 
              !line.match(/^(buy|tickets|more|view|\$|free|on sale|get tickets|various|paramount|moore|neptune|5th avenue|remlinger|kerry|november|december|january|february|other theatres|archive|su\s+mo\s+tu|inclusion program)/i) &&
              !line.match(/@context|schema\.org|"@type"|"name":|"url":/i) &&
              !line.match(/^["{\[]/) &&
              !line.match(/^https?:\/\//) &&
              !line.match(/^\d{4}-\d{2}-\d{2}/) &&
              !line.match(/^(mon|tue|wed|thu|fri|sat|sun)\s/i) &&
              !line.includes('.jpg') && !line.includes('.png') &&
              !line.match(/^[A-Z]{2}\s+[A-Z]{2}\s+[A-Z]{2}/)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
        
        if (title && dateMatch && dateMatch[3]) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          const year = dateMatch[3];
          const month = months[monthStr];
          
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            if (!seen.has(title + isoDate)) {
              seen.add(title + isoDate);
              results.push({ title: title.substring(0, 100), date: isoDate });
            }
          }
        }
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Neptune Theatre events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.stgpresents.org/neptune',
      imageUrl: event.imageUrl || null,
      venue: { name: 'Neptune Theatre', address: '1303 NE 45th St, Seattle, WA', city: 'Seattle' },
      latitude: 47.6614,
      longitude: -122.3149,
      city: 'Seattle',
      category: 'Festival',
      source: 'NeptuneTheatre'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

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
    console.error('  ⚠️  Neptune Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeNeptuneTheatre;
