/**
 * Le Studio TD Event Scraper
 *
 * Concert hall in Montreal's Quartier des spectacles (formerly L'Astral)
 * Website: https://lestudiotd.com/en
 */

const StudioTDEvents = {
  name: 'Le Studio TD',
  url: 'https://lestudiotd.com/en/events?display=grid',
  enabled: true,

  parseDateRange(daeventDateText) {
    if (!daeventDateText) return { startDate: null, endDate: null };

    // Clean the date string
    daeventDateText = daeventDateText.trim();

    try {
      const date = new Date(daeventDateText);
      if (!isNaN(date.getTime())) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 0, 0); // End at 11 PM for concerts

        return { startDate, endDate };
      }
    } catch (error) {
      console.log(`Error parsing date: ${daeventDateText}`);
    }

    return { startDate: null, endDate: null };
  },

  generateEventId(title, date) {
    const sanitizedTitle = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    return `studio-td-${sanitizedTitle}-${dateStr}`;
  },

  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title: title || 'Concert',
      description: description || 'Live performance at Le Studio TD',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: { ...RegExp.venue: {
        name: 'Le Studio TD',
        address: 'Corner of rue Sainte-Catherine and place des Festivals',
        city: city,
        province: 'QC',
        country: 'Canada',
        postalCode: 'H2X 1Y5',
        website: 'https://lestudiotd.com/',
        googleMapsUrl: 'https://goo.gl/maps/studiotdexample'
      }, city },,
      categories: ['live music', 'concert', 'entertainment', 'venue'],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'studio-td'
    };
  },

  async scrape(city) {
    const puppeteer = require('puppeteer');
    const events = [];
    let browser;

    try {
      console.log(`🎭 Scraping events from ${this.name}...`);

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
      };

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 };

      await page.goto(this.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      };

      // Wait for events to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      const eventData = await page.evaluate(() => {
        const events = [];

        // Look for event elements - adjust selectors based on actual site structure
        const eventItems = document.querySelectorAll('article, .event-item, .show-item, [class*="event"], [class*="show"]');

        eventItems.forEach(item => {
          // Extract title
          const titleElement = item.querySelector('h1, h2, h3, h4, .title, [class*="title"], a[href*="/events/"]');
          const title = titleElement?.textContent?.trim() || '';

          if (!title || title.length < 2) return;

          // Extract date
          const dateElement = item.querySelector('.date, [class*="date"], time, [datetime]');
          let dateText = '';
          if (dateElement) {
            dateText = dateElement.getAttribute('datetime') ||
                      dateElement.getAttribute('data-date') ||
                      dateElement.textContent?.trim() || '';
          }

          // Extract link
          const linkElement = item.querySelector('a[href*="/events/"], a[href*="evenko.ca"]');
          const href = linkElement?.getAttribute('href') || '';

          // Extract image
          const imgElement = item.querySelector('img');
          const imageUrl = imgElement?.getAttribute('src') || imgElement?.getAttribute('data-src') || '';

          // Extract description
          const descElement = item.querySelector('.description, .summary, p');
          const description = descElement?.textContent?.trim() || '';

          if (title && title.length > 2) {
            events.push({
              title: title,
              dateText: dateText,
              sourceUrl: href.startsWith('http') ? href : (href ? `https://lestudiotd.com${href}` : ''),
              description: description,
              imageUrl: imageUrl.startsWith('http') ? imageUrl : (imageUrl ? `https://lestudiotd.com${imageUrl}` : '')
            };
          }
        };

        // Also look for events in different structure - links with evenko
        const evenkoLinks = document.querySelectorAll('a[href*="evenko.ca"]');
        evenkoLinks.forEach(link => {
          const title = link.textContent?.trim() || '';
          if (title && title.length > 2 && !events.some(e => e.title === title)) {
            events.push({
              title: title,
              dateText: '',
              sourceUrl: link.getAttribute('href') || '',
              description: '',
              imageUrl: ''
            };
          }
        };

        return events;
      };

      console.log(`Found ${eventData.length} potential events`);

      // Process each event
      for (const event of eventData) {
        if (!event.title) continue;

        // For events without dates, set a future default date
        let dateInfo = { startDate: null, endDate: null };
        if (event.dateText) {
          dateInfo = this.parseDateRange(event.dateText);
        }

        if (!dateInfo.startDate) {
          // Set default future date if no date is available
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
          dateInfo.startDate = futureDate;
          dateInfo.endDate = new Date(futureDate);
          dateInfo.endDate.setHours(23, 0, 0);
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

module.exports = StudioTDEvents;
module.exports.scrapeEvents = StudioTDEvents.scrape;