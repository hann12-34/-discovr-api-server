/**
 * Birmingham Soul Festival - Real event scraper
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeSoulFest(city = 'Birmingham') {
  console.log('🎵 Scraping Birmingham Soul Festival...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.birminghamsoulfestival.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    const events = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.event-card, article, .event-item');
      cards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, .title');
        const linkEl = card.querySelector('a[href]');
        const imgEl = card.querySelector('img');
        const dateEl = card.querySelector('.date, time');
        if (titleEl && linkEl) {
          items.push({ title: titleEl.textContent.trim(), url: linkEl.href, image: imgEl ? imgEl.src : null, dateText: dateEl ? dateEl.textContent.trim() : null });
        }
      });
      return items;
    });

    await browser.close();
    const now = new Date();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const results = [], seenKeys = new Set();
    for (const evt of events) {
      let isoDate = null;
      if (evt.dateText) {
        const match = evt.dateText.match(/(\d{1,2})[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (match) { const day = parseInt(match[1], 10), month = months[match[2].toLowerCase().slice(0, 3)]; let year = now.getFullYear(); if (month < now.getMonth()) year++; isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
      }
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      const key = `${evt.title}-${isoDate}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      results.push({ id: uuidv4(), title: evt.title, description: '', date: isoDate, startDate: new Date(isoDate + 'T00:00:00.000Z'), url: evt.url, imageUrl: evt.image && evt.image.startsWith('http') ? evt.image : null, venue: { name: 'Handsworth Park', address: 'Handsworth Park, Birmingham', city: 'Birmingham' }, latitude: 52.5094, longitude: -1.9344, city: 'Birmingham', category: 'Festival', source: 'Soul Festival' });
    }

      // Fetch descriptions from event detail pages
      for (const event of events) {
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

    console.log(`  ✅ Found ${results.length} Soul Festival events`);
    return results;
  } catch (err) {
    console.error('Soul Festival error:', err.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeSoulFest;
