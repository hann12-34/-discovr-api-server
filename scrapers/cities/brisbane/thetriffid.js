/**
 * The Triffid Brisbane Events Scraper
 * Live music venue in Newstead
 * URL: https://thetriffid.com.au/upcoming-gigs/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeTheTriffid(city = 'Brisbane') {
  console.log('🎸 Scraping The Triffid Brisbane...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://thetriffid.com.au/upcoming-gigs/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(link => {
        if (seen.has(link.href)) return;
        seen.add(link.href);
        
        let container = link.closest('article, .event, div') || link.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          const text = container.textContent || '';
          if (text.length > 30 && text.length < 500) break;
          container = container.parentElement;
        }
        
        if (!container) return;
        
        const img = container.querySelector('img');
        const titleEl = container.querySelector('h2, h3, h4, .title');
        let title = titleEl?.textContent?.trim();
        
        if (!title) {
          const pathParts = link.href.split('/event/')[1]?.split('/')[0];
          if (pathParts) {
            title = pathParts.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        }
        
        const text = container.textContent || '';
        const dateMatches = text.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi);
        const dateStr = dateMatches ? dateMatches[0] : null;
        
        if (title && title.length > 2) {
          results.push({
            title: title.substring(0, 100),
            dateStr: dateStr,
            url: link.href,
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
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
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
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'The Triffid',
          address: '7-9 Stratton Street, Newstead QLD 4006',
          city: 'Brisbane'
        },
        latitude: -27.4446,
        longitude: 153.0441,
        city: 'Brisbane',
        category: 'Nightlife',
        source: 'The Triffid'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Triffid events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  The Triffid error:', error.message);
    return [];
  }
}

module.exports = scrapeTheTriffid;
