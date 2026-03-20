/**
 * Once Ballroom Boston Events Scraper
 * Live music venue in Somerville
 * URL: https://www.oncesomerville.com/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeOnceBallroom(city = 'Boston') {
  console.log('🎸 Scraping Once Ballroom Boston...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.oncesomerville.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      const selectors = ['.event', '.event-card', 'article', '[class*="event"]', '.show'];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          try {
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
            let title = titleEl ? titleEl.textContent.trim() : '';
            
            if (!title || title.length < 3 || seenTitles.has(title)) return;
            seenTitles.add(title);

            const link = el.querySelector('a[href]') || (el.tagName === 'A' ? el : null);
            let url = link ? link.href : '';

            const img = el.querySelector('img:not([src*="logo"])');
            let imageUrl = img ? (img.src || img.dataset.src) : null;

            let dateStr = null;
            const timeEl = el.querySelector('time[datetime], [datetime]');
            if (timeEl) dateStr = timeEl.getAttribute('datetime');
            
            if (!dateStr) {
              const dateEl = el.querySelector('.date, [class*="date"], time');
              if (dateEl) dateStr = dateEl.textContent.trim();
            }

            results.push({ title, url: url, imageUrl, dateStr });
          } catch (e) {}
        });
        if (results.length > 0) break;
      }

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Once Ballroom events`);

    const formattedEvents = [];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const monthMatch = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
          const dayMatch = event.dateStr.match(/\b(\d{1,2})\b/);
          
          if (monthMatch && dayMatch) {
            const month = (monthNames.indexOf(monthMatch[1].toLowerCase()) + 1).toString().padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            const now = new Date();
            let year = now.getFullYear();
            if (parseInt(month) < now.getMonth() + 1) year++;
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Once Ballroom', address: '156 Highland Ave, Somerville MA 02143', city: 'Boston' },
        latitude: 42.3959,
        longitude: -71.1124,
        city: 'Boston',
        category: 'Nightlife',
        source: 'Once Ballroom'
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


    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Once Ballroom error:', error.message);
    return [];
  }
}

module.exports = scrapeOnceBallroom;
