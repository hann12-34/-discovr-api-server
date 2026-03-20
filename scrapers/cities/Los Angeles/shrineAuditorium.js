/**
 * Shrine Auditorium Scraper - REAL Puppeteer
 * Historic concert hall and event venue
 * URL: https://www.shrineauditorium.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeShrineAuditorium(city = 'Los Angeles') {
  console.log('🏛️ Scraping Shrine Auditorium...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.shrineauditorium.com/events', {
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
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      document.querySelectorAll('.event-card, article, [class*="event"]').forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 3 && line.length < 100 && 
              !line.match(/^(buy|tickets|more|view|\$|free|on sale)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i);
        
        if (title && dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          const year = dateMatch[3] || currentYear;
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
    console.log(`  ✅ Found ${events.length} Shrine Auditorium events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T19:00:00') : null,
      url: 'https://www.shrineauditorium.com/events',
      imageUrl: null,
      venue: { name: 'Shrine Auditorium', address: '665 W Jefferson Blvd, Los Angeles, CA 90007', city: 'Los Angeles' },
      latitude: 34.0231,
      longitude: -118.2839,
      city: 'Los Angeles',
      category: 'Festival',
      source: 'ShrineAuditorium'
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
    console.error('  ⚠️  Shrine Auditorium error:', error.message);
    return [];
  }
}

module.exports = scrapeShrineAuditorium;
