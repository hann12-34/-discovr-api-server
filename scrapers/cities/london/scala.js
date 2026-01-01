/**
 * Scala London Events Scraper
 * Historic live music venue in Kings Cross
 * URL: https://www.scala.co.uk/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeScala(city = 'London') {
  console.log('🎸 Scraping Scala London...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.scala.co.uk/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/events/"]').forEach(el => {
        const href = el.href;
        if (seen.has(href) || href.endsWith('/events/') || href === 'https://www.scala.co.uk/events/') return;
        seen.add(href);
        
        let container = el;
        for (let i = 0; i < 8; i++) {
          container = container.parentElement;
          if (!container) break;
          
          const hasTitle = container.querySelector('h2, h3, h4, .event-title, .title');
          const hasDate = container.querySelector('time, .date');
          const hasImg = container.querySelector('img');
          
          if (hasTitle || (hasDate && hasImg)) {
            const title = hasTitle?.textContent?.trim();
            const dateEl = container.querySelector('time, .date');
            const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();
            const img = container.querySelector('img')?.src;
            
            if (title && title.length > 3 && !title.includes('December 2025') && !title.includes('January 2026')) {
              results.push({ title, dateStr, url: href, imageUrl: img });
              break;
            }
          }
        }
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
          // Handle formats like "Sat 27th December" or "27 December 2025"
          const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const now = new Date();
            let year = dateMatch[3] || now.getFullYear().toString();
            // If month is before current month, assume next year
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
        description: event.description || `Live at Scala London`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Scala',
          address: '275 Pentonville Road, London N1 9NL',
          city: 'London'
        },
        latitude: 51.5316,
        longitude: -0.1217,
        city: 'London',
        category: 'Nightlife',
        source: 'Scala'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid Scala events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Scala error:', error.message);
    return [];
  }
}

module.exports = scrapeScala;
