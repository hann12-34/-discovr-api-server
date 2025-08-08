cleanHtmlContent(htmlContent) {
    if (!htmlContent) return '';

    // Remove HTML tags
    let text = htmlContent.replace(/<[^>]*>/g, ' ');

    // Replace multiple spaces, newlines with single space
    text = text.replace(/\s+/g, ' ');

    // Decode HTML entities
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#039;/g, "'");

    return text.trim();
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

      // Use shorter timeout
      page.setDefaultNavigationTimeout(20000);

      // First check the main Stanley Park page for featured events
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 20000 };

      // Extract featured events from main page
      const mainPageEvents = await page.evaluate(() => {
        const events = [];

        // Try different selectors for featured events and content blocks
        const eventElements = Array.from(document.querySelectorAll(
          '.feature, -feature, -listing, .content-block, .panel, .card'
        ));

        eventElements.forEach(element => {
          // Skip elements that are too small
          if (element.offsetHeight < 50) return;

          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }

          if (!title || title.toLowerCase().includes('search') || title.toLowerCase() === 'share') return;

          // Try to extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .text');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          // Try to extract date from text content
          let dateText = '';

          // Look for common date formats
          const allText = element.textContent;
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /\d{1,2}-\d{1,2}-\d{4}/
          ];

          for (const pattern of datePatterns) {
            const match = allText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }

          // Try to extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          // Try to extract link
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          if (title && (dateText || description.length > 50)) {
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

      console.log(`Found ${mainPageEvents.length} potential events on main page`);

      // Process each event from the main page
      for (const eventData of mainPageEvents) {
        // If we have date information
        if (eventData.dateText) {
          const dateInfo = this.parseDateRange(eventData.dateText);

          // Skip events with no valid dates
          if (!dateInfo.startDate || !dateInfo.endDate) {
            console.log(`Skipping main page event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
            continue;
          }

          // Extract location from description
          const location = this.extractLocation(eventData.description);

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
            location
          );

          // Add event to events array
          events.push(event);
        }
        // For events without date, but with a link, follow the link to get more info
        else if (eventData.sourceUrl && eventData.sourceUrl.includes('vancouver.ca')) {
          try {
            console.log(`Following link to: ${eventData.sourceUrl}`);
            const eventPage = await browser.newPage();
            await eventPage.setViewport({ width: 1280, height: 800 };
            await eventPage.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 15000 };

            // Extract detailed event info
            const eventDetails = await eventPage.evaluate(() => {
              // Try to find date information
              let dateText = '';

              // Check for structured date elements
              const dateElement = document.querySelector('.date, -date, time, .datetime');
              if (dateElement) {
                dateText = dateElement.textContent.trim();
              } else {
                // Try to extract date from general content
                const content = document.body.textContent;
                const datePatterns = [
                  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
                  /\d{1,2}\/\d{1,2}\/\d{4}/,
                  /\d{1,2}-\d{1,2}-\d{4}/
                ];

                for (const pattern of datePatterns) {
                  const match = content.match(pattern);
                  if (match) {
                    dateText = match[0];
                    break;
                  }
                }
              }

              // Get a better description if available
              let description = '';
              const descElement = document.querySelector('.description, .content, main p');
              if (descElement) {
                description = descElement.textContent.trim();
              }

              // Get a better image if available
              let imageUrl = '';
              const imgElement = document.querySelector('main img, .content img');
              if (imgElement && imgElement.src) {
                imageUrl = imgElement.src;
              }

              return {
                dateText,
                description: description || '',
                imageUrl: imageUrl || ''
              };
            };

            await eventPage.close();

            // Update event data with new details
            if (eventDetails.dateText) {
              eventData.dateText = eventDetails.dateText;
            }

            if (eventDetails.description && eventDetails.description.length > eventData.description.length) {
              eventData.description = eventDetails.description;
            }

            if (eventDetails.imageUrl && !eventData.imageUrl) {
              eventData.imageUrl = eventDetails.imageUrl;
            }

            // Now try to process the event with the updated information
            if (eventData.dateText) {
              const dateInfo = this.parseDateRange(eventData.dateText);

              // Skip events with no valid dates
              if (!dateInfo.startDate || !dateInfo.endDate) {
                console.log(`Skipping linked event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
                continue;
              }

              // Extract location from description
              const location = this.extractLocation(eventData.description);

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
                location
              );

              // Add event to events array
              events.push(event);
            }
          } catch (error) {
            console.error(`Error following link for event "${eventData.title}": ${error.message}`);
          }
        }
      }

      // Now check the main events calendar for park-related events
      console.log(`Navigating to events calendar: ${thissUrl}`);
      await page.goto(thissUrl, { waitUntil: 'networkidle2', timeout: 20000 };

      // Extract events from the calendar page
      const calendarEvents = await page.evaluate(() => {
        const events = [];

        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '-item, , .listing-item, .calendar-item, .col-sm-6'
        ));

        eventElements.forEach(element => {
          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }

          if (!title) return;

          // Skip non-Stanley Park events
          const elementText = element.textContent.toLowerCase();
          if (!elementText.includes('stanley park') && !elementText.includes('lost lagoon') &&
              !elementText.includes('second beach') && !elementText.includes('third beach') &&
              !elementText.includes('aquarium') && !elementText.includes('seawall') &&
              !elementText.includes('prospect point') && !elementText.includes('brockton point')) {
            return;
          }

          // Try to extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .text');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          // Try to extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, time, .datetime');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          } else {
            // Look for date formats in the text
            const allText = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{1,2}-\d{1,2}-\d{4}/
            ];

            for (const pattern of datePatterns) {
              const match = allText.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }

          // Try to extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          // Try to extract link
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          if (title && dateText) {
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

      console.log(`Found ${calendarEvents.length} potential Stanley Park events in calendar`);

      // Process each event from the calendar
      for (const eventData of calendarEvents) {
        const dateInfo = this.parseDateRange(eventData.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping calendar event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          continue;
        }

        // Extract location from description
        const location = this.extractLocation(eventData.description);

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
          location
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

module.exports = StanleyParkEvents;