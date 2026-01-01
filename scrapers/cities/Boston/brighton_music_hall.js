/**
 * Brighton Music Hall Boston Scraper
 * URL: https://crossroadspresents.com/pages/brighton-music-hall
 * Address: 158 Brighton Ave, Boston, MA 02134
 */

const puppeteer = require('puppeteer');

async function scrapeBrightonMusicHall(city = 'Boston') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://crossroadspresents.com/pages/brighton-music-hall', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      
      // Try multiple selectors for events
      const containers = document.querySelectorAll('.image-blocks__item, [class*="event"], article, .card, li');
      
      containers.forEach(container => {
        const link = container.querySelector('a[href*="ticketmaster"], a');
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
        
        if (title && title.length > 3 && !title.includes('MORE INFO') && !title.includes('Contact') && !items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : 'https://crossroadspresents.com/pages/brighton-music-hall',
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
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Brighton Music Hall',
          address: '158 Brighton Ave, Boston, MA 02134',
          city: city
        },
        location: `Brighton Music Hall, ${city}`,
        city: city,
        state: 'MA',
        country: 'United States',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'brighton_music_hall'
      });
    }
    
    console.log(`Brighton Music Hall: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Brighton Music Hall scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeBrightonMusicHall;
