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

      page.setDefaultNavigationTimeout(30000);

      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' };

      // Extract events
      const eventData = await page.evaluate(() => {
        const events = [];

        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .event-item, .party, .show, article, .card, .upcoming'
        ));

        eventElements.forEach(element => {
          let title = '';
          const titleElement = element.querySelector('h1, h2, h3, h4, .title, .event-title');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }

          if (!title) return;

          let description = '';
          const descElement = element.querySelector('p, .description, .details, .content');
          if (descElement) {
            description = descElement.textContent.trim();
          }

          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, time, .when');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }

          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i,
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

          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }

          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }

          if (title && (dateText || description.length > 10)) {
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

      console.log(`Found ${eventData.length} potential events`);

      // Process events
      for (const event of eventData) {
        if (!event.dateText) {
          console.log(`Skipping event "${event.title}" - no date information`);
          continue;
        }

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

module.exports = JetNightclubEvents;