/**
 * Hollywood Bowl Scraper
 * Iconic outdoor amphitheater for concerts and festivals
 * URL: https://www.hollywoodbowl.com/events/performances
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeHollywoodBowl(city = 'Los Angeles') {
  console.log('🎭 Scraping Hollywood Bowl...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.hollywoodbowl.com/events/performances', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const BASE = 'https://www.hollywoodbowl.com';

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };

      function parseDate(text) {
        const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i);
        if (!m) return null;
        const mo = months[m[1].toLowerCase().slice(0, 3)];
        if (!mo) return null;
        const yr = m[3] || new Date().getFullYear();
        return `${yr}-${mo}-${String(m[2]).padStart(2, '0')}`;
      }

      // Strategy 1: Find anchor links to individual event pages
      document.querySelectorAll('a[href*="/events/performances/"]').forEach(a => {
        const href = a.href;
        if (!href || href.endsWith('/performances') || href.endsWith('/performances/')) return;
        const container = a.closest('article, li, [class*="event"], [class*="card"], [class*="listing"], [class*="performance"]') || a.parentElement;
        const titleEl = container ? (container.querySelector('h2,h3,h4,[class*="title"]') || a) : a;
        const title = titleEl.textContent.trim();
        if (!title || title.length < 3 || title.includes('Buy') || title.includes('Ticket')) return;
        const dateEl = container ? container.querySelector('time,[class*="date"],[class*="Date"]') : null;
        const dateText = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent) : '';
        const date = parseDate(dateText) || parseDate(container ? container.textContent : '');
        const imgEl = container ? container.querySelector('img[src]') : null;
        const imgSrc = imgEl ? imgEl.src : '';
        const key = title + (date || href);
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title, date, url: href, imageUrl: imgSrc && !imgSrc.includes('logo') ? imgSrc : null });
        }
      });

      // Strategy 2: Fallback - parse text if Strategy 1 finds nothing
      if (results.length === 0) {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
        const datePat = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i;
        const junk = /TOGGLE|MENU|SUBSCRIBE|EXCLUSIVE|CLICK|LOGIN|SIGN UP|NEWSLETTER|COOKIE|PRIVACY|Buy Tickets/i;
        for (let i = 0; i < lines.length; i++) {
          const d = parseDate(lines[i]);
          if (!d) continue;
          let title = null;
          for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
            const pt = lines[j];
            if (pt && pt.length > 5 && pt.length < 120 && !junk.test(pt) && !/^\d/.test(pt)) {
              title = pt; break;
            }
          }
          if (title && !seen.has(title + d)) {
            seen.add(title + d);
            results.push({ title, date: d, url: BASE + '/events/performances', imageUrl: null });
          }
        }
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Hollywood Bowl events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: '',
      date: event.date,
      url: event.url || 'https://www.hollywoodbowl.com/events/performances',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Hollywood Bowl',
        address: '2301 N Highland Ave, Los Angeles, CA 90068',
        city: 'Los Angeles'
      },
      city: 'Los Angeles',
      category: 'Concert',
      source: 'HollywoodBowl'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

    // Fetch og:image for events that have event-specific URLs but no image yet
    const needImg = formattedEvents.filter(e =>
      !e.imageUrl && e.url && e.url !== 'https://www.hollywoodbowl.com/events/performances'
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
    console.error('  ⚠️  Hollywood Bowl error:', error.message);
    return [];
  }
}

module.exports = scrapeHollywoodBowl;
