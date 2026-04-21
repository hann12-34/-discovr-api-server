/**
 * El Rey Theatre Scraper
 * Art deco concert venue on Miracle Mile
 * URL: https://www.theelrey.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeElReyTheatre(city = 'Los Angeles') {
  console.log('🎭 Scraping El Rey Theatre...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.theelrey.com/events', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      const BASE = 'https://www.theelrey.com';
      const currentYear = new Date().getFullYear();

      function parseDate(text) {
        if (!text) return null;
        const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (!m) return null;
        const mo = months[m[1].toLowerCase().slice(0, 3)];
        if (!mo) return null;
        return `${m[3] || currentYear}-${mo}-${String(m[2]).padStart(2, '0')}`;
      }

      // Strategy 1: DOM selectors for event containers
      const containers = document.querySelectorAll('article, .event, [class*="event-item"], [class*="show"], li.event');
      containers.forEach(c => {
        const titleEl = c.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"],[class*="artist"]');
        const title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
        if (!title || title.length < 3 || /tickets|buy|sold/i.test(title)) return;

        const dateEl = c.querySelector('time,[class*="date"]');
        const dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent) : c.textContent;
        const date = parseDate(dateStr);
        if (!date) return;

        const linkEl = c.querySelector('a[href*="theelrey"], a[href*="/event"]');
        const href = linkEl ? (linkEl.href || '') : '';
        const imgEl = c.querySelector('img[src]:not([src*="logo"])');
        const imageUrl = imgEl ? imgEl.src : null;

        const key = title.toLowerCase() + date;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title: title.slice(0, 100), date, url: href || BASE + '/events', imageUrl });
        }
      });

      // Strategy 2: text fallback
      if (results.length === 0) {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
        const junk = /^(mon|tue|wed|thu|fri|sat|sun|buy|ticket|sold|\d{1,2}:\d{2})/i;
        for (let i = 0; i < lines.length; i++) {
          const date = parseDate(lines[i]);
          if (!date) continue;
          let title = lines[i - 1] || '';
          if (!title || title.length < 3 || junk.test(title)) title = lines[i - 2] || '';
          if (title && title.length > 3 && !junk.test(title) && !seen.has(title + date)) {
            seen.add(title + date);
            results.push({ title: title.slice(0, 100), date, url: BASE + '/events', imageUrl: null });
          }
        }
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} El Rey Theatre events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: '',
      date: event.date,
      url: event.url || 'https://www.theelrey.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'El Rey Theatre',
        address: '5515 Wilshire Blvd, Los Angeles, CA 90036',
        city: 'Los Angeles'
      },
      city: 'Los Angeles',
      category: 'Concert',
      source: 'ElReyTheatre'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));

    // Fetch og:image for events with specific URLs
    const needImg = formattedEvents.filter(e => !e.imageUrl && e.url && !e.url.endsWith('/events'));
    if (needImg.length > 0) {
      await Promise.all(needImg.map(async (ev) => {
        try {
          const r = await axios.get(ev.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }, timeout: 8000 });
          const $p = cheerio.load(r.data);
          const og = $p('meta[property="og:image"]').attr('content');
          if (og && og.startsWith('http') && !/logo|placeholder|favicon/i.test(og)) ev.imageUrl = og;
        } catch (e) { /* skip */ }
      }));
    }

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  El Rey Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeElReyTheatre;
