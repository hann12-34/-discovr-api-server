/**
 * The Novo Scraper - REAL Puppeteer
 * Major concert venue at L.A. Live
 * URL: https://www.thenovodtla.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheNovo(city = 'Los Angeles') {
  console.log('🎤 Scraping The Novo...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thenovodtla.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      const BASE = 'https://www.thenovodtla.com';
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      function parseDate(text) {
        if (!text) return null;
        const m = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (!m) return null;
        const mo = months[m[1].toLowerCase().slice(0, 3)];
        if (!mo) return null;
        const mm = parseInt(mo) - 1;
        const yr = m[3] ? parseInt(m[3]) : (mm < currentMonth ? currentYear + 1 : currentYear);
        return `${yr}-${mo}-${String(m[2]).padStart(2, '0')}`;
      }

      const containers = document.querySelectorAll('article, .event, [class*="event-item"], [class*="show"], [class*="event-card"], li.event');
      containers.forEach(c => {
        const titleEl = c.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"],[class*="artist"]');
        let title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
        if (!title || title.length < 3 || /^(buy|ticket|sold)/i.test(title)) return;
        const date = parseDate(c.textContent || '');
        if (!date) return;
        const linkEl = c.querySelector('a[href*="novo"], a[href*="/event"], a[href]');
        const href = linkEl ? linkEl.href : '';
        const imgEl = c.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
        const imageUrl = imgEl ? imgEl.src : null;
        const key = title.toLowerCase() + date;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title: title.slice(0, 100), date, url: href || BASE + '/events', imageUrl });
        }
      });

      if (results.length === 0) {
        const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 150);
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
    console.log(`  ✅ Found ${events.length} The Novo events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: event.url || 'https://www.thenovodtla.com/events',
      imageUrl: event.imageUrl || null,
      venue: { name: 'The Novo', address: '800 W Olympic Blvd, Los Angeles, CA 90015', city: 'Los Angeles' },
      city: 'Los Angeles',
      category: 'Concert',
      source: 'TheNovo'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Novo error:', error.message);
    return [];
  }
}

module.exports = scrapeTheNovo;
