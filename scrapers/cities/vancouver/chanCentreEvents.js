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
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 };
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(20000);

      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, {
        waitUntil: 'networkidle2',
        timeout: 20000
      };

      // Wait for events to load
      try {
        await page.waitForSelector(', -item, article, -list-item', { timeout: 10000 };
      } catch (error) {
        console.log('Could not find event elements using standard selectors, trying to proceed anyway');
      }

      // Extract events data
      console.log('Extracting events data...');
      const eventsData = await page.evaluate(() => {
        const events = [];

        // Look for event elements with various possible selectors
        const eventElements = Array.from(document.querySelectorAll(', -item, article, -list-item, -preview'));

        eventElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .title, -title');
          const title = titleElement ? titleElement.textContent.trim() : '';

          if (!title) return; // Skip events without titles

          // Extract description
          const descriptionElement = element.querySelector('p, .description, .excerpt, .summary');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';

          // Extract date
          const dateElement = element.querySelector('.date, -date, time, .datetime');
          const dateText = dateElement ? dateElement.textContent.trim() : '';

          // Extract image URL
          let imageUrl = '';
          const imageElement = element.querySelector('img');
          if (imageElement && imageElement.src) {
            imageUrl = imageElement.src;
          }

          // Extract source URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a[href]');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          // Only add events with title
          if (title) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl
            };
          }
        };

        return events;
      };

      console.log(`Found ${eventsData.length} potential events`);

      // Process each event
      for (const eventData of eventsData) {
        const { title, description, dateText, imageUrl, sourceUrl } = eventData;

        let eventDetails = {
          title,
          description,
          dateText,
          imageUrl,
          sourceUrl
        };

        // If we have a source URL, visit the detail page to get more information
        if (sourceUrl) {
          console.log(`Visiting event detail page: ${sourceUrl}`);

          try {
            await page.goto(sourceUrl, {
              waitUntil: 'networkidle2',
              timeout: 15000
            };

            // Extract detailed event information
            const detailData = await page.evaluate(() => {
              // Extract title
              const title = document.querySelector('h1, -title, .title')?.textContent.trim() || '';

              // Extract description
              const descriptionElement = document.querySelector('-description, .description, .content');
              const description = descriptionElement ? descriptionElement.textContent.trim() : '';

              // Extract date
              const dateElement = document.querySelector('-date, .date, time, .datetime');
              const dateText = dateElement ? dateElement.textContent.trim() : '';

              // Try to find date in other elements if not found
              if (!dateText) {
                // Look for date patterns in the page text
                const pageText = document.body.textContent;
                const datePatterns = [
                  /(?:date|when):\s*([^\n]+)/i,
                  /(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/i,
                  /(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i
                ];

                for (const pattern of datePatterns) {
                  const match = pageText.match(pattern);
                  if (match && match[1]) {
                    return {
                      title,
                      description,
                      dateText: match[1].trim(),
                      imageUrl: document.querySelector('-image img, .featured-image img')?.src || ''
                    };
                  }
                }
              }

              return {
                title,
                description,
                dateText,
                imageUrl: document.querySelector('-image img, .featured-image img')?.src || ''
              };
            };

            // Update event details with more complete information from the detail page
            if (detailData.title) eventDetails.title = detailData.title;
            if (detailData.description) eventDetails.description = detailData.description;
            if (detailData.dateText) eventDetails.dateText = detailData.dateText;
            if (detailData.imageUrl) eventDetails.imageUrl = detailData.imageUrl;
          } catch (error) {
            console.log(`Error accessing event detail page: ${error.message}`);
          }
        }

        // Parse date information
        const dateInfo = this.parseDateRange(eventDetails.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventDetails.title}" due to invalid date: "${eventDetails.dateText}"`);
          continue;
        }

        // Generate event ID
        const eventId = this.generateEventId(eventDetails.title, dateInfo.startDate);

        // Create event object
        const event = this.createEventObject(
          eventId,
          eventDetails.title,
          eventDetails.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventDetails.imageUrl,
          eventDetails.sourceUrl || this.url
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

module.exports = ChanCentreEvents;