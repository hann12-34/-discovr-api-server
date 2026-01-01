/**
 * The Rainbow Venues Birmingham Events Scraper
 * Multiple venue spaces in Digbeth
 * URL: https://www.therainbowvenues.co.uk/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeRainbow(city = 'Birmingham') {
  console.log('🌈 Scraping Rainbow Venues Birmingham...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.therainbowvenues.co.uk/whats-on/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const eventItems = document.querySelectorAll('.event, .event-item, article, [class*="event"], .show, .tribe-events-calendar-list__event');
      
      eventItems.forEach(item => {
        try {
          const titleEl = item.querySelector('h2, h3, h4, .event-title, .title, .tribe-events-calendar-list__event-title');
          const title = titleEl ? titleEl.textContent.trim() : null;
          if (!title || title.length < 3) return;
          
          const dateEl = item.querySelector('time, .date, .event-date, [datetime], .tribe-event-date-start');
          let dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          const linkEl = item.querySelector('a[href]');
          let url = linkEl ? linkEl.href : null;
          
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
          
          const descEl = item.querySelector('.description, p, .tribe-events-calendar-list__event-description');
          const description = descEl ? descEl.textContent.trim().substring(0, 300) : null;
          
          if (title) {
            results.push({ title, dateStr, url, imageUrl, description });
          }
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
          const dateMatch = event.dateStr.match(/(\d{1,2})[\/\.\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\.\s]*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Event at Rainbow Venues`,
        date: isoDate,
        startDate: new Date(isoDate + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Rainbow Venues',
          address: '160 High Street Deritend, Birmingham B12 0LD',
          city: 'Birmingham'
        },
        latitude: 52.4744,
        longitude: -1.8816,
        city: 'Birmingham',
        category: 'Nightlife',
        source: 'Rainbow Venues'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Rainbow events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Rainbow error:', error.message);
    return [];
  }
}

module.exports = scrapeRainbow;
