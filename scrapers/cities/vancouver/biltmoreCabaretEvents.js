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

      // Use shorter timeout
      page.setDefaultNavigationTimeout(15000);

      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 };

      try {
        await page.waitForSelector('-listing, , -item, item', { timeout: 8000 };
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }

      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];

        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '-listing, , -item, item, article'
        ));

        eventElements.forEach(element => {
          const title = element.querySelector('.title, h2, h3, h4, -name, -title')?.textContent.trim() || '';
          if (!title) return;

          const description = element.querySelector('.description, p, -description, .excerpt')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, -date, .datetime')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';

          // Try to extract price information
          let priceText = '';
          const priceElement = element.querySelector('.price, .ticket-price, .cost');
          if (priceElement) {
            priceText = priceElement.textContent.trim();
          } else {
            // Try to find price in description
            const priceMatch = description.match(/\$\d+/);
            if (priceMatch) {
              priceText = priceMatch[0];
            }
          }

          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            priceText
          };
        };

        return events;
      };

      console.log(`Found ${eventsData.length} potential events`);

      // Process each event data
      for (const eventData of eventsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          continue;
        }

        // Extract price
        const price = this.extractPrice(eventData.priceText);

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
          price
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

module.exports = BiltmoreCabaretEvents;