/**
 * Brudenell Social Club Leeds Events Scraper
 * URL: https://www.brudenellsocialclub.co.uk/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBrudenellSocial(city = 'Leeds') {
  console.log('🎸 Scraping Brudenell Social Club...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.brudenellsocialclub.co.uk/whats-on', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event links on /whats-on/ pages
      document.querySelectorAll('a[href*="/whats-on/"]').forEach(link => {
        const url = link.href;
        if (!url || seen.has(url) || url === 'https://www.brudenellsocialclub.co.uk/whats-on/' || url.endsWith('/whats-on/') || url.endsWith('/whats-on')) return;
        seen.add(url);
        
        // Go up DOM tree to find event container with title and date
        let container = link.parentElement;
        for (let i = 0; i < 8 && container; i++) {
          const textContent = container.textContent || '';
          
          // Look for date pattern like "Saturday 3rd January 2026"
          const dateMatch = textContent.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
          
          if (dateMatch && textContent.length > 20 && textContent.length < 500) {
            // Extract title - first significant line of text
            const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 3);
            let title = lines[0] || '';
            
            // Clean up title
            title = title.replace(/\s+/g, ' ').trim();
            
            if (title && title.length > 3 && title.length < 100) {
              const imgEl = container.querySelector('img');
              const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
              
              results.push({
                title,
                dateStr: `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`,
                url,
                imageUrl
              });
              break;
            }
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
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Brudenell Social Club',
          address: '33 Queens Rd, Leeds LS6 1NY',
          city: 'Leeds'
        },
        latitude: 53.8020,
        longitude: -1.5670,
        city: 'Leeds',
        category: 'Nightlife',
        source: 'Brudenell Social Club'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Brudenell Social Club events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Brudenell Social Club error:', error.message);
    return [];
  }
}

module.exports = scrapeBrudenellSocial;
