/**
 * Belfast Continental Christmas Market - Real event scraper
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeChristmasMarket(city = 'Belfast') {
  console.log('🎄 Scraping Christmas Market...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.belfastcity.gov.uk/christmasmarket', { waitUntil: 'networkidle2', timeout: 30000 });

    const events = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.event-card, article, .event-item, .market-info');
      cards.forEach(card => {
        const titleEl = card.querySelector('h2, h3, h4, .title, .event-title');
        const linkEl = card.querySelector('a[href]');
        const imgEl = card.querySelector('img');
        const dateEl = card.querySelector('.date, .event-date, time');
        if (titleEl && linkEl) {
          items.push({
            title: titleEl.textContent.trim(),
            url: linkEl.href,
            image: imgEl ? imgEl.src : null,
            dateText: dateEl ? dateEl.textContent.trim() : null
          });
        }
      });
      return items;
    });

    await browser.close();
    const now = new Date();
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const results = [];
    const seenKeys = new Set();

    for (const evt of events) {
      let isoDate = null;
      if (evt.dateText) {
        const match = evt.dateText.match(/(\d{1,2})[\s\-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = months[match[2].toLowerCase().slice(0, 3)];
          let year = now.getFullYear();
          if (month < now.getMonth()) year++;
          isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      const key = `${evt.title}-${isoDate}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      results.push({
        id: uuidv4(),
        title: evt.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T10:00:00'),
        url: evt.url,
        imageUrl: evt.image && evt.image.startsWith('http') ? evt.image : null,
        venue: { name: 'City Hall Grounds', address: 'Donegall Square, Belfast', city: 'Belfast' },
        latitude: 54.5973,
        longitude: -5.9301,
        city: 'Belfast',
        category: 'Festival',
        source: 'Belfast Christmas Market'
      });
    }
    console.log(`  ✅ Found ${results.length} Christmas Market events`);
    return results;
  } catch (err) {
    console.error('Christmas Market error:', err.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeChristmasMarket;
