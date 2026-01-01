/**
 * Gabba Stadium Brisbane Events Scraper
 * Major cricket and sports venue
 * URL: https://www.thegabba.com.au/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeGabbaStadium(city = 'Brisbane') {
  console.log('🏏 Scraping Gabba Stadium Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thegabba.com.au/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="event"], article, .event, [class*="event"]').forEach(el => {
        const link = el.tagName === 'A' ? el : el.querySelector('a');
        if (!link || !link.href.includes('gabba')) return;
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        const container = el.closest('div, article') || el;
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        const img = container.querySelector('img');
        
        const titleEl = container.querySelector('h2, h3, h4, .title, [class*="title"]');
        let title = titleEl?.textContent?.trim();
        if (!title) {
          title = text.split(/\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)[0]?.trim();
        }
        
        const dateMatch = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
        
        if (title && title.length > 3 && title.length < 100 && !/Filter|Sort|View|Select|Functions/i.test(title)) {
          results.push({
            title: title.replace(/TBC|Cricket|BBL|Sheffield/gi, '').trim(),
            url: link.href,
            dateText: dateMatch ? dateMatch[0] : null,
            imageUrl: img?.src
          });
        }
      });
      
      return results.slice(0, 25);
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const dateMatch = event.dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          
          let year = currentYear;
          const eventDate = new Date(`${year}-${month}-${day}`);
          if (eventDate < now) {
            year = currentYear + 1;
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'The Gabba',
          address: '411 Vulture St, Woolloongabba QLD 4102',
          city: 'Brisbane'
        },
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'The Gabba'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Gabba events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Gabba error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeGabbaStadium;
