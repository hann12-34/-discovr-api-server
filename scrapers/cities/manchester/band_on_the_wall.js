/**
 * Band on the Wall Manchester Events Scraper
 * Uses Vue.js app - needs longer wait for JS rendering
 * URL: https://bandonthewall.org/whats-on/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBandOnTheWall(city = 'Manchester') {
  console.log('🎵 Scraping Band on the Wall...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en;q=0.9' });

    await page.goto('https://bandonthewall.org/whats-on/', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait longer for Vue.js app to fully render
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollBy(0, 2000));
    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all links to /events/ pages
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url === 'https://bandonthewall.org/events/' || url.includes('seetickets')) return;
        seen.add(url);
        
        // Find parent container
        let container = link.closest('div, article') || link.parentElement;
        for (let i = 0; i < 5 && container; i++) {
          // Look for date info
          const textContent = container.textContent || '';
          const dateMatch = textContent.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          // Get title from URL slug or heading
          let title = '';
          const headingEl = container.querySelector('h2, h3, h4, [class*="title"], [class*="heading"]');
          if (headingEl) {
            title = headingEl.textContent.trim();
          } else {
            // Extract from URL
            const urlParts = url.split('/events/')[1];
            if (urlParts) {
              title = urlParts.replace(/\/$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
          }
          
          if (title && title.length > 3 && title.length < 150) {
            // Get image
            const imgEl = container.querySelector('img');
            const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
            
            results.push({
              title,
              dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || ''}`.trim() : '',
              url,
              imageUrl
            });
            break;
          }
          container = container.parentElement;
        }
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        if (event.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = event.dateStr.substring(0, 10);
        } else {
          const dateMatch = event.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            let year = dateMatch[3] || now.getFullYear().toString();
            if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
              year = (now.getFullYear() + 1).toString();
            }
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Band on the Wall',
          address: '25 Swan St, Manchester M4 5JZ',
          city: 'Manchester'
        },
        latitude: 53.4850,
        longitude: -2.2360,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'Band on the Wall'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Band on the Wall events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Band on the Wall error:', error.message);
    return [];
  }
}

module.exports = scrapeBandOnTheWall;
