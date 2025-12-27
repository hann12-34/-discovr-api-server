/**
 * House of Blues LA Scraper - REAL Puppeteer
 * Live music venue in Anaheim
 * URL: https://www.houseofblues.com/anaheim
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeHouseOfBluesLA(city = 'Los Angeles') {
  console.log('🎸 Scraping House of Blues Anaheim...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.houseofblues.com/anaheim/concerts', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };

      const items = document.querySelectorAll('.event-card, .concert-card, article, [class*="event"], .show-card');
      
      items.forEach(item => {
        const text = item.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let title = null;
        for (const line of lines) {
          if (line.length > 3 && line.length < 100 && 
              !line.match(/^(buy|tickets|more|view|\$|free|on sale|sold out)/i)) {
            title = line;
            break;
          }
        }
        
        const dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})?/i)
          || text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        
        if (title && dateMatch) {
          let isoDate;
          if (dateMatch[0].includes('/')) {
            const month = dateMatch[1].padStart(2, '0');
            const day = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) year = '20' + year;
            isoDate = `${year}-${month}-${day}`;
          } else {
            const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
            const day = dateMatch[2];
            const year = dateMatch[3] || currentYear;
            const month = months[monthStr];
            if (month) isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
          }
          
          if (isoDate && !seen.has(title + isoDate)) {
            seen.add(title + isoDate);
            results.push({ title: title.substring(0, 100), date: isoDate });
          }
        }
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} House of Blues events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      date: event.date,
      startDate: event.date ? new Date(event.date + 'T20:00:00') : null,
      url: 'https://www.houseofblues.com/anaheim',
      imageUrl: null,
      venue: { name: 'House of Blues Anaheim', address: '1530 S Disneyland Dr, Anaheim, CA', city: 'Los Angeles' },
      latitude: 33.8068,
      longitude: -117.9220,
      city: 'Los Angeles',
      category: 'Nightlife',
      source: 'HouseOfBluesLA'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  House of Blues error:', error.message);
    return [];
  }
}

module.exports = scrapeHouseOfBluesLA;
