/**
 * The Wiltern Scraper
 * Art deco theater for concerts in Koreatown
 * URL: https://www.wiltern.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTheWiltern(city = 'Los Angeles') {
  console.log('🎤 Scraping The Wiltern...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.wiltern.com/shows', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      const BASE = 'https://www.wiltern.com';
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      function parseDate(text) {
        if (!text) return null;
        // "THU, MAY 8" or "May 8, 2025" or "May 8"
        let m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})?/i);
        if (m) {
          const mo = months[m[1].toLowerCase().slice(0, 3)];
          if (!mo) return null;
          const mm = parseInt(mo) - 1;
          const yr = m[3] ? parseInt(m[3]) : (mm < currentMonth ? currentYear + 1 : currentYear);
          return `${yr}-${mo}-${String(m[2]).padStart(2, '0')}`;
        }
        return null;
      }

      // Strategy 1: DOM containers
      const containers = document.querySelectorAll('article, .event, [class*="event-item"], [class*="show-item"], li.event, [class*="show-card"]');
      containers.forEach(c => {
        const titleEl = c.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"],[class*="artist"]');
        let title = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
        if (!title || title.length < 3 || /^(buy|ticket|sold)/i.test(title)) return;

        const date = parseDate(c.textContent || '');
        if (!date) return;

        const linkEl = c.querySelector('a[href]');
        const href = linkEl ? linkEl.href : '';
        const imgEl = c.querySelector('img[src]:not([src*="logo"])');
        const imageUrl = imgEl ? imgEl.src : null;

        const key = title.toLowerCase() + date;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title: title.slice(0, 100), date, url: href || BASE + '/shows', imageUrl });
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
            results.push({ title: title.slice(0, 100), date, url: BASE + '/shows', imageUrl: null });
          }
        }
      }

      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Wiltern events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: '',
      date: event.date,
      url: event.url || 'https://www.wiltern.com/shows',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'The Wiltern',
        address: '3790 Wilshire Blvd, Los Angeles, CA 90010',
        city: 'Los Angeles'
      },
      city: 'Los Angeles',
      category: 'Concert',
      source: 'TheWiltern'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Wiltern error:', error.message);
    return [];
  }
}

module.exports = scrapeTheWiltern;
