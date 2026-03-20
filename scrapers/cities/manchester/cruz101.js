/**
 * Cruz 101 Manchester
 * URL: https://www.cruz101.com
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeCruz101(city = 'Manchester') {
  console.log('🎵 Scraping Cruz 101...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.cruz101.com/events', {
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
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})?/i);
          if (match) {
            const month = (months.indexOf(match[1].toLowerCase().substring(0, 3)) + 1).toString().padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Cruz 101',
          address: '101 Princess Street, Manchester M1 6DD',
          city: 'Manchester'
        },
        latitude: 53.4765,
        longitude: -2.2385,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Cruz 101'
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


    console.log(`  ✅ Found ${formattedEvents.length} Cruz 101 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Cruz 101 error:', error.message);
    return [];
  }
}

module.exports = scrapeCruz101;
