async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }

    console.log(`🔍 Scraping events from ${this.name}...`);
    const events = [];
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 };
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      page.setDefaultNavigationTimeout(15000);

      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 };

      try {
        await page.waitForSelector(', .performance, article, -card, .performance-item', { timeout: 8000 };
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }

      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];

        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(', .performance, article, -card, .performance-item, .lineup-item'));

        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
          if (!title) return;

          const description = element.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, -date')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const venueText = element.querySelector('.venue, .location')?.textContent.trim() || '';

          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            venue: venueText
          };
        };

        return events;
      };

      console.log(`Found ${eventsData.length} potential events`);

      // If no events found, check festival dates on homepage
      if (eventsData.length === 0) {
        console.log('No events found on events page, checking homepage for festival dates');

        await page.goto('https://coastaljazz.ca/', { waitUntil: 'networkidle2', timeout: 15000 };

        const festivalData = await page.evaluate(() => {
          // Look for festival date information
          const datePattern = /(?:june|july)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
          const fullText = document.body.textContent;

          const dateMatch = fullText.match(datePattern);
          const dateText = dateMatch ? dateMatch[0] : '';

          // Look for a description
          const description = document.querySelector('p')?.textContent.trim() || '';

          // Look for an image
          const imageUrl = document.querySelector('img')?.src || '';

          return {
            title: 'Vancouver International Jazz Festival',
            description,
            dateText,
            imageUrl,
            sourceUrl: 'https://coastaljazz.ca/'
          };
        };

        if (festivalData.dateText) {
          console.log(`Found festival date: ${festivalData.dateText}`);
          eventsData.push(festivalData);
        }
      }

      // Process each event data
      for (const eventData of eventsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          continue;
        }

        // Generate event ID
        const eventId = this.generateEventId(eventData.title, dateInfo.startDate);

        // Create event object
        const event = this.createEventObject(
          eventId,
          eventData.title,
          eventData.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventData.imageUrl,
          eventData.sourceUrl,
          eventData.venue
        );

        // Add event to events array
        events.push(event);
      }

      console.log(`Found ${events.length} events from ${this.name}`);

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

module.exports = VancouverJazzFestEvents;