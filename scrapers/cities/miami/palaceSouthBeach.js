/**
 * Palace South Beach Events Scraper
 * LGBTQ+ bar & restaurant with drag performances on Ocean Drive
 * URL: https://www.palacesouthbeach.com/events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapePalaceSouthBeach(city = 'Miami') {
  console.log('👑 Scraping Palace South Beach...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 90000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.palacesouthbeach.com/events', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const eventDataMap = {};
      document.querySelectorAll('article, [class*="event-card"], [class*="event-item"], [class*="show-item"]').forEach(el => {
        const titleEl = el.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]');
        if (!titleEl) return;
        const key = titleEl.textContent.trim().slice(0, 60).toLowerCase();
        if (!key || key.length < 3) return;
        const linkEl = el.querySelector('a[href]');
        const imgEl = el.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
        if (!eventDataMap[key]) eventDataMap[key] = { url: linkEl ? linkEl.href : '', imageUrl: imgEl ? imgEl.src : null };
      });
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
      
      const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      const seen = new Set();
      
      // Pattern: "December 5 @ 8:00 pm" followed by event title
      const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+@/i;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(datePattern);
        
        if (dateMatch) {
          const monthStr = dateMatch[1];
          const day = dateMatch[2].padStart(2, '0');
          const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];
          
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const eventMonth = parseInt(month);
          const year = eventMonth < currentMonth ? currentYear + 1 : currentYear;
          
          const isoDate = `${year}-${month}-${day}`;
          
          // Title is the next line
          let title = lines[i + 1];
          
          if (title && title.length > 5 && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            const data = eventDataMap[title.slice(0, 60).toLowerCase()] || {};
            results.push({ title: title, date: isoDate, url: data.url || '', imageUrl: data.imageUrl || null });
          }
        }
      }
      
      return results;
    });

    await browser.close();

    console.log(`  ✅ Found ${events.length} Palace South Beach events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
        description: '',
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T00:00:00') : null,
      url: event.url || 'https://www.palacesouthbeach.com/events',
      imageUrl: event.imageUrl || null,
      venue: {
        name: 'Palace South Beach',
        address: '1052 Ocean Drive, Miami Beach, FL 33139',
        city: 'Miami'
      },
      latitude: 25.7803,
      longitude: -80.1301,
      city: 'Miami',
      category: 'Nightlife',
      source: 'Palace South Beach'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Palace South Beach error:', error.message);
    return [];
  }
}

module.exports = scrapePalaceSouthBeach;
