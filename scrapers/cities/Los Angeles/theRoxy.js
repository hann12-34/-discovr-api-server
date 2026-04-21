/**
 * The Roxy Theatre Scraper
 * Legendary rock club on Sunset Strip
 * URL: https://www.theroxy.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheRoxy(city = 'Los Angeles') {
  console.log('🎸 Scraping The Roxy Theatre...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.theroxy.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const BASE = 'https://www.theroxy.com';

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      function parseDate(text) {
        if (!text) return null;
        const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})/i)
                   || text.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        if (m[0].includes('-')) return m[0]; // already ISO
        const mo = months[m[1].toLowerCase().slice(0, 3)];
        if (!mo) return null;
        const yr = m[3] || new Date().getFullYear();
        return `${yr}-${mo}-${String(m[2]).padStart(2, '0')}`;
      }

      const junk = /buy tickets|get tickets|more info|subscribe|follow|toggle|menu|privacy|cookie/i;

      // Strategy 1: DOM selector approach
      const selectors = [
        'a[href*="/event"]', 'a[href*="/shows"]', 'a[href*="/tickets"]',
        '[class*="event"] a', '[class*="show"] a', 'article a', 'li a'
      ];

      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(a => {
          const href = a.href || '';
          if (!href.startsWith('http')) return;
          if (/eventbrite|songkick|allevents/i.test(href)) return;
          const container = a.closest('article, li, [class*="event"], [class*="show"], [class*="card"]') || a.parentElement;
          const titleEl = container ? (container.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]') || a) : a;
          const title = titleEl.textContent.trim().replace(/\s+/g, ' ');
          if (!title || title.length < 3 || junk.test(title)) return;
          const dateEl = container ? container.querySelector('time,[class*="date"],[class*="Date"]') : null;
          const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent) : (container ? container.textContent : '');
          const date = parseDate(dateStr);
          const imgEl = container ? container.querySelector('img[src]') : null;
          const imgSrc = imgEl ? imgEl.src : '';
          const key = title.toLowerCase() + (date || href.slice(-30));
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ title, date, url: href, imageUrl: imgSrc && !/logo|icon|placeholder/i.test(imgSrc) ? imgSrc : null });
          }
        });
        if (results.length > 5) break;
      }

      // Strategy 2: Text fallback if DOM approach fails
      if (results.length === 0) {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < lines.length; i++) {
          const date = parseDate(lines[i]);
          if (!date) continue;
          let title = lines[i - 1] || '';
          if (!title || title.length < 3 || junk.test(title)) title = lines[i - 2] || '';
          if (title && title.length > 3 && !junk.test(title) && !seen.has(title + date)) {
            seen.add(title + date);
            results.push({ title, date, url: BASE + '/events', imageUrl: null });
          }
        }
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Roxy Theatre events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: '',
      date: event.date,
      url: event.url || 'https://www.theroxy.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'The Roxy Theatre',
        address: '9009 W Sunset Blvd, West Hollywood, CA 90069',
        city: 'Los Angeles'
      },
      city: 'Los Angeles',
      category: 'Concert',
      source: 'TheRoxy'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

    // Fetch og:image for events with specific URLs but no image
    const needImg = formattedEvents.filter(e =>
      !e.imageUrl && e.url && !e.url.endsWith('/events') && !e.url.endsWith('/events/')
    );
    if (needImg.length > 0) {
      await Promise.all(needImg.map(async (ev) => {
        try {
          const r = await axios.get(ev.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const $p = cheerio.load(r.data);
          const og = $p('meta[property="og:image"]').attr('content');
          if (og && og.startsWith('http') && !/logo|placeholder|favicon/i.test(og)) ev.imageUrl = og;
        } catch (e) { /* skip */ }
      }));
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Roxy Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeTheRoxy;
