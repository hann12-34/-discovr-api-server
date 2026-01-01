/**
 * O2 Academy Birmingham Events Scraper
 * Major live music venue - Academy Music Group site with MUI components
 * URL: https://www.academymusicgroup.com/o2academybirmingham/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeO2AcademyBirmingham(city = 'Birmingham') {
  console.log('🎸 Scraping O2 Academy Birmingham...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.academymusicgroup.com/o2academybirmingham/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Tailored extraction for Academy Music Group MUI-based site
    const events = await page.evaluate(() => {
      const results = [];
      const processed = new Set();
      
      // Find all event links - unique to this site structure
      const eventLinks = document.querySelectorAll('a[href*="/events/"]');
      
      eventLinks.forEach(link => {
        const href = link.href;
        
        // Skip non-event pages and duplicates
        if (!href.includes('/events/') || 
            href.endsWith('/events/') || 
            href.endsWith('/events') || 
            processed.has(href)) return;
        processed.add(href);
        
        // Navigate up DOM to find the card container with all event data
        let parent = link.parentElement;
        let eventData = null;
        
        for (let i = 0; i < 6 && parent; i++) {
          const imgs = parent.querySelectorAll('img');
          const fullText = parent.textContent;
          
          // Extract date - format: "27Dec" or "15 Jan 2025"
          const dateMatch = fullText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          
          // Extract title from URL slug (reliable method for this site)
          const urlParts = href.split('/');
          const slug = urlParts[urlParts.length - 1]
            .replace(/-tickets.*/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          
          // Find event image (exclude logos and icons)
          let imgSrc = null;
          imgs.forEach(img => {
            if (img.src && 
                !img.src.includes('logo') && 
                !img.src.includes('icon') &&
                img.src.startsWith('http') &&
                img.width > 50) {
              imgSrc = img.src;
            }
          });
          
          if (dateMatch && slug.length > 3) {
            eventData = {
              title: slug,
              day: dateMatch[1],
              month: dateMatch[2],
              year: dateMatch[3] || null,
              url: href,
              imageUrl: imgSrc
            };
            break;
          }
          parent = parent.parentElement;
        }
        
        if (eventData) {
          results.push(eventData);
        }
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
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    for (const event of events) {
      const day = event.day.padStart(2, '0');
      const month = months[event.month.toLowerCase().substring(0, 3)];
      
      // Year inference: if month is before current month, it's next year
      let year = event.year || currentYear.toString();
      if (!event.year && parseInt(month) < currentMonth) {
        year = (currentYear + 1).toString();
      }
      
      const isoDate = `${year}-${month}-${day}`;
      
      // Skip past events
      if (new Date(isoDate) < now) continue;
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'O2 Academy Birmingham',
          address: '16-18 Horsefair, Bristol Street, Birmingham B1 1DB',
          city: 'Birmingham'
        },
        latitude: 52.4744,
        longitude: -1.9008,
        city: 'Birmingham',
        category: 'Nightlife',
        source: 'O2 Academy Birmingham'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} O2 Academy Birmingham events`);
    formattedEvents.slice(0, 5).forEach(e => 
      console.log(`    ${e.title} | ${e.date} ${e.imageUrl ? '🖼️' : ''}`)
    );
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  O2 Academy Birmingham error:', error.message);
    return [];
  }
}

module.exports = scrapeO2AcademyBirmingham;
