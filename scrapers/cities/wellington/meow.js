/**
 * Meow Wellington Events Scraper
 * Live music venue on Cuba Street
 * URL: https://meow.flicket.co.nz
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMeow(city = 'Wellington') {
  console.log('🐱 Scraping Meow Wellington...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://meow.flicket.co.nz', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="Buy tickets"], a[href*="Event info"], button, [class*="event"], [class*="Event"]').forEach(el => {
        let container = el.closest('div');
        for (let i = 0; i < 8 && container; i++) {
          const text = container.textContent || '';
          if (text.length > 50 && text.length < 400 && /\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text)) break;
          container = container.parentElement;
        }
        
        if (!container) return;
        
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        if (seen.has(text)) return;
        seen.add(text);
        
        const cleanText = text.replace(/^Events?Sign upLog in|^Events?/gi, '').trim();
        
        const titleMatch = cleanText.match(/^(.+?)(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
        let title = titleMatch ? titleMatch[1].trim() : null;
        
        if (!title) {
          const altMatch = cleanText.match(/^([^0-9]+?)(?:\d{1,2}\s*Jan|\d{1,2}\s*Feb|\d{1,2}\s*Mar)/i);
          title = altMatch ? altMatch[1].trim() : null;
        }
        
        const dateMatch = cleanText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        
        const link = container.querySelector('a[href*="flicket"], a[href*="ticket"], a');
        const img = container.querySelector('img');
        
        if (title && title.length > 3 && title.length < 100 && dateMatch && !/^Events?$|Sign up|Log in/i.test(title)) {
          results.push({
            title: title.replace(/Event info|Buy tickets/gi, '').trim(),
            url: link?.href || 'https://meow.flicket.co.nz',
            dateText: `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2026'}`,
            imageUrl: img?.src
          });
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateText) {
        const dateMatch = event.dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) ||
                         event.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i);
        if (dateMatch) {
          let day, month;
          if (/\d/.test(dateMatch[1])) {
            day = dateMatch[1].padStart(2, '0');
            month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          } else {
            month = months[dateMatch[1].toLowerCase().substring(0, 3)];
            day = dateMatch[2].padStart(2, '0');
          }
          
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Meow',
          address: '9 Edward Street, Te Aro, Wellington 6011',
          city: 'Wellington'
        },
        latitude: -41.2924,
        longitude: 174.7764,
        city: 'Wellington',
        category: 'Nightlife',
        source: 'Meow'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Meow events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️  Meow error: ${error.message}`);
    return [];
  }
}

module.exports = scrapeMeow;
