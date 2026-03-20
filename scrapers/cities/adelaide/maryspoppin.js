/**
 * Mary's Poppin Adelaide Events Scraper
 * LGBTQI+ venue with drag shows and parties
 * URL: https://www.maryspoppin.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeMaryspoppin(city = 'Adelaide') {
  console.log('🌈 Scraping Mary\'s Poppin Adelaide...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.maryspoppin.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url.endsWith('/events') || url.endsWith('/events/')) return;
        seen.add(url);

        const container = link.closest('div, article, section') || link.parentElement;
        
        const titleEl = container?.querySelector('h1, h2, h3, h4, [class*="title"]');
        let title = titleEl?.textContent?.trim();
        if (!title || title.length < 3) {
          const slug = url.split('/events/')[1]?.replace(/-/g, ' ')?.replace(/\/$/, '');
          title = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : null;
        }
        if (!title || title.length < 3) return;

        const dateEl = container?.querySelector('time, [class*="date"], [data-date]');
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || '';

        const imgEl = container?.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

        results.push({ title, url, dateText, imageUrl });
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          const dateMatch = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            const day = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3] || now.getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: "Mary's Poppin",
          address: '5 Synagogue Place, Adelaide, SA 5000',
          city: 'Adelaide'
        },
        city: 'Adelaide',
        category: 'Nightlife',
        source: "Mary's Poppin"
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


    console.log(`  ✅ Found ${formattedEvents.length} Mary's Poppin events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Mary's Poppin error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMaryspoppin;
