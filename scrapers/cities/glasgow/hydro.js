/**
 * OVO Hydro Glasgow Events Scraper
 * URL: https://www.ovohydro.com/
 */
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHydro(city = 'Glasgow') {
  console.log('🎭 Scraping OVO Hydro Glasgow...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.ovohydro.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 4000));
    const events = await page.evaluate(() => {
      const results = []; const seen = new Set();
      document.querySelectorAll('a[href*="/event"], .event, article').forEach(el => {
        const link = el.tagName === 'A' ? el : el.querySelector('a');
        if (!link) return; const href = link.href; if (seen.has(href)) return; seen.add(href);
        const container = el.closest('article') || el;
        const title = container.querySelector('h2, h3, h4, .title')?.textContent?.trim()?.replace(/\s+/g, ' ');
        const dateEl = container.querySelector('time, .date');
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
        const img = container.querySelector('img')?.src;
        if (title && title.length > 3 && title.length < 100) results.push({ title, dateStr, url: href, imageUrl: img });
      });
      return results;
    });
    await browser.close();
    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const seenKeys = new Set(); const now = new Date();
    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) { const day = dateMatch[1].padStart(2, '0'); const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = now.getFullYear().toString(); if (parseInt(month) < now.getMonth() + 1) year = (now.getFullYear() + 1).toString();
          isoDate = `${year}-${month}-${day}`; }
      }
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue; const key = event.title + isoDate; if (seenKeys.has(key)) continue; seenKeys.add(key);
      formattedEvents.push({ id: uuidv4(), title: event.title, description: null, date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'), url: event.url, imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'OVO Hydro', address: 'Exhibition Way, Glasgow G3 8YW', city: 'Glasgow' },
        latitude: 55.8604, longitude: -4.2867, city: 'Glasgow', category: 'Nightlife', source: 'OVO Hydro' });
    }
    console.log(`  ✅ Found ${formattedEvents.length} events`); return formattedEvents;
  } catch (error) { if (browser) await browser.close(); console.error('  ⚠️  Error:', error.message); return []; }
}
module.exports = scrapeHydro;
