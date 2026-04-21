/**
 * Troubadour Scraper
 * Historic live music venue in West Hollywood
 * URL: https://troubadour.com/calendar/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeTroubadour(city = 'Los Angeles') {
  console.log('🎶 Scraping Troubadour...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://troubadour.com/calendar/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      const currentYear = new Date().getFullYear();

      function parseDate(text) {
        if (!text) return null;
        const m = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (!m) return null;
        const mo = months[m[1].toLowerCase().slice(0,3)];
        if (!mo) return null;
        const yr = m[3] || currentYear;
        return `${yr}-${mo}-${String(m[2]).padStart(2,'0')}`;
      }

      // Find event containers - look for blocks that have both a title link and a date
      const containers = document.querySelectorAll(
        'article, .event-block, .eventItem, [class*="event-item"], [class*="eventItem"], li.event, .show-row'
      );

      containers.forEach(container => {
        const text = container.innerText || '';
        const date = parseDate(text);
        if (!date) return;

        // Find the title from various elements
        const titleEl = container.querySelector('h1,h2,h3,h4,h5,[class*="title"],[class*="name"],[class*="artist"]');
        let title = titleEl ? titleEl.textContent.trim() : '';
        if (!title) {
          // Try text lines
          const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>3&&l.length<100);
          for (const l of lines) {
            if (!/^(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d|buy|ticket|sold)/i.test(l)) {
              title = l; break;
            }
          }
        }
        if (!title || title.length < 3) return;
        title = title.replace(/\s+/g,' ').trim().slice(0,100);

        // Get URL - prefer troubadour.com links, accept seetickets
        const linkEl = container.querySelector('a[href*="troubadour.com"], a[href*="seetickets"]');
        const href = linkEl ? linkEl.href : '';
        if (!href) return;

        // Get image
        const imgEl = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
        const imageUrl = imgEl ? imgEl.src : null;

        const key = title.toLowerCase() + date;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ title, date, url: href, imageUrl });
        }
      });

      // Fallback: If no containers found, scan for seetickets links with nearby dates
      if (results.length === 0) {
        document.querySelectorAll('a[href*="seetickets.us/event"]').forEach(link => {
          const href = link.href;
          if (!href || seen.has(href)) return;
          let title = link.textContent.trim().replace(/\s+/g,' ');
          if (!title || title.length < 3 || /^(tickets|sold|buy|img)/i.test(title)) return;
          if (title.includes('<img')) return;
          title = title.slice(0,100);

          // Look for date in parent container text
          let parent = link.parentElement;
          let date = null;
          for (let i=0; i<5 && parent; i++) {
            date = parseDate(parent.innerText||'');
            if (date) break;
            parent = parent.parentElement;
          }
          if (!date) return;

          const imgEl = link.closest('div')?.querySelector('img[src]');
          const imageUrl = imgEl && !imgEl.src.includes('logo') ? imgEl.src : null;

          if (!seen.has(title)) {
            seen.add(title); seen.add(href);
            results.push({ title, date, url: href, imageUrl });
          }
        });
      }

      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Troubadour events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        date: event.date,
        description: '',
        url: event.url,
        imageUrl: event.imageUrl || null,
        venue: {
          name: 'Troubadour',
          address: '9081 Santa Monica Blvd, West Hollywood, CA 90069',
          city: 'Los Angeles'
        },
        city: 'Los Angeles',
        category: 'Concert',
        source: 'Troubadour'
      };
    });

    // Fetch og:image for events without images
    const needImg = formattedEvents.filter(e => !e.imageUrl && e.url && e.url.startsWith('http'));
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
    console.error('  ⚠️  Troubadour error:', error.message);
    return [];
  }
}

module.exports = scrapeTroubadour;
