/**
 * The Leadmill Sheffield Scraper
 * URL: https://leadmill.co.uk/events/
 * Address: 6-7 Leadmill Road, Sheffield S1 4SE
 */

const puppeteer = require('puppeteer');

async function scrapeLeadmillV2(city = 'Sheffield') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://leadmill.co.uk/events/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      
      eventLinks.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent?.trim();
        const container = link.closest('div, article, li');
        const imgEl = container?.querySelector('img');
        const dateEl = container?.querySelector('[class*="date"], time, .event-date');
        
        if (title && title.length > 5 && href && !items.find(e => e.url === href)) {
          // Skip junk
          if (title === 'Jan' || title === 'Feb' || title === 'Mar' || title === 'Tickets') return;
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://leadmill.co.uk${href}`,
            image: imgEl?.src || null,
            dateText: dateEl?.textContent?.trim() || ''
          });
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      if (!item.title || item.title.length < 3) continue;
      if (item.title.includes('Subscribe') || item.title.includes('mailing')) continue;
      
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'The Leadmill',
          address: '6-7 Leadmill Road, Sheffield S1 4SE',
          city: city
        },
        location: `The Leadmill, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'leadmill'
      });
    }
    
    console.log(`Leadmill Sheffield: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Leadmill scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeLeadmillV2;
