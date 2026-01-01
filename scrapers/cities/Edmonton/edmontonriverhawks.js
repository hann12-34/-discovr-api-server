/**
 * Edmonton Riverhawks Baseball Events Scraper
 * URL: https://riverhawks.ca/schedule/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeEdmontonRiverhawks(city = 'Edmonton') {
  console.log('⚾ Scraping Edmonton Riverhawks...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://riverhawks.ca/schedule/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.game-item, .schedule-item, article, tr, [class*="game"], [class*="schedule"]').forEach(el => {
        try {
          const link = el.querySelector('a');
          const url = link?.href; if (!url) return;
          if (seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title, .team-name, td')?.textContent?.trim() || 'Riverhawks Game';
          if (!title || title.length < 2) return;

          const dateText = el.textContent || '';
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);

          const img = el.querySelector('img');
          results.push({
            title: title.includes('Riverhawks') ? title : `Riverhawks vs ${title}`,
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}` : null,
            url,
            imageUrl: img?.src
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
        const match = event.dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})?/i);
        if (match) {
          const month = months[match[1].toLowerCase().substring(0, 3)];
          const day = match[2].padStart(2, '0');
          const year = match[3] || new Date().getFullYear();
          isoDate = `${year}-${month}-${day}`;
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
        venue: { name: 'RE/MAX Field', address: '10233 96 Ave NW, Edmonton, AB T5K 0A5', city: 'Edmonton' },
        city: 'Edmonton',
        category: 'Sports',
        source: 'Edmonton Riverhawks'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Riverhawks events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Riverhawks error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeEdmontonRiverhawks;
