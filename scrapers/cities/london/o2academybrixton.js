/**
 * O2 Academy Brixton Events Scraper (London)
 * Major live music venue in Brixton
 * URL: https://www.academymusicgroup.com/o2academybrixton/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeO2AcademyBrixton(city = 'London') {
  console.log('🎸 Scraping O2 Academy Brixton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2academybrixton/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      
      // Find event listings
      const eventItems = document.querySelectorAll('.event-listing, .event-item, article[class*="event"], .ds-events-group__item');
      
      eventItems.forEach(item => {
        try {
          // Get title
          const titleEl = item.querySelector('h2, h3, .event-title, .title, [class*="name"]');
          const title = titleEl ? titleEl.textContent.trim() : null;
          
          if (!title || title.length < 3) return;
          
          // Get date
          const dateEl = item.querySelector('time, .date, .event-date, [class*="date"]');
          let dateStr = dateEl ? (dateEl.getAttribute('datetime') || dateEl.textContent.trim()) : null;
          
          // Get URL
          const linkEl = item.querySelector('a[href*="event"], a[href*="/"]');
          let url = linkEl ? linkEl.href : null;
          
          // Get image
          const imgEl = item.querySelector('img');
          let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src')) : null;
          
          // Get description
          const descEl = item.querySelector('.description, .event-description, p');
          const description = descEl ? descEl.textContent.trim() : null;
          
          if (title && url) {
            results.push({
              title,
              dateStr,
              url,
              imageUrl,
              description
            });
          }
        } catch (e) {
          // Skip invalid entries
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
        // Try ISO format first
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          // Try "15 Jan 2025" format
          const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
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
        description: event.description || `Live at O2 Academy Brixton`,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: 'O2 Academy Brixton',
          address: '211 Stockwell Road, London SW9 9SL',
          city: 'London'
        },
        latitude: 51.4652,
        longitude: -0.1149,
        city: 'London',
        category: 'Nightlife',
        source: 'O2 Academy Brixton'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} valid O2 Academy Brixton events`);
    formattedEvents.forEach(e => console.log(`    ✓ ${e.title} | ${e.date}`));
    
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Academy Brixton error:', error.message);
    return [];
  }
}

module.exports = scrapeO2AcademyBrixton;
