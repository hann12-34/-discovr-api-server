/**
 * Taste of Chicago Festival Events Scraper - Real event scraper
 * URL: https://www.tasteofchicago.us
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTasteOfChicago(city = 'Chicago') {
  console.log('🍴 Scraping Taste of Chicago...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.tasteofchicago.us/', { waitUntil: 'networkidle2', timeout: 30000 });

    const events = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.event-card, article, .event-item, .vendor-item');
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
      results.push({ id: uuidv4(), title: evt.title, description: null, date: isoDate, startDate: new Date(isoDate + 'T11:00:00'), url: evt.url, imageUrl: evt.image && evt.image.startsWith('http') ? evt.image : null, venue: { name: 'Taste of Chicago', address: 'Grant Park, Chicago IL 60605', city: 'Chicago' }, latitude: 41.8756, longitude: -87.6244, city: 'Chicago', category: 'Festival', source: 'Taste of Chicago' });
    }
    console.log(`  ✅ Found ${results.length} Taste of Chicago events`);
    return results;
  } catch (err) {
    console.error('Taste of Chicago error:', err.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeTasteOfChicago;
