/**
 * Philadelphia Folk Festival Events Scraper - Real event scraper
 * URL: https://pfs.org/philadelphia-folk-festival
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapePhillyFolkFest(city = 'Philadelphia') {
  console.log('🎻 Scraping Philadelphia Folk Festival...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://pfs.org/philadelphia-folk-festival', { waitUntil: 'networkidle2', timeout: 30000 });

    const events = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.artist-card, .event-card, article, .performer-item');
      cards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, .title, .artist-name');
        const linkEl = card.querySelector('a[href]');
        const imgEl = card.querySelector('img');
        const dateEl = card.querySelector('.date, time, .performance-date');
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
      results.push({ id: uuidv4(), title: evt.title, description: null, date: isoDate, startDate: new Date(isoDate + 'T10:00:00'), url: evt.url, imageUrl: evt.image && evt.image.startsWith('http') ? evt.image : null, venue: { name: 'Philadelphia Folk Festival', address: 'Old Pool Farm, Schwenksville PA 19473', city: 'Philadelphia' }, latitude: 40.2559, longitude: -75.4645, city: 'Philadelphia', category: 'Festival', source: 'Philly Folk Festival' });
    }
    console.log(`  ✅ Found ${results.length} Folk Festival events`);
    return results;
  } catch (err) {
    console.error('Folk Festival error:', err.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapePhillyFolkFest;
