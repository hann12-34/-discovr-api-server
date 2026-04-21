/**
 * Vogue Theatre Events Scraper
 * Scrapes upcoming events from the official Vogue Theatre website
 * Source: https://www.voguetheatre.com/events
 * Address: 918 Granville St, Vancouver, BC V6Z 1L2
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const MONTHS = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12
};

function parseVogueDate(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').replace(/\s+/g, ' ').trim();
  const m = clean.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(m[2]);
  const now = new Date();
  const year = m[3] ? parseInt(m[3]) : (month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear());
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

const VogueTheatreEvents = {
  async scrape(city) {
    console.log('🎭 Scraping Vogue Theatre from official website...');
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto('https://www.voguetheatre.com/events', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for AdmitOne embed to inject event cards
      await new Promise(r => setTimeout(r, 5000));

      const rawEvents = await page.evaluate(() => {
        const results = [];
        const seenUrls = new Set();

        document.querySelectorAll('.event_card').forEach(card => {
          const titleEl = card.querySelector('.ecc_grid_1_title p');
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 2) return;

          const linkEl = card.querySelector('.ecc_grid_9_buy a');
          const url = linkEl ? linkEl.href : '';
          if (!url || seenUrls.has(url)) return;
          seenUrls.add(url);

          const imgEl = card.querySelector('.ecc_grid_4_image img');
          const imageUrl = imgEl ? imgEl.src : null;

          const dateEl = card.querySelector('.ecc_grid_6_date p');
          const dateRaw = dateEl ? dateEl.textContent.trim() : '';

          const doorsEl = card.querySelector('.ecc_grid_7_doors p');
          const doorsText = doorsEl ? doorsEl.textContent.trim() : '';

          results.push({ title, url, imageUrl, dateRaw, doorsText });
        });

        return results;
      });

      await browser.close();
      browser = null;

      console.log(`  Found ${rawEvents.length} raw events from Vogue Theatre page`);

      const today = new Date().toISOString().slice(0, 10);
      const events = [];

      for (const item of rawEvents) {
        const isoDate = parseVogueDate(item.dateRaw);
        if (!isoDate || isoDate < today) continue;

        const imageUrl = (item.imageUrl && item.imageUrl.startsWith('http') && !item.imageUrl.includes('logo')) ? item.imageUrl : null;

        events.push({
          id: uuidv4(),
          title: item.title,
          date: isoDate,
          url: item.url,
          imageUrl,
          description: item.doorsText ? item.doorsText.replace('Doors:', '').trim() : '',
          venue: {
            name: 'Vogue Theatre',
            address: '918 Granville St, Vancouver, BC V6Z 1L2',
            city: 'Vancouver',
          },
          city: 'Vancouver',
          source: 'vogue-theatre',
        });
      }

      const filtered = filterEvents(events);
      console.log(`  ✅ Returning ${filtered.length} valid Vogue Theatre events`);
      return filtered;

    } catch (error) {
      if (browser) await browser.close();
      console.error('  ⚠️ Vogue Theatre error:', error.message);
      return [];
    }
  }
};

module.exports = VogueTheatreEvents.scrape;
