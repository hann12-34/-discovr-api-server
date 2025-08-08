extractVenue(text) {
    if (!text) return null;

    // Common venues for the festival
    const venues = [
      {
        keywords: ['roundhouse', 'community arts', 'recreation centre'],
        name: 'Roundhouse Community Arts & Recreation Centre',
        address: '181 Roundhouse Mews',
        city: city,
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 2W3',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/j2iYjXZqTLcZdvZZ7'
      },
      {
        keywords: ['scotiabank dance centre', 'dance centre'],
        name: 'Scotiabank Dance Centre',
        address: '677 Davie St',
        city: city,
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 2G6',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/bNvThEQDsi4W8TL38'
      },
      {
        keywords: ['vancouver playhouse'],
        name: 'Vancouver Playhouse',
        address: '600 Hamilton St',
        city: city,
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 2P1',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/KbidxJixaxTo8YLK9'
      }
    ];

    const lowerText = text.toLowerCase();

    for (const venue of venues) {
      for (const keyword of venue.keywords) {
        if (lowerText.includes(keyword)) {
          return venue;
        }
      }
    }

    return null;
  },

  /**
   * Main scraping function
   * @returns {Promise<Array>} - Array of event objects
   */
  async scrape(city) {
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

      // Extract performances
      const performances = await page.evaluate(() => {
        const performances = [];

        // Try different selectors for performances
        const performanceElements = Array.from(document.querySelectorAll(
          '.performance, , .show, article, .card, .program-item, -item'
        ));

        performanceElements.forEach(element => {
          // Extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }

          if (!title) return;

          // Extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .excerpt, .content');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          // Extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, time, .schedule');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }

          // If no date element found, search in the text
          if (!dateText) {
            const text = element.textContent;

            // Look for common date patterns
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
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

          // Extract venue information from text
          const venueInfo = element.textContent;

          // Skip items without essential information
          if (title && (dateText || description.length > 20)) {
            performances.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              venueInfo
            };
          }
        };

        return performances;
      };

      console.log(`Found ${performances.length} potential performances`);

      // Process performances
      for (const performance of performances) {
        // Skip if no date and very short description
        if (!performance.dateText && performance.description.length < 20) {
          console.log(`Skipping performance "${performance.title}" - insufficient information`);
          continue;
        }

        // Parse date
        const dateInfo = this.parseDateRange(performance.dateText);

        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping performance "${performance.title}" - invalid date: "${performance.dateText}"`);
          continue;
        }

        // Extract venue from description
        const venue = this.extractVenue(performance.venueInfo || performance.description);

        // Generate event ID
        const eventId = this.generateEventId(performance.title, dateInfo.startDate);

        // Create event object
        const event = this.createEventObject(
          eventId,
          performance.title,
          performance.description,
          dateInfo.startDate,
          dateInfo.endDate,
          performance.imageUrl,
          performance.sourceUrl,
          venue
        );

        // Add to events array
        events.push(event);
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

module.exports = DanceFestivalEvents;