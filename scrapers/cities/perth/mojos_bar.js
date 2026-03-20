/**
 * Mojo's Bar Perth Events Scraper
 * North Fremantle live music venue - Perth music institution
 * URL: https://www.mojosbar.com.au/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeMojosBar(city = 'Perth') {
  console.log('🎵 Scraping Mojo\'s Bar Perth...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Try the main page first
    await page.goto('https://www.mojosbar.com.au/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Scroll to load content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event sections and Moshtix links
      document.querySelectorAll('a[href*="moshtix"], a[href*="event"], .event, article').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href;
          
          if (!url || seen.has(url)) return;
          if (url.includes('logo') || url.includes('.png') || url.includes('.jpg')) return;
          seen.add(url);

          let container = el.closest('section, article, div');
          for (let i = 0; i < 3 && container; i++) {
            container = container.parentElement;
          }

          const titleEl = container?.querySelector('h1, h2, h3, h4, .title');
          let title = titleEl?.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!title || title.length < 3 || title.length > 200) return;

          // Look for date
          let dateStr = null;
          const text = container?.textContent || '';
          const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*,?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            dateStr = `${dateMatch[2]} ${dateMatch[3]} ${dateMatch[4] || new Date().getFullYear()}`;
          }

          const img = container?.querySelector('img:not([src*="logo"])');
          let imageUrl = img?.src;

          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();

    for (const event of events) {
      if (!event.url) continue;

      let isoDate = null;
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < new Date(now.toISOString().split('T')[0])) continue;

      const key = event.title.toLowerCase() + isoDate;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: "Mojo's Bar",
          address: '237 Queen Victoria Street, North Fremantle, WA 6159',
          city: 'Perth'
        },
        latitude: -32.0295,
        longitude: 115.7530,
        city: 'Perth',
        category: 'Nightlife',
        source: "Mojo's Bar"
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


    console.log(`  ✅ Found ${formattedEvents.length} Mojo's Bar events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error("  ⚠️ Mojo's Bar error:", error.message);
    return [];
  }
}

module.exports = scrapeMojosBar;
