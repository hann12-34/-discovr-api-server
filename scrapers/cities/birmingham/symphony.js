/**
 * Birmingham Symphony Hall Events Scraper
 * Major concert venue - B:Music website
 * URL: https://www.thsh.co.uk/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeSymphonyHall(city = 'Birmingham') {
  console.log('🎵 Scraping Birmingham Symphony Hall...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.thsh.co.uk/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Tailored extraction for B:Music website structure
    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find event cards with links to event pages
      const cards = document.querySelectorAll('a[href*="/whats-on/"]');
      
      cards.forEach(card => {
        const href = card.href;
        if (!href || seen.has(href) || href === 'https://www.thsh.co.uk/whats-on' || href.endsWith('/whats-on/')) return;
        seen.add(href);
        
        // Get title from heading inside card
        const titleEl = card.querySelector('h2, h3, h4, .title');
        const title = titleEl ? titleEl.textContent.trim() : null;
        if (!title || title.length < 3 || title === 'What\'s On' || title === 'Recently Added') return;
        
        // Get image
        const img = card.querySelector('img');
        const imgSrc = img ? (img.src || img.dataset.src) : null;
        
        // Get date from card
        const dateEl = card.querySelector('time, .date, [class*="date"], p');
        let dateStr = dateEl ? dateEl.textContent.trim() : null;
        
        // Also check parent for date
        if (!dateStr) {
          const parent = card.parentElement;
          const parentDateEl = parent?.querySelector('time, .date');
          dateStr = parentDateEl ? parentDateEl.textContent.trim() : null;
        }
        
        results.push({
          title,
          url: href,
          imageUrl: imgSrc,
          dateStr
        });
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { 
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', 
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' 
    };
    
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        // Parse dates like "Sun 04 Jan 2026" or "Sat 10 Jan 2026"
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
        
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = dateMatch[3] || currentYear.toString();
          
          // Year inference
          if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (currentYear + 1).toString();
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
          name: 'Birmingham Symphony Hall',
          address: 'Broad Street, Birmingham B1 2EA',
          city: 'Birmingham'
        },
        latitude: 52.4796,
        longitude: -1.9126,
        city: 'Birmingham',
        category: 'Nightlife',
        source: 'Symphony Hall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Symphony Hall events`);
    formattedEvents.slice(0, 3).forEach(e => 
      console.log(`    ${e.title.substring(0, 40)} | ${e.date} ${e.imageUrl ? '🖼️' : ''}`)
    );
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Symphony Hall error:', error.message);
    return [];
  }
}

module.exports = scrapeSymphonyHall;
