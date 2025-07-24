/**
 * Newspeak Montreal Event Scraper
 * 
 * Avant-garde electronic music nightclub in Montreal
 * Website: https://www.newspeakmtl.com/
 */

const NewspeakMontrealEvents = {
  name: 'Newspeak Montreal',
  url: 'https://www.newspeakmtl.com/',
  enabled: true,
  
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    // Clean the date string
    dateString = dateString.trim();
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59); // End of day for nightclub events
        
        return { startDate, endDate };
      }
    } catch (error) {
      console.log(`Error parsing date: ${dateString}`);
    }
    
    return { startDate: null, endDate: null };
  },
  
  generateEventId(title, date) {
    const sanitizedTitle = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    return `newspeak-montreal-${sanitizedTitle}-${dateStr}`;
  },
  
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title: title || 'Event',
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: {
        name: 'Newspeak',
        address: '1403 Rue Sainte-Élisabeth',
        city: 'Montreal',
        province: 'QC',
        country: 'Canada',
        postalCode: 'H2X 2Z9',
        website: 'https://www.newspeakmtl.com/',
        googleMapsUrl: 'https://goo.gl/maps/newspeakexample'
      },
      categories: ['electronic music', 'techno', 'house', 'nightclub', 'avant-garde'],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'newspeak-montreal'
    };
  },
  
  async scrape() {
    const puppeteer = require('puppeteer');
    const events = [];
    let browser;
    
    try {
      console.log(`🎵 Scraping events from ${this.name}...`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security',
          '--disable-features=TranslateUI',
          '--disable-extensions',
          '--ignore-ssl-errors=yes',
          '--ignore-ssl-errors-spki-list',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
          '--disable-http2'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 });
      
      await page.goto(this.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Wait for events to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const eventData = await page.evaluate(() => {
        const events = [];
        
        // Look for event links in the main content
        const eventLinks = document.querySelectorAll('a[href*="/evenements/"]');
        
        eventLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href) return;
          
          const title = link.textContent?.trim() || '';
          if (!title || title.length < 2) return;
          
          // Skip if it looks like a duplicate or navigation element
          if (title.toLowerCase().includes('newspeak') && title.length < 20) return;
          
          // Extract date from URL if possible (format: /evenements/2025-MM-DD-event)
          const dateMatch = href.match(/\/evenements\/(\d{4}-\d{2}-\d{2})-/);
          let dateText = '';
          if (dateMatch) {
            dateText = dateMatch[1];
          }
          
          // Get full URL
          const fullUrl = href.startsWith('http') ? href : `https://www.newspeakmtl.com${href}`;
          
          events.push({
            title: title,
            dateText: dateText,
            sourceUrl: fullUrl,
            description: '',
            imageUrl: ''
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventData.length} potential events`);
      
      // Process each event
      for (const event of eventData) {
        if (!event.title) continue;
        
        // Parse date
        const dateInfo = this.parseDateRange(event.dateText);
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${event.title}" - invalid date: "${event.dateText}"`);
          continue;
        }
        
        const eventId = this.generateEventId(event.title, dateInfo.startDate);
        
        const eventObject = this.createEventObject(
          eventId,
          event.title,
          event.description,
          dateInfo.startDate,
          dateInfo.endDate,
          event.imageUrl,
          event.sourceUrl
        );
        
        events.push(eventObject);
      }
      
      console.log(`Found ${events.length} total events from ${this.name}`);
      
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return events;
  }
};

module.exports = NewspeakMontrealEvents;
module.exports.scrapeEvents = NewspeakMontrealEvents.scrape;
