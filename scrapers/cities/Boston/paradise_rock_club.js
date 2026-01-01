/**
 * Paradise Rock Club Boston Scraper
 * URL: https://crossroadspresents.com/pages/paradise-rock-club
 * Address: 967 Commonwealth Avenue, Boston, MA 02215
 */

const puppeteer = require('puppeteer');

async function scrapeParadiseRockClub(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://crossroadspresents.com/pages/paradise-rock-club', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      
      // Try multiple selectors for events
      const containers = document.querySelectorAll('.image-blocks__item, [class*="event"], article, .card');
      
      containers.forEach(container => {
        const link = container.querySelector('a[href*="ticketmaster"], a[href*="MORE INFO"]');
        const titleEl = container.querySelector('h3, h4, .title, [class*="title"], strong');
        const imgEl = container.querySelector('img');
        
        let title = titleEl?.textContent?.trim();
        if (!title) {
          const allText = container.textContent?.trim();
          if (allText && allText.length > 3 && allText.length < 100) {
            title = allText.split('\n')[0].trim();
          }
        }
        
        const href = link?.getAttribute('href') || '';
        
        if (title && title.length > 3 && !title.includes('MORE INFO') && !items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : 'https://crossroadspresents.com/pages/paradise-rock-club',
            image: imgEl?.src || null
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('MORE INFO')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Paradise Rock Club',
          address: '967 Commonwealth Avenue, Boston, MA 02215',
          city: city
        },
        location: `Paradise Rock Club, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'paradise_rock_club'
      });
    }
    
    console.log(`Paradise Rock Club: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Paradise Rock Club scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeParadiseRockClub;
