cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .trim();
  },

  /**
   * Main scraping function
   * @returns {Promise<Array>} - Array of event objects
   */
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

      // Set shorter timeout
      page.setDefaultNavigationTimeout(30000);

      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' };

      // First, scrape exhibitions
      const exhibitions = await page.evaluate(() => {
        const exhibitions = [];

        // Try different selectors for exhibitions
        const exhibitionElements = Array.from(document.querySelectorAll(
          '.exhibition, .exhibition-item, -item, .card, article'
        ));

        exhibitionElements.forEach(element => {
          const titleElement = element.querySelector('h2, h3, h4, .title');
          if (!titleElement) return;

          const title = titleElement.textContent.trim();
          if (!title) return;

          // Extract description
          let description = '';
          const descElement = element.querySelector('.description, .excerpt, p');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          // Extract date range
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, .meta, time');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }

          // If no specific date element, try to find date in text
          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{4}-\d{2}-\d{2}/,
              /ongoing/i
            ];

            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }

          // Extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          // Extract URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          // Get event type
          let eventType = 'exhibition';

          // Only add if we have at minimum a title and either a date or description
          if (title && (dateText || description.length > 20)) {
            exhibitions.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              eventType
            };
          }
        };

        return exhibitions;
      };

      console.log(`Found ${exhibitions.length} potential exhibitions`);

      // Process each exhibition
      for (const exhibition of exhibitions) {
        // Skip if no date information and not "ongoing"
        if (!exhibition.dateText && !exhibition.description.toLowerCase().includes('ongoing')) {
          console.log(`Skipping exhibition "${exhibition.title}" - no date information found`);
          continue;
        }

        // Parse date information
        const dateInfo = this.parseDateRange(exhibition.dateText);

        // Skip events with no valid dates unless they're "ongoing"
        if ((!dateInfo.startDate || !dateInfo.endDate) &&
            !exhibition.dateText.toLowerCase().includes('ongoing') &&
            !exhibition.description.toLowerCase().includes('ongoing')) {
          console.log(`Skipping exhibition "${exhibition.title}" - invalid date: "${exhibition.dateText}"`);
          continue;
        }

        // Generate a unique event ID
        const eventId = this.generateEventId(exhibition.title, dateInfo.startDate);

        // Create event object
        const event = this.createEventObject(
          eventId,
          exhibition.title,
          exhibition.description,
          dateInfo.startDate,
          dateInfo.endDate,
          exhibition.imageUrl,
          exhibition.sourceUrl,
          exhibitionType
        );

        // Add to events array
        events.push(event);
      }

      // Now navigate to the events page to get specific events
      const eventsUrl = 'https://moa.ubc.ca/events/';
      console.log(`Navigating to events page: ${eventsUrl}`);
      await page.goto(eventsUrl, { waitUntil: 'networkidle2' };

      // Scrape events
      const specificEvents = await page.evaluate(() => {
        const events = [];

        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          ', -item, .card, article, .listing'
        ));

        eventElements.forEach(element => {
          const titleElement = element.querySelector('h2, h3, h4, .title');
          if (!titleElement) return;

          const title = titleElement.textContent.trim();
          if (!title) return;

          // Extract description
          let description = '';
          const descElement = element.querySelector('.description, .excerpt, p');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          // Extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, .meta, time');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }

          // If no specific date element, try to find date in text
          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{4}-\d{2}-\d{2}/
            ];

            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }

          // Extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          // Extract URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          // Try to determine event type based on content
          let eventType = '';
          const contentText = (title + ' ' + description).toLowerCase();
          if (contentText.includes('workshop')) {
            eventType = 'workshop';
          } else if (contentText.includes('talk') || contentText.includes('lecture')) {
            eventType = 'talk';
          } else if (contentText.includes('tour') || contentText.includes('guided')) {
            eventType = 'tour';
          } else if (contentText.includes('performance') || contentText.includes('music')) {
            eventType = 'performance';
          } else {
            eventType = 'event';
          }

          // Only add if we have at minimum a title and either a date or good description
          if (title && (dateText || description.length > 20)) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              eventType
            };
          }
        };

        return events;
      };

      console.log(`Found ${specificEvents.length} potential events`);

      // Process each event
      for (const eventData of specificEvents) {
        // Skip if no date information
        if (!eventData.dateText) {
          console.log(`Skipping event "${eventData.title}" - no date information found`);
          continue;
        }

        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" - invalid date: "${eventData.dateText}"`);
          continue;
        }

        // Generate a unique event ID
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
          eventDataType
        );

        // Check if this is a duplicate (same title and date)
        const isDuplicate = events.some(existingEvent =>
          existingEvent.title === event.title &&
          existingEvent.startDate.getTime() === event.startDate.getTime()
        );

        // Add event if not a duplicate
        if (!isDuplicate) {
          events.push(event);
        }
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

module.exports = AnthropologyMuseumEvents;