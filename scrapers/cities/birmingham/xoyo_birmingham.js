/**
 * XOYO Birmingham Nightclub Events Scraper
 * Premier nightclub in Birmingham
 * URL: https://xoyobirmingham.co.uk/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrapeXoyoBirmingham(city = 'Birmingham') {
  console.log('🎧 Scraping XOYO Birmingham...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://xoyobirmingham.co.uk/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.event-item, .event-card, article, [class*="event"], a[href*="event"]').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a[href]');
          const url = link?.href; if (!url) return;

          const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl?.textContent?.trim() || link?.textContent?.trim()?.substring(0, 100);
          if (!title || title.length < 3 || title.length > 150) return;
          if (/^(View|More|Read|Click|Book|Buy)/i.test(title)) return;

          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);

          const dateEl = el.querySelector('time, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';

          const img = el.querySelector('img');
          const imageUrl = img?.src || img?.getAttribute('data-src');

          results.push({ title, url, dateText, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();

    for (const event of events) {
      let isoDate = null;
      if (event.dateText) {
        const isoMatch = event.dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          isoDate = isoMatch[1];
        } else {
          // UK-style: "06 Feb 2026" or "6th February 2026"
          const ukMatch = event.dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})?/i);
          if (ukMatch) {
            const day = ukMatch[1].padStart(2, '0');
            const month = months[ukMatch[2].toLowerCase().substring(0, 3)];
            let year = ukMatch[3];
            if (!year) { year = (parseInt(month) < now.getMonth() + 1) ? String(now.getFullYear() + 1) : String(now.getFullYear()); }
            isoDate = `${year}-${month}-${day}`;
          } else {
            // US-style fallback: "Feb 6, 2026"
            const usMatch = event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (usMatch) {
              const month = months[usMatch[1].toLowerCase().substring(0, 3)];
              const day = usMatch[2].padStart(2, '0');
              let year = usMatch[3];
              if (!year) { year = (parseInt(month) < now.getMonth() + 1) ? String(now.getFullYear() + 1) : String(now.getFullYear()); }
              isoDate = `${year}-${month}-${day}`;
            }
          }
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate + 'T00:00:00.000Z') < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'XOYO Birmingham',
          address: '68 Hurst Street, Birmingham B5 4TD',
          city: 'Birmingham'
        },
        city: 'Birmingham',
        category: 'Nightlife',
        source: 'XOYO Birmingham'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} XOYO Birmingham events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ XOYO Birmingham error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeXoyoBirmingham;
