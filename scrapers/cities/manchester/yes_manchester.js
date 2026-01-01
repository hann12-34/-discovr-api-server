/**
 * YES Manchester Events Scraper
 * Multi-floor venue: Basement, Pink Room, Main Space
 * URL: https://www.yes-manchester.com/whats-on
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeYESManchester(city = 'Manchester') {
  console.log('🎸 Scraping YES Manchester...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.yes-manchester.com/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Get current year from page header
      const headerText = document.querySelector('.rotated_right h2, .section_header_h2')?.textContent || '';
      const yearMatch = headerText.match(/(\d{4})/);
      const pageYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      
      // Find all event listings
      document.querySelectorAll('.grid_item.listing').forEach(item => {
        try {
          // Get date from .pink element (e.g., "Fri 9 Jan")
          const dateEl = item.querySelector('.pink');
          const dateStr = dateEl?.textContent?.trim();
          if (!dateStr) return;
          
          // Get event details from .month_text_small
          const detailsEl = item.querySelector('.month_text_small');
          const detailsText = detailsEl?.textContent?.trim() || '';
          
          // Extract title - it's the main text content, often linked
          const titleLink = item.querySelector('a[href*="seetickets"], a[href*="ticket"]');
          const ticketUrl = titleLink?.href;
          
          // Parse venue and time from details (e.g., "Basement – 7PM")
          const venueMatch = detailsText.match(/(Basement|Pink Room|Main Space|Big Top)/i);
          const subVenue = venueMatch ? venueMatch[1] : 'YES';
          
          // Build title from the context
          const allText = item.textContent.replace(/\s+/g, ' ').trim();
          const titleMatch = allText.match(/\d+\s*\w+\s+(.+?)(?:Basement|Pink Room|Main Space|BUY|–|$)/i);
          let title = titleMatch ? titleMatch[1].trim() : '';
          
          // Clean up title
          title = title.replace(/BUY TICKETS?/gi, '').replace(/\s+/g, ' ').trim();
          
          if (!title || title.length < 3 || seen.has(title + dateStr)) return;
          seen.add(title + dateStr);
          
          results.push({
            title: title,
            dateStr: dateStr,
            url: ticketUrl || 'https://www.yes-manchester.com/whats-on',
            subVenue: subVenue,
            year: pageYear
          });
        } catch (e) {}
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
        // Parse date like "Fri 9 Jan" or "Sat 10 Jan"
        const dateMatch = event.dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = event.year || now.getFullYear();
          
          // If month is before current month, it's next year
          if (parseInt(month) < now.getMonth() + 1 && year === now.getFullYear()) {
            year = now.getFullYear() + 1;
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('logo')) ? event.imageUrl : null,
        venue: {
          name: `YES - ${event.subVenue}`,
          address: '38 Charles St, Manchester M1 7DB',
          city: 'Manchester'
        },
        latitude: 53.4770,
        longitude: -2.2380,
        city: 'Manchester',
        category: 'Nightlife',
        source: 'YES Manchester'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} YES Manchester events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  YES Manchester error:', error.message);
    return [];
  }
}

module.exports = scrapeYESManchester;
