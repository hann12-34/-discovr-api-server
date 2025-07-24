/**
 * Piknic Électronik Event Scraper
 * 
 * Major outdoor electronic music festival at Parc Jean-Drapeau
 * Website: https://piknicelectronik.com/en
 */

const PiknicElektronikEvents = {
  name: 'Piknic Électronik',
  url: 'https://piknicelectronik.com/en/events',
  enabled: true,
  
  parseDateFromUrl(url) {
    // Extract date from URL format: /event/2025-piknic-DD-MM-YYYY
    const dateMatch = url.match(/\/event\/(\d{4})-piknic-(\d{2})-(\d{2})-(\d{4})/);
    if (dateMatch) {
      const [, year, day, month, ] = dateMatch;
      return new Date(`${year}-${month}-${day}`);
    }
    
    // Alternative format: /event/YYYY-piknic-DD-MM-YYYY
    const altMatch = url.match(/\/event\/\d{4}-piknic-(\d{2})-(\d{2})-(\d{4})/);
    if (altMatch) {
      const [, day, month, year] = altMatch;
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  },
  
  generateEventId(title, date) {
    const sanitizedTitle = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    return `piknic-electronik-${sanitizedTitle}-${dateStr}`;
  },
  
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, artists = []) {
    return {
      id,
      title: title || 'Piknic Électronik Event',
      description: description || 'Outdoor electronic music event at Parc Jean-Drapeau',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: {
        name: 'Parc Jean-Drapeau',
        address: '1 Circuit Gilles Villeneuve',
        city: 'Montreal',
        province: 'QC',
        country: 'Canada',
        postalCode: 'H3C 1A9',
        website: 'https://www.parcjeandrapeau.com/',
        googleMapsUrl: 'https://goo.gl/maps/parcjeandrapeau'
      },
      categories: ['electronic music', 'outdoor festival', 'techno', 'house', 'piknic'],
      performers: artists,
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'piknic-electronik'
    };
  },
  
  async scrape() {
    const puppeteer = require('puppeteer');
    const events = [];
    let browser;
    
    try {
      console.log(`🎪 Scraping events from ${this.name}...`);
      
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
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const eventData = await page.evaluate(() => {
        const events = [];
        
        // Look for event info links
        const infoLinks = document.querySelectorAll('a[href*="/event/"]');
        
        infoLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href || !href.includes('piknic')) return;
          
          // Get the section this link belongs to
          let section = link.closest('div, section');
          let attempts = 0;
          while (section && attempts < 10) {
            const artistLinks = section.querySelectorAll('a[href*="/artists/"]');
            if (artistLinks.length > 0) break;
            section = section.parentElement;
            attempts++;
          }
          
          if (!section) return;
          
          // Extract artists from this section
          const artistLinks = section.querySelectorAll('a[href*="/artists/"]');
          const artists = Array.from(artistLinks).map(artistLink => {
            return artistLink.textContent?.trim() || '';
          }).filter(name => name.length > 0);
          
          // Look for stage information
          const stageHeaders = section.querySelectorAll('h3');
          let stageName = '';
          stageHeaders.forEach(header => {
            const headerText = header.textContent?.trim() || '';
            if (headerText.includes('STAGE') || headerText.includes('FIZZ') || headerText.includes('NATIONAL BANK')) {
              stageName = headerText;
            }
          });
          
          // Look for time information
          const timeElements = section.querySelectorAll('*');
          const times = [];
          timeElements.forEach(el => {
            const text = el.textContent?.trim() || '';
            const timeMatch = text.match(/(\d{1,2}[Hh]\d{2})/);
            if (timeMatch) {
              times.push(timeMatch[1]);
            }
          });
          
          const fullUrl = href.startsWith('http') ? href : `https://piknicelectronik.com${href}`;
          
          events.push({
            sourceUrl: fullUrl,
            artists: artists,
            stageName: stageName,
            times: times,
            href: href
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventData.length} potential events`);
      
      // Process each event
      for (const event of eventData) {
        if (!event.artists || event.artists.length === 0) continue;
        
        // Parse date from URL
        const eventDate = this.parseDateFromUrl(event.href);
        if (!eventDate || isNaN(eventDate.getTime())) {
          console.log(`Skipping event - invalid date from URL: ${event.href}`);
          continue;
        }
        
        // Create start and end times (typical Piknic hours: 4pm-8pm)
        const startDate = new Date(eventDate);
        startDate.setHours(16, 0, 0, 0); // 4 PM
        
        const endDate = new Date(eventDate);
        endDate.setHours(20, 0, 0, 0); // 8 PM
        
        // Create title with stage and artists
        let title = 'Piknic Électronik';
        if (event.stageName) {
          title += ` - ${event.stageName}`;
        }
        
        // Add main artists to title
        const mainArtists = event.artists.slice(0, 3);
        if (mainArtists.length > 0) {
          title += ` feat. ${mainArtists.join(', ')}`;
        }
        
        const eventId = this.generateEventId(title, startDate);
        
        // Create description with all artists and times
        let description = `Outdoor electronic music event at Parc Jean-Drapeau.`;
        if (event.stageName) {
          description += ` Stage: ${event.stageName}.`;
        }
        if (event.artists.length > 0) {
          description += ` Artists: ${event.artists.join(', ')}.`;
        }
        if (event.times.length > 0) {
          description += ` Times: ${event.times.join(', ')}.`;
        }
        
        const eventObject = this.createEventObject(
          eventId,
          title,
          description,
          startDate,
          endDate,
          '', // No image URL available
          event.sourceUrl,
          event.artists
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

module.exports = PiknicElektronikEvents;
module.exports.scrapeEvents = PiknicElektronikEvents.scrape;
