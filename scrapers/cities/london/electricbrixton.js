/**
 * Electric Brixton Events Scraper (London)
 * Live music and club venue in Brixton
 * URL: https://electricbrixton.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeElectricBrixton(city = 'London') {
  console.log('⚡ Scraping Electric Brixton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://electricbrixton.uk.com/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/events/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/events/') || href === 'https://electricbrixton.uk.com/events/') return;
        seen.add(href);
        
        // Get title from URL slug
        const urlParts = href.split('/');
        const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        // Navigate up to find container with date/image
        let container = el;
        for (let i = 0; i < 8; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const dateEl = container.querySelector('time, .date, [class*="date"]');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
          const img = container.querySelector('img')?.src;
          
          if (dateStr && title.length > 3) {
            results.push({ title, dateStr, url: href, imageUrl: img });
            break;
          }
        }
      });
      return results;
    });

    await browser.close();

    console.log(`  📦 Found ${events.length} raw events`);

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          // Handle formats like "31st December 2025" or "17th January 2026"
          const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const now = new Date();
            let year = dateMatch[3] || now.getFullYear().toString();
            if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < new Date()) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.description || `Live at Electric Brixton`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'Electric Brixton',
          address: 'Town Hall Parade, Brixton, London SW2 1RJ',
          city: 'London'
        },
        latitude: 51.4613,
        longitude: -0.1156,
        city: 'London',
        category: 'Nightlife',
        source: 'Electric Brixton'
      });
    }

    // Remove duplicates by title+date
    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const e of formattedEvents) {
      const key = e.title + e.date;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(e);
      }
    }
    
    console.log(`  ✅ Found ${uniqueEvents.length} valid Electric Brixton events`);
    return uniqueEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Electric Brixton error:', error.message);
    return [];
  }
}

module.exports = scrapeElectricBrixton;
