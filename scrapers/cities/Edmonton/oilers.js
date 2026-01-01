/**
 * Edmonton Oilers NHL Events Scraper
 * URL: https://www.nhl.com/oilers/schedule
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeOilers(city = 'Edmonton') {
  console.log('🏒 Scraping Edmonton Oilers...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.nhl.com/oilers/schedule', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('[class*="game"], [class*="schedule"], tr, article').forEach(el => {
        try {
          const link = el.querySelector('a');
          const url = link?.href; if (!url) return;
          
          const dateEl = el.querySelector('[class*="date"], time, [datetime]');
          const dateAttr = dateEl?.getAttribute('datetime') || dateEl?.textContent || el.textContent || '';
          
          const opponent = el.querySelector('[class*="team"], [class*="opponent"]')?.textContent?.trim();
          const title = opponent ? `Oilers vs ${opponent}` : 'Edmonton Oilers Game';
          
          if (seen.has(title + dateAttr)) return;
          seen.add(title + dateAttr);

          const dateMatch = dateAttr.match(/(\d{4}-\d{2}-\d{2})/) || 
                           dateAttr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);

          results.push({
            title,
            dateStr: dateMatch ? (dateMatch[1] || `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}`) : null,
            url,
            imageUrl: null
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    for (const event of events) {
      let isoDate = null;
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})?/i);
          if (match) {
            const month = months[match[1].toLowerCase().substring(0, 3)];
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: { name: 'Rogers Place', address: '10220 104 Avenue NW, Edmonton, AB T5J 0H6', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Sports',
        source: 'Edmonton Oilers'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Oilers events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Oilers error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeOilers;
