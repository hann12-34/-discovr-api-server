/**
 * Fortitude Music Hall Brisbane Events Scraper
 * Major live music venue in Fortitude Valley
 * URL: https://www.fortitudemusichall.com.au/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeFortitude(city = 'Brisbane') {
  console.log('🎸 Scraping Fortitude Music Hall Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.fortitudemusichall.com.au/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      const links = document.querySelectorAll('a[href*="-tickets-ae"]');
      
      links.forEach(link => {
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        let container = link;
        for (let i = 0; i < 10; i++) {
          container = container.parentElement;
          if (!container) break;
          const text = container.textContent || '';
          if (text.length > 50 && text.length < 500) break;
        }
        
        if (!container) return;
        
        const text = container.textContent.replace(/\s+/g, ' ').trim();
        const img = container.querySelector('img');
        
        const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        
        let title = null;
        const titleMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(?:\d{1,2}:\d{2}\s*[ap]m)?(.+?)(?:Find Tickets|18\+|R18|ALL AGES|GENERAL|VENUE|$)/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
          if (title.length > 10) {
            const halfLen = Math.floor(title.length / 2);
            const firstHalf = title.substring(0, halfLen);
            const secondHalf = title.substring(halfLen);
            if (firstHalf === secondHalf || title.indexOf(firstHalf, 1) === halfLen) {
              title = firstHalf.trim();
            }
          }
          title = title.replace(/^\d{1,2}:\d{2}\s*[ap]m\s*/i, '').trim();
        }
        
        if (!title || title.length < 3) return;
        if (/^(Find|View|More|Book|Buy|Get)/i.test(title)) return;
        
        results.push({
          title: title,
          dateText: dateMatch ? `${dateMatch[2]} ${dateMatch[3]}` : null,
          url: link.href,
          imageUrl: img?.src
        });
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
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Fortitude Music Hall',
          address: '312 Brunswick Street, Fortitude Valley QLD 4006',
          city: 'Brisbane'
        },
        latitude: -27.4570,
        longitude: 153.0350,
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'Fortitude Music Hall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Fortitude events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Fortitude error:', error.message);
    return [];
  }
}

module.exports = scrapeFortitude;
