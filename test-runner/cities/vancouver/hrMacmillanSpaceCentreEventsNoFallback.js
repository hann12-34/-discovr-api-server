/**
 * HR MacMillan Space Centre Events Scraper (No-Fallback Version)
 * Scrapes events from the HR MacMillan Space Centre in Vancouver
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class SpaceCentreEvents {
  /**
   * Constructor for the Space Centre Events scraper
   * @param {Object} options - Configuration options
   * @param {boolean} options.diagnosticMode - Enable diagnostic mode for testing
   * @param {boolean} options.strictValidation - Enforce strict validation (default: true)
   */
  constructor(options = {}) {
    // Base URL for the Space Centre website
    this.baseUrl = 'https://www.spacecentre.ca';
    this.name = 'H.R. MacMillan Space Centre Events (No Fallback)';
    
    // Configure operational modes
    this.diagnosticMode = options.diagnosticMode || false;
    this.strictValidation = options.strictValidation !== false; // Default to true
    
    if (this.diagnosticMode) {
      console.log('='.repeat(60));
      console.log('DIAGNOSTIC MODE ENABLED FOR SPACE CENTRE EVENTS SCRAPER');
      console.log('Detailed logs will be output for debugging purposes');
      console.log('='.repeat(60));
    }
    
    // Venue information for the events
    this.venueInfo = {
      name: 'H.R. MacMillan Space Centre',
      address: '1100 Chestnut St, Vancouver, BC V6J 3J9',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      phone: '604-738-7827',
      website: 'https://www.spacecentre.ca/'
    };
    
    this.sourceIdentifier = 'hr-macmillan-space-centre';
    this.url = 'https://www.spacecentre.ca/';
    this.debugDir = path.join(process.cwd(), 'debug', 'space-centre');
    
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      try {
        fs.mkdirSync(this.debugDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create debug directory: ${error.message}`);
      }
    }
  }
  
  /**
   * Main scraper method
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`🔍 Scraping ${this.name}...`);
    let browser = null;
    let page = null;
    
    try {
      console.log('Launching browser with puppeteer-extra and stealth plugin...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
        ]
      });

      page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // First navigate to the main page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      await this._saveDebugInfo(page, 'homepage');

      // Try to find events and show pages from navigation
      console.log('Looking for event and show pages from navigation...');
      const eventPages = await this._findEventPages(page);
      
      // Extract events from all found pages
      const allEvents = [];
      
      // Visit each event page and extract events
      for (const eventPage of eventPages) {
        try {
          console.log(`Navigating to ${eventPage.url}`);
          await page.goto(eventPage.url, { waitUntil: 'networkidle2' });
          
          // Wait for a bit to ensure content is loaded
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Extract events based on page type
          const pageEvents = await this._extractEvents(
            page, 
            eventPage.type === 'show', 
            eventPage.type === 'exhibit'
          );
          
          if (pageEvents && pageEvents.length > 0) {
            console.log(`Found ${pageEvents.length} events on page ${eventPage.url}`);
            allEvents.push(...pageEvents);
          } else {
            console.log(`No events found on page ${eventPage.url}`);
          }
        } catch (pageError) {
          console.error(`Error processing page ${eventPage.url}: ${pageError.message}`);
          await this._saveDebugInfo(page, `error-page-${eventPage.type}`);
        }
      }
      
      // Process events
      console.log(`\nTotal raw events extracted: ${allEvents.length}`);
      
      // Deduplicate events with our enhanced URL normalization
      console.log('\nApplying URL normalization and deduplication...');
      const uniqueEvents = this._removeDuplicateEvents(allEvents);
      console.log(`After removing duplicates: ${uniqueEvents.length} events`);
      
      // Print validation criteria
      console.log('\nApplying strict no-fallback validation with criteria:');
      console.log(' - Must have non-empty, non-placeholder title');
      console.log(' - Must have valid date information or be marked as an exhibit');
      console.log(' - Must have valid URL on Space Centre domain');
      console.log(' - Must have substantial description (not placeholder)');
      console.log(' - Must achieve minimum detail score based on completeness');
      console.log(' - Must not contain synthetic/placeholder content');
      console.log(' - Must have reasonable date values (not too far in past/future)');
      console.log(' - Must have relevant space-related keywords for non-exhibits');
      console.log(' - Must not resemble navigation or structural elements');
      console.log(' - Must not have excessive capitalization or formatting issues');
      console.log(' - Must not contain suspiciously generic or repetitive content');
      
      // Log events before validation
      if (uniqueEvents.length > 0) {
        console.log('\nEvents before validation:');
        uniqueEvents.forEach((event, i) => {
          let qualityMarker = '';
          
          // Calculate a quality score for display purposes with enhanced authenticity metrics
          let qualityScore = 0;
          let authenticityScore = 0;
          
          // URL quality
          if (event.url && event.url.includes('spacecentre.ca')) {
            qualityScore += 3; // Strong indicator
            authenticityScore += 3;
          } else if (event.url && (event.url.includes('space-centre') || event.url.includes('macmillan'))) {
            qualityScore += 2; // Good indicator
            authenticityScore += 2;
          } else if (event.url) {
            qualityScore += 1; // Has URL but not Space Centre specific
          }
          
          // Description quality
          if (event.description) {
            if (event.description.length > 150) {
              qualityScore += 3; // Substantial description
            } else if (event.description.length > 50) {
              qualityScore += 2; // Decent description
            } else {
              qualityScore += 1; // Basic description
            }
            
            // Check for space-related content in description
            const lowercaseDesc = event.description.toLowerCase();
            if (lowercaseDesc.includes('space centre') || 
                lowercaseDesc.includes('spacecentre') ||
                lowercaseDesc.includes('macmillan')) {
              authenticityScore += 2; // Explicit Space Centre mentions
            } else if (/planet|star|galaxy|cosmos|astronomy|planetarium|telescope/.test(lowercaseDesc)) {
              authenticityScore += 1; // Space-related content
            }
          }
          
          // Date quality
          if (event.startDate && event.endDate) {
            qualityScore += 2; // Complete date range
          } else if (event.startDate) {
            qualityScore += 1; // At least start date
          }
          
          // Image quality
          if (event.image && (event.image.includes('spacecentre') || event.image.includes('space-centre'))) {
            qualityScore += 2; // Space Centre image
            authenticityScore += 1;
          } else if (event.image) {
            qualityScore += 1; // Has some image
          }
          
          // Title authenticity
          if (event.title && (/planetarium|space centre|macmillan|astronomy|observatory/i.test(event.title))) {
            authenticityScore += 2; // Strong space-related title
          }
          
          // Additional metadata
          if (event.categories && event.categories.length > 0) qualityScore += 1;
          if (event.location && event.location.toLowerCase().includes('space centre')) authenticityScore += 1;
          
          // Final quality determination
          if (qualityScore >= 8 && authenticityScore >= 3) {
            qualityMarker = '✅'; // High quality, authentic
          } else if (qualityScore >= 5 && authenticityScore >= 1) {
            qualityMarker = '✓'; // Good quality, likely authentic
          } else if (qualityScore >= 3) {
            qualityMarker = '⚠️'; // Basic quality, needs verification
          } else {
            qualityMarker = '❌'; // Poor quality, likely synthetic
          }
          
          console.log(`${i + 1}. ${qualityMarker} ${event.title}`);
          console.log(`   Date: ${event.rawDateText || 'N/A'}`);
          console.log(`   Start: ${event.startDate ? event.startDate.toISOString() : 'N/A'}`);
          console.log(`   End: ${event.endDate ? event.endDate.toISOString() : 'N/A'}`);
          console.log(`   URL: ${event.url || 'Missing'}`);
          console.log(`   Image: ${event.image ? 'Yes' : 'No'}`);
          console.log(`   Description: ${event.description ? `${event.description.substring(0, 50)}${event.description.length > 50 ? '...' : ''}` : 'Missing'}`);
          console.log(`   Categories: ${event.categories ? event.categories.join(', ') : 'None'}`);
          console.log(`   --------------------------`);
        });
      } else {
        console.log('No events found before validation. Please check the debug information.');
      }
      
      // Apply strict no-fallback validation with enhanced statistics tracking
      const validationResult = this._validateEvents(uniqueEvents);
      const validEvents = validationResult.events;
      const rejectionStats = validationResult.stats;
      
      // Log validation results with detailed statistics
      console.log('\n📊 Validation Results:');
      console.log(`- Total events extracted: ${allEvents.length}`);
      console.log(`- After deduplication: ${uniqueEvents.length}`);
      console.log(`- Events passing strict validation: ${validEvents.length} (${Math.round(validEvents.length/uniqueEvents.length*100)}%)`);
      console.log(`- Events rejected: ${rejectionStats.total}`);
      
      // Display detailed rejection statistics
      if (rejectionStats.total > 0) {
        console.log('\n🛠 Rejection Reasons:');
        if (rejectionStats.missingTitle > 0) console.log(`- Missing titles: ${rejectionStats.missingTitle}`);
        if (rejectionStats.missingDate > 0) console.log(`- Missing dates: ${rejectionStats.missingDate}`);
        if (rejectionStats.placeholderTitle > 0) console.log(`- Placeholder titles: ${rejectionStats.placeholderTitle}`);
        if (rejectionStats.shortTitle > 0) console.log(`- Too short titles: ${rejectionStats.shortTitle}`);
        if (rejectionStats.navigationContent > 0) console.log(`- Navigation/footer content: ${rejectionStats.navigationContent}`);
        if (rejectionStats.lowDetailScore > 0) console.log(`- Insufficient details: ${rejectionStats.lowDetailScore}`);
        if (rejectionStats.insufficientDescription > 0) console.log(`- Insufficient descriptions: ${rejectionStats.insufficientDescription}`);
        if (rejectionStats.placeholderDescription > 0) console.log(`- Placeholder descriptions: ${rejectionStats.placeholderDescription}`);
        if (rejectionStats.syntheticContent > 0) console.log(`- Synthetic content: ${rejectionStats.syntheticContent}`);
        if (rejectionStats.invalidDateRange > 0) console.log(`- Invalid date ranges: ${rejectionStats.invalidDateRange}`);
        if (rejectionStats.excessiveCapitalization > 0) console.log(`- Excessive capitalization: ${rejectionStats.excessiveCapitalization}`);
        if (rejectionStats.unrelevantContent > 0) console.log(`- Unrelevant content: ${rejectionStats.unrelevantContent}`);
      }
      
      // Categorize validated events by type for reporting
      const eventsByType = {
        exhibits: validEvents.filter(e => e.categories && e.categories.includes('Exhibit')).length,
        shows: validEvents.filter(e => e.categories && e.categories.includes('Show')).length,
        programs: validEvents.filter(e => !(e.categories && (e.categories.includes('Exhibit') || e.categories.includes('Show')))).length
      };
      
      if (validEvents.length > 0) {
        console.log('\n🔍 Validated Event Types:');
        console.log(`- Exhibits: ${eventsByType.exhibits}`);
        console.log(`- Shows: ${eventsByType.shows}`);
        console.log(`- Programs/Events: ${eventsByType.programs}`);
        console.log('\n✅ Successfully validated authentic Space Centre events.');
        
        // Log sample of validated events
        if (validEvents.length > 0) {
          console.log('\n📋 Sample of validated events:');
          validEvents.slice(0, Math.min(3, validEvents.length)).forEach((event, i) => {
            console.log(`${i + 1}. ${event.title}`);
            console.log(`   Date: ${event.startDate ? event.startDate.toISOString().split('T')[0] : 'N/A'} - ${event.endDate ? event.endDate.toISOString().split('T')[0] : 'N/A'}`);
            console.log(`   URL: ${event.url || 'N/A'}`);
          });
        }
      } else {
        console.log('\n⚠️ NO VALID EVENTS passed strict validation criteria.');
        console.log('Adhering to strict no-fallback policy: NO synthetic or placeholder events will be returned.');
        console.log('\n🔧 Troubleshooting recommendations:');
        console.log(' - Check the website structure in debug screenshots');
        console.log(' - Review rejected events in the logs to see why they failed validation');
        console.log(' - Verify Space Centre event pages are accessible');
        console.log(' - Examine CSS selectors if website structure has changed');
        console.log(' - Review the validation thresholds if authentic events are being filtered out');
      }
      
      // Report overall scraper health
      const extractionRate = allEvents.length > 0 ? validEvents.length / allEvents.length : 0;
      console.log('\n🏥 Scraper Health Check:');
      if (extractionRate >= 0.5) {
        console.log('✅ GOOD: More than 50% of extracted events passed validation');
      } else if (extractionRate > 0) {
        console.log('⚠️ WARNING: Less than 50% of extracted events passed validation');
        console.log('   This may indicate website changes or increased synthetic content');
      } else if (allEvents.length > 0) {
        console.log('❌ CRITICAL: Events were found but none passed strict validation');
        console.log('   This may indicate major website changes or extraction issues');
      } else {
        console.log('❌ CRITICAL: No events were extracted at all');
        console.log('   This may indicate site is down or major structural changes');
      }
      
      console.log(`🪐 Successfully scraped ${validEvents.length} events from ${this.name}`);
      return validEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);

      // Save debug info
      if (page) {
        try {
          await this._saveDebugInfo(page, 'error-scrape');
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
      }

      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error(`Failed to close browser: ${closeError.message}`);
        }
      }
    }
  }

  /**
   * Find event pages from the navigation
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event page objects with url and type
   */
  async _findEventPages(page) {
    console.log('Finding event pages from navigation...');
    
    // Get all links from navigation that might lead to event pages
    const eventPages = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const eventLinks = [];
      
      // Keywords to identify relevant pages - expanded for better coverage
      const showKeywords = ['planetarium', 'show', 'theatre', 'theater', 'movie', 'film', 'screening', 'presentation'];
      const exhibitKeywords = ['exhibit', 'gallery', 'museum', 'display', 'installation', 'showcase', 'collection'];
      const eventKeywords = ['event', 'program', 'workshop', 'camp', 'activity', 'calendar', 'class', 'talk', 'lecture', 'series', 'session', 'course', 'experience', 'tour', 'visit'];
      
      // Keywords that indicate it's not an event page but navigation/utility
      const excludeKeywords = ['login', 'sign in', 'account', 'cart', 'checkout', 'search', 'contact', 'about us', 
                             'terms', 'policy', 'faq', 'help', 'support', 'donate', 'ticket', 'admission',
                             'hours', 'directions', 'parking', 'sitemap', 'subscribe', 'newsletter'];
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.toLowerCase();
        
        // Skip if not a valid link
        if (!href || href.startsWith('#') || href.includes('javascript:') || 
            href.includes('mailto:') || href.includes('tel:')) {
          return;
        }
        
        // Skip if it matches exclude keywords (navigation/utility pages)
        if (excludeKeywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          return;
        }
        
        // Skip non-Space Centre URLs - strict no-fallback policy
        if (!href.includes('spacecentre.ca') && 
            !href.includes('space-centre') && 
            !href.startsWith('/')) {
          return;
        }
        
        // Determine if this is a relevant page
        let type = null;
        
        if (showKeywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          type = 'show';
        } else if (exhibitKeywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          type = 'exhibit';
        } else if (eventKeywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          type = 'event';
        }
        
        // Only add relevant pages
        if (type) {
          // Convert relative URLs to absolute
          const url = new URL(href, window.location.origin).href;
          
          // Don't add duplicates
          if (!eventLinks.some(link => link.url === url)) {
            eventLinks.push({
              url,
              type,
              text: text.trim()
            });
          }
        }
      });
      
      console.log(`Found ${eventLinks.length} potential event pages`);
      return eventLinks;
    });
    
    // Add some specific pages that might not be in the navigation
    // Comprehensive list of potential Space Centre event pages with explicit typing
    const specificPages = [
      // Main event pages
      { url: 'https://www.spacecentre.ca/events/', type: 'event' },
      { url: 'https://www.spacecentre.ca/calendar/', type: 'event' },
      { url: 'https://www.spacecentre.ca/whats-on/', type: 'event' },
      { url: 'https://www.spacecentre.ca/upcoming/', type: 'event' },
      
      // Show pages
      { url: 'https://www.spacecentre.ca/planetarium-shows/', type: 'show' },
      { url: 'https://www.spacecentre.ca/shows/', type: 'show' },
      { url: 'https://www.spacecentre.ca/planetarium/', type: 'show' },
      { url: 'https://www.spacecentre.ca/laser-shows/', type: 'show' },
      
      // Exhibit pages
      { url: 'https://www.spacecentre.ca/exhibits/', type: 'exhibit' },
      { url: 'https://www.spacecentre.ca/galleries/', type: 'exhibit' },
      { url: 'https://www.spacecentre.ca/permanent-exhibits/', type: 'exhibit' },
      { url: 'https://www.spacecentre.ca/current-exhibits/', type: 'exhibit' },
      
      // Program pages
      { url: 'https://www.spacecentre.ca/programs/', type: 'event' },
      { url: 'https://www.spacecentre.ca/courses/', type: 'event' },
      { url: 'https://www.spacecentre.ca/camps/', type: 'event' },
      { url: 'https://www.spacecentre.ca/workshops/', type: 'event' },
      { url: 'https://www.spacecentre.ca/lectures/', type: 'event' }
    ];
    
    // Add specific pages that aren't already in the list
    specificPages.forEach(specificPage => {
      if (!eventPages.some(page => page.url === specificPage.url)) {
        eventPages.push(specificPage);
      }
    });
    
    console.log(`Total event pages to process: ${eventPages.length}`);
    return eventPages;
  }
  
  /**
   * Save debug information for the current page
   * @param {Page} page Puppeteer page object
   * @param {string} prefix Prefix for debug files
   */
  async _saveDebugInfo(page, prefix) {
    try {
      // Create timestamp for unique filenames
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePrefix = `${prefix}-${timestamp}`;
      
      // Save screenshot
      const screenshotPath = path.join(this.debugDir, `${filePrefix}-screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML
      const htmlPath = path.join(this.debugDir, `${filePrefix}-page.html`);
      const html = await page.content();
      fs.writeFileSync(htmlPath, html);
      
      // Save metadata (URL, title)
      const metadataPath = path.join(this.debugDir, `${filePrefix}-metadata.json`);
      const url = page.url();
      const title = await page.title();
      
      fs.writeFileSync(metadataPath, JSON.stringify({
        url,
        title,
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.viewport()
      }, null, 2));
      
      console.log(`Debug info saved with prefix ${filePrefix}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }

  /**
   * Extract events from the page
   * @param {Page} page Puppeteer page object
   * @param {boolean} isShowPage Whether this is a shows page
   * @param {boolean} isExhibitPage Whether this is an exhibits page
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page, isShowPage = false, isExhibitPage = false) {
    console.log(`Extracting events from page... (isShowPage: ${isShowPage}, isExhibitPage: ${isExhibitPage})`);
    
    await this._saveDebugInfo(page, `page-${isShowPage ? 'show' : isExhibitPage ? 'exhibit' : 'event'}`);
    
    // Wait for content to load with multiple possible selectors
    await page.waitForSelector('.main-content, article, .page-content, .site-main, .entry-content, .post-content, .single-content, .content-area, .site-content, .event, .exhibit', {timeout: 20000}).catch(() => {
      console.log('Main content selector timeout - continuing anyway');
    });
    
    // Add direct DOM inspection to log the structure
    await page.evaluate(() => {
      console.log('Page structure inspection:');
      const body = document.body;
      console.log(`Body classes: ${body.className}`);
      console.log(`Found ${document.querySelectorAll('.wp-block-group, .wp-block-media-text, .wp-block-columns').length} WordPress blocks`);
      console.log(`Found ${document.querySelectorAll('article').length} articles`);
      console.log(`Found ${document.querySelectorAll('.page-content, .site-content').length} content containers`);
      console.log(`Found ${document.querySelectorAll('.event-card, .program-card, .exhibit-card').length} event/program/exhibit cards`);
    });
    
    // Extract events from the page using page.evaluate
    const events = await page.evaluate((venueInfo, isShowPage, isExhibitPage) => {
      const results = [];

      // Debug logging function that works in browser context
      const debugLog = (message) => {
        // This will appear in the puppeteer console
        console.log(`[Browser] ${message}`);
      };

      debugLog('Starting event extraction in browser context');

      // Function to detect if an element is a navigation or structural element
      const isNavigationOrStructural = (element) => {
        if (!element) return true;

        const className = (element.className || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const tagName = element.tagName?.toLowerCase();
        const elementText = element.textContent?.toLowerCase() || '';

        // Check for navigation-related classes, IDs, or tag names
        if (
          className.includes('nav') || 
          className.includes('menu') || 
          className.includes('header') || 
          className.includes('footer') || 
          className.includes('sidebar') || 
          className.includes('search') || 
          className.includes('widget') || 
          id.includes('nav') || 
          id.includes('menu') || 
          id.includes('header') || 
          id.includes('footer') || 
          id.includes('sidebar') || 
          id.includes('widget') || 
          tagName === 'nav' || 
          tagName === 'aside'
        ) {
          return true;
        }
        
        // Check for navigation-related content
        const navigationTerms = ['privacy policy', 'terms', 'copyright', 'contact us', 'about us', 
                              'sitemap', 'faq', 'help', 'search', 'login', 'register'];
        if (navigationTerms.some(term => elementText.includes(term))) {
          return true;
        }
        
        // Check if this is likely a common page element and not an event
        if (element.querySelectorAll('form, input, button').length > 0) {
          return true;
        }

        return false;
      };

      // Find event containers with updated selectors for the Space Centre website
      const contentBlocks = [];

      // Try to find structured data (JSON-LD)
      debugLog('Looking for structured data (JSON-LD)...');
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      jsonLdScripts.forEach((script) => {
        try {
          const jsonData = JSON.parse(script.textContent);
          debugLog(`Found JSON-LD script: ${JSON.stringify(jsonData['@type'])}`);
          
          // Check if it's an event
          if (jsonData['@type'] === 'Event' || 
              (Array.isArray(jsonData['@graph']) && 
               jsonData['@graph'].some(item => item['@type'] === 'Event'))) {
            
            // Extract event data from JSON-LD
            const events = Array.isArray(jsonData['@graph']) 
              ? jsonData['@graph'].filter(item => item['@type'] === 'Event')
              : [jsonData];
            
            events.forEach(event => {
              // Create a container element for this structured data event
              const container = document.createElement('div');
              container.className = 'structured-data-event';
              
              // Add title
              if (event.name) {
                const title = document.createElement('h3');
                title.textContent = event.name;
                container.appendChild(title);
              }
              
              // Add date
              if (event.startDate) {
                const dateEl = document.createElement('p');
                dateEl.className = 'date';
                dateEl.textContent = event.startDate;
                container.setAttribute('data-date', event.startDate);
                if (event.endDate) {
                  dateEl.textContent += ` - ${event.endDate}`;
                  container.setAttribute('data-end-date', event.endDate);
                }
                container.appendChild(dateEl);
              }
              
              // Add URL
              if (event.url) {
                container.setAttribute('data-url', event.url);
              }
              
              // Add description
              if (event.description) {
                const desc = document.createElement('p');
                desc.textContent = event.description;
                container.appendChild(desc);
              }
              
              contentBlocks.push(container);
            });
          }
        } catch (e) {
          debugLog(`Error parsing JSON-LD: ${e.message}`);
        }
      });
      
      // Special handling for H.R. MacMillan Space Centre website structure
      debugLog('Checking for specific Space Centre layout patterns...');
      const spaceSpecificEvents = [];
      
      // Collection of space-related patterns for identifying content
      const spacePatterns = {
        // Primary space and astronomy keywords
        keywords: [
          // Celestial objects
          'space', 'planet', 'star', 'galaxy', 'cosmos', 'universe', 'moon', 'solar', 'sun', 'mars', 
          'jupiter', 'saturn', 'venus', 'mercury', 'uranus', 'neptune', 'pluto', 'asteroid', 'comet',
          'nebula', 'supernova', 'black hole', 'constellation', 'meteor', 'satellite',
          
          // Space science
          'observatory', 'telescope', 'rocket', 'astronaut', 'orbit', 'science', 'exploration',
          'nasa', 'esa', 'spacex', 'csa', 'iss', 'space station', 'spacecraft', 'mission', 'launch',
          'astronomy', 'astrophysics', 'cosmology', 'aerospace', 'gravitational', 
          
          // HR MacMillan specific terms
          'planetarium', 'dome', 'cosmic', 'discovery', 'presentation', 'educator', 'davin'
        ],
        
        // Event categories
        eventCategories: [
          'astronomy', 'family', 'education', 'camp', 'science', 'special event', 'exhibit',
          'workshop', 'lecture', 'presentation', 'show', 'screening', 'tour', 'demo', 'demonstration',
          'space camp', 'star party', 'night sky', 'viewing', 'observation'
        ],
        
        // Specific HR MacMillan event series/programs - no fallbacks, only authentic programs
        knownPrograms: [
          'planetarium show', 'laser show', 'star theatre', 'night lights', 'space station', 
          'cosmic nights', 'space explorers', 'space odyssey', 'moon mission', 'martian chronicles',
          'solar secrets', 'star stories', 'astronomy day', 'space camp', 'starry nights'
        ]
      };
      
      // Function to detect if content is likely Space Centre related
      const isLikelySpaceRelated = (text) => {
        if (!text) return false;
        
        const lowercaseText = text.toLowerCase();
        
        // Explicit Space Centre references - strongest signals
        if (lowercaseText.includes('spacecentre') || 
            lowercaseText.includes('space centre') ||
            lowercaseText.includes('h.r. macmillan') ||
            lowercaseText.includes('macmillan space') ||
            lowercaseText.includes('vancouver space') ||
            lowercaseText.includes('hr macmillan')) {
          return true;
        }
        
        // Check for known Space Centre programs - these are authentic programs, not fallbacks
        if (spacePatterns.knownPrograms.some(program => lowercaseText.includes(program))) {
          return true;
        }
        
        // Strong space-related keywords
        const strongKeywords = ['planetarium', 'observatory', 'astronomy', 'telescope', 
                              'rocket', 'astronaut', 'mars', 'solar system', 
                              'galaxy', 'cosmic', 'asteroid', 'space exploration',
                              'space camp', 'star party'];
        
        if (strongKeywords.some(keyword => lowercaseText.includes(keyword))) {
          return true;
        }
        
        // Check for multiple weaker space keywords - require at least 2
        let spaceKeywordCount = 0;
        for (const keyword of spacePatterns.keywords) {
          if (lowercaseText.includes(keyword)) {
            spaceKeywordCount++;
            if (spaceKeywordCount >= 2) {
              return true;
            }
          }
        }
        
        // Check for event category keywords combined with at least one space-related term
        const hasEventCategory = spacePatterns.eventCategories.some(cat => lowercaseText.includes(cat));
        if (hasEventCategory && spaceKeywordCount > 0) {
          return true;
        }
        
        // For longer content, be more lenient to avoid missing legitimate events
        // but still require some space relevance
        if (text.length > 200 && spaceKeywordCount > 0) {
          return true;
        }
        
        // Calculate a confidence score for borderline cases
        let confidenceScore = 0;
        
        // Add points for partial matches that might indicate space content
        if (lowercaseText.includes('science')) confidenceScore += 1;
        if (lowercaseText.includes('discovery')) confidenceScore += 1;
        if (lowercaseText.includes('explore')) confidenceScore += 1;
        if (lowercaseText.includes('learn')) confidenceScore += 0.5;
        if (lowercaseText.includes('education')) confidenceScore += 0.5;
        
        // Higher threshold for generic terms to avoid false positives
        return confidenceScore >= 2.5;
      };
      
      // First, look for standard event cards which are most likely to contain authentic events
      debugLog('Searching for event cards with Space Centre specific selectors...');
      const eventCards = document.querySelectorAll(
        // Primary Space Centre specific selectors
        '.event-card, .program-card, .exhibit-card, .space-event, ' +
        // WordPress theme specific cards
        '.wp-block-post, article.event, article.program, article.exhibit, ' +
        // Generic but common patterns
        '.event-listing, .program-listing, .exhibit-listing, ' +
        // Broader selectors but checking for Space Centre specific content
        '.card:not(.navigation-card):not(.footer-card), ' +
        '.wp-block-column:has(h3, h4, .date), ' +
        '.wp-block-media-text:has(h3, h4, a[href*="event"])'        
      );
      
      debugLog(`Found ${eventCards.length} potential event cards to analyze`);
      
      // Detailed tracking of what's happening with each card
      let acceptedCards = 0;
      let rejectedCards = 0;
      
      eventCards.forEach((card, index) => {
        // Skip if it's in navigation or footer
        if (isNavigationOrStructural(card)) {
          debugLog(`Skipping card ${index + 1} - appears to be navigation/structural`);
          rejectedCards++;
          return;
        }
        
        // Skip cards that appear to be unrelated to Space Centre content
        const cardText = card.textContent.trim();
        const cardHtml = card.innerHTML;
        
        // Detect Space Centre branding
        const hasBranding = cardHtml.includes('spacecentre.ca') || 
                          cardText.toLowerCase().includes('spacecentre') || 
                          cardText.toLowerCase().includes('space centre') ||
                          cardText.toLowerCase().includes('h.r. macmillan');
        
        // Only apply space-related check for longer content blocks
        // that don't have explicit branding
        if (cardText.length > 30 && !hasBranding && !isLikelySpaceRelated(cardText)) {
          debugLog(`Skipping card ${index + 1} - content doesn't appear Space Centre related`);
          rejectedCards++;
          return;
        }
        
        // For content with Space Centre branding, still require minimum length
        // to filter out irrelevant navigation/footer items
        if (hasBranding && cardText.length < 15) {
          debugLog(`Skipping card ${index + 1} - too short to be meaningful content`);
          rejectedCards++;
          return;
        }
        
        // Extract event data from the card with more robust selectors
        let title = '';
        let dateText = '';
        let description = '';
        let url = '';
        let imageUrl = '';
        let location = '';
        let categories = [];
        
        // Look for title with improved selectors
        const titleElements = [
          card.querySelector('h1, h2, h3, h4'), // Headers first for priority
          card.querySelector('.title, .event-title, .card-title, [itemprop="name"]'),
          card.querySelector('a[href*="event"], a[href*="program"], a[href*="exhibit"]')
        ].filter(el => el); // Filter out nulls
        
        if (titleElements.length > 0) {
          title = titleElements[0].textContent.trim();
          
          // Check if title is too generic/navigational
          const genericTitles = ['read more', 'learn more', 'details', 'view', 'click here'];
          if (genericTitles.includes(title.toLowerCase())) {
            debugLog(`Skipping card ${index + 1} - generic title: ${title}`);
            rejectedCards++;
            return;
          }
        }
        
        // Look for date with improved selectors
        const dateElements = [
          card.querySelector('time, [datetime], [itemprop="startDate"], [itemprop="endDate"]'),
          card.querySelector('.date, .event-date, .datetime, .calendar, .schedule'),
          card.querySelector('p:contains("Date:"), span:contains("When:")')
        ].filter(el => el);
        
        if (dateElements.length > 0) {
          // Try to get date from datetime attribute first (most reliable)
          if (dateElements[0].getAttribute('datetime')) {
            dateText = dateElements[0].getAttribute('datetime');
          } else {
            dateText = dateElements[0].textContent.trim();
            
            // Clean up common date prefixes
            dateText = dateText.replace(/^(date:|when:|time:|schedule:)/i, '').trim();
          }
        }
        
        // Look for description with improved selectors
        const descElements = [
          card.querySelector('[itemprop="description"]'),
          card.querySelector('.description, .excerpt, .summary, .content, .event-description'),
          // Get the first paragraph that's not a date or title
          Array.from(card.querySelectorAll('p')).find(p => {
            const text = p.textContent.trim().toLowerCase();
            return text.length > 30 && 
                   !text.includes('date:') && 
                   !text.match(/^\d{1,2}[\/-]\d{1,2}/) && // Skip date patterns
                   !titleElements.some(t => t && t.textContent.includes(text));
          })
        ].filter(el => el);
        
        if (descElements.length > 0) {
          description = descElements[0].textContent.trim();
        }
        
        // Look for URL with improved selectors
        const linkElements = [
          card.querySelector('a[href*="event"], a[href*="program"], a[href*="exhibit"], a[href*="show"]'),
          card.querySelector('a.button, a.btn, a.read-more'),
          card.querySelector('[itemprop="url"]'),
          card.querySelector('a[href]') // Fallback to any link
        ].filter(el => el);
        
        if (linkElements.length > 0) {
          url = linkElements[0].getAttribute('href');
        }
        
        // Look for image with improved selectors
        const imageElements = [
          card.querySelector('[itemprop="image"]'),
          card.querySelector('.featured-image img, .card-image img, .event-image img'),
          card.querySelector('img')
        ].filter(el => el);
        
        if (imageElements.length > 0) {
          imageUrl = imageElements[0].getAttribute('src') || 
                     imageElements[0].getAttribute('data-src') ||
                     imageElements[0].getAttribute('srcset')?.split(' ')[0];
        }
        
        // Look for location info
        const locationElements = [
          card.querySelector('[itemprop="location"]'),
          card.querySelector('.location, .venue, address'),
          card.querySelector('p:contains("Location:"), span:contains("Where:")')
        ].filter(el => el);
        
        if (locationElements.length > 0) {
          location = locationElements[0].textContent.trim();
        } else {
          // Default location for Space Centre events
          location = 'H.R. MacMillan Space Centre';
        }
        
        // Extract categories if available
        const categoryElements = [
          card.querySelector('.category, .categories, .tags'),
          card.querySelector('[itemprop="eventCategory"]')
        ].filter(el => el);
        
        if (categoryElements.length > 0) {
          const categoryText = categoryElements[0].textContent.trim();
          categories = categoryText.split(/,|\|/).map(cat => cat.trim()).filter(cat => cat);
        } else {
          // Try to infer categories from the title and description
          spacePatterns.eventCategories.forEach(cat => {
            if ((title && title.toLowerCase().includes(cat)) || 
                (description && description.toLowerCase().includes(cat))) {
              categories.push(cat);
            }
          });
        }
        
        // Only add if we have at least a title and some date or description
        if (title && (dateText || description)) {
          // Score this card to prioritize authentic events
          let cardScore = 0;
          
          // Score based on content quality and authenticity signals
          if (title && title.length > 10) cardScore += 2;
          if (dateText) cardScore += 2;
          if (description && description.length > 50) cardScore += 2;
          if (url && url.includes('spacecentre.ca')) cardScore += 3;
          if (imageUrl && imageUrl.includes('spacecentre')) cardScore += 2;
          if (categories.length > 0) cardScore += 1;
          if (isLikelySpaceRelated(title + ' ' + description)) cardScore += 2;
          
          // Only proceed if score meets threshold - strict no-fallback filtering
          if (cardScore >= 5) {
            debugLog(`Found qualified event card: ${title} - Score: ${cardScore}`);
            acceptedCards++;
            
            // Create a custom event object with all available data
            const container = document.createElement('div');
            container.className = 'extracted-event-card';
            container.setAttribute('data-title', title);
            container.setAttribute('data-score', cardScore.toString());
            
            // Add title element
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            container.appendChild(titleEl);
            
            if (dateText) {
              container.setAttribute('data-date', dateText);
              const dateEl = document.createElement('p');
              dateEl.className = 'date';
              dateEl.textContent = dateText;
              container.appendChild(dateEl);
            }
            
            if (url) {
              container.setAttribute('data-url', url);
              // Ensure URL is absolute
              if (!url.startsWith('http')) {
                try {
                  const absoluteUrl = new URL(url, window.location.href).href;
                  container.setAttribute('data-absolute-url', absoluteUrl);
                } catch (e) {
                  console.log(`Error creating absolute URL for: ${url}`);
                }
              }
            }
            
            if (description) {
              const descEl = document.createElement('p');
              descEl.className = 'description';
              descEl.textContent = description;
              container.appendChild(descEl);
            }
            
            if (imageUrl) {
              container.setAttribute('data-image', imageUrl);
              // Ensure image URL is absolute
              if (!imageUrl.startsWith('http')) {
                try {
                  const absoluteImageUrl = new URL(imageUrl, window.location.href).href;
                  container.setAttribute('data-absolute-image', absoluteImageUrl);
                } catch (e) {
                  console.log(`Error creating absolute image URL for: ${imageUrl}`);
                }
              }
            }
            
            // Add location
            if (location) {
              container.setAttribute('data-location', location);
            }
            
            // Add categories
            if (categories.length > 0) {
              container.setAttribute('data-categories', categories.join(','));
            }
            
            spaceSpecificEvents.push(container);
          } else {
            debugLog(`Rejected event card - insufficient score: ${title} - Score: ${cardScore}`);
            rejectedCards++;
          }
        } else {
          debugLog(`Skipping card ${index + 1} - missing title or date/description`);
          rejectedCards++;
        }
      });
      
      // Check for specific Gutenberg/WordPress blocks commonly used on the Space Centre site
      const wpBlocks = document.querySelectorAll('.wp-block-group, .wp-block-media-text, .wp-block-columns');
      debugLog(`Found ${wpBlocks.length} WordPress blocks to check`);
      
      wpBlocks.forEach((block, index) => {
        // Get heading if available
        const heading = block.querySelector('h1, h2, h3, h4, h5');
        const headingText = heading ? heading.textContent.trim() : '';
        
        // Get text content of the block
        const blockContent = block.textContent.trim().toLowerCase();
        const hasEventKeywords = [
          'show', 'exhibit', 'planetarium', 'event', 'program', 
          'gallery', 'screening', 'presentation'
        ].some(keyword => blockContent.includes(keyword));
        
        // Look for date patterns
        const hasDateKeywords = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december',
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
          'ongoing', 'permanent', 'daily', 'weekly'
        ].some(keyword => blockContent.includes(keyword));
        
        if (hasEventKeywords && (hasDateKeywords || blockContent.match(/\d{1,2}:\d{2}/))) {
          debugLog(`Found potential Space Centre event in block ${index + 1}: ${headingText}`);
          
          const container = document.createElement('div');
          container.className = 'space-centre-event';
          
          // Extract title
          let title = headingText;
          if (!title) {
            // Try to find a strong tag or emphasized text
            const emphText = block.querySelector('strong, em, b, i');
            if (emphText) {
              title = emphText.textContent.trim();
            } else {
              // Use first 5-8 words as title
              const words = blockContent.split(/\s+/);
              title = words.slice(0, Math.min(8, words.length)).join(' ');
            }
          }
          
          // Look for date information
          let dateText = '';
          const timeElements = block.querySelectorAll('time, .date, [class*="time"], [class*="date"]');
          for (const el of timeElements) {
            dateText = el.textContent.trim();
            if (dateText) break;
          }
          
          // If no explicit date elements, try to extract dates from text
          if (!dateText) {
            const dateMatches = blockContent.match(
              /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(\s*[-–]\s*\d{1,2})?(,\s*\d{4})?\b|\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b|\b(daily|ongoing|permanent)\b/i
            );
            if (dateMatches) {
              dateText = dateMatches[0];
            }
          }
          
          // Create title element
          const titleEl = document.createElement('h3');
          titleEl.textContent = title;
          container.appendChild(titleEl);
          
          // Create date element if found
          if (dateText) {
            const dateEl = document.createElement('p');
            dateEl.className = 'date';
            dateEl.textContent = dateText;
            container.setAttribute('data-date', dateText);
            container.appendChild(dateEl);
          } else {
            // For exhibits with no dates, mark as ongoing
            container.setAttribute('data-ongoing', 'true');
          }
          
          // Extract image if available
          const image = block.querySelector('img');
          if (image) {
            const src = image.getAttribute('src') || image.getAttribute('data-src');
            if (src) {
              container.setAttribute('data-image', src);
            }
          }
          
          // Find URL if available
          const link = block.querySelector('a[href]');
          if (link) {
            const href = link.getAttribute('href');
            if (href && !href.includes('#') && !href.includes('javascript:')) {
              container.setAttribute('data-url', href);
            }
          }
          
          // Determine if it's a show or exhibit
          let category = '';
          if (blockContent.includes('planetarium') || blockContent.includes('show')) {
            category = 'Show';
          } else if (blockContent.includes('exhibit') || blockContent.includes('gallery')) {
            category = 'Exhibit';
          } else {
            category = 'Event';
          }
          container.setAttribute('data-category', category);
          
          // Add description - use content minus title
          let description = blockContent.replace(title.toLowerCase(), '').trim();
          if (description.length > 300) {
            description = description.substring(0, 300) + '...';
          }
          
          const descEl = document.createElement('p');
          descEl.textContent = description;
          container.appendChild(descEl);
          
          spaceSpecificEvents.push(container);
        }
      });
      
      // Add these specialized events to our content blocks
      spaceSpecificEvents.forEach(event => {
        contentBlocks.push(event);
      });
      
      debugLog(`Added ${spaceSpecificEvents.length} Space Centre specific events`);
      
      // Check for WordPress events section (another common pattern)
      debugLog('Checking for WordPress events section...');
      const eventsSection = document.querySelector('.events-section, #events, .event-listing, section:has(.event-card)');
      if (eventsSection) {
        debugLog('Found dedicated events section, scanning for events');
        // Look for event cards within the section
        const sectionCards = eventsSection.querySelectorAll('.card, article, .wp-block-column:has(h3, h4), .event-item');
        debugLog(`Found ${sectionCards.length} potential event items in dedicated section`);
        
        if (sectionCards.length > 0) {
          sectionCards.forEach(card => {
            // Skip navigation/structural elements
            if (isNavigationOrStructural(card)) return;
            
            // Add card to our content blocks if it's not already included
            if (!Array.from(contentBlocks).some(block => block.isEqualNode(card))) {
              contentBlocks.push(card);
              debugLog('Added section event card to content blocks');
            }
          });
        }
      }
      
      // Combine all extracted events
      debugLog('Combining all extracted events...');
      
      // Log detailed extraction statistics
      debugLog('Event extraction statistics:');
      debugLog(`- JSON-LD Schema.org events: ${contentBlocks.filter(b => b.className === 'schema-org-event').length}`);
      debugLog(`- Space Centre specific events: ${spaceSpecificEvents.length}`);
      debugLog(`- Accepted event cards: ${acceptedCards}`);
      debugLog(`- Rejected event cards: ${rejectedCards}`);
      debugLog(`- Total content blocks: ${contentBlocks.length}`);
      
      // Final no-fallback verification - ensure we have authentic events
      if (contentBlocks.length === 0) {
        debugLog('WARNING: No authentic events found. Strict no-fallback policy prevents synthesizing events.');
      } else {
        debugLog(`Successfully extracted ${contentBlocks.length} potential authentic events.`);
      }
      
      // Process all found content blocks to extract event data
      debugLog(`Processing ${contentBlocks.length} content blocks...`);
      const processedEvents = [];
      
      contentBlocks.forEach((element) => {
        if (isNavigationOrStructural(element)) {
          debugLog('Skipping navigation/structural element');
          return;
        }
        
        try {
          let title = '';
          let dateText = '';
          let url = '';
          let description = '';
          let image = '';
          let category = isShowPage ? 'Show' : isExhibitPage ? 'Exhibit' : '';

          // Get title
          const titleElem = element.querySelector('h1, h2, h3, h4, h5, .title, .event-title, .name, [class*="title"]');
          if (titleElem) {
            title = titleElem.textContent.trim();
          } else if (element.hasAttribute('data-title')) {
            title = element.getAttribute('data-title');
          } else if (element.getAttribute('aria-label')) {
            title = element.getAttribute('aria-label');
          } else {
            // Try to find a title in the text content
            title = element.textContent.trim().split('\n')[0];
          }
          
          // Extract only the first 100 chars if title is too long
          if (title && title.length > 100) {
            title = title.substring(0, 100) + '...';
          }
          
          // Get date
          const dateElem = element.querySelector('.date, time, .time, .event-date, .datetime, [class*="date"], [datetime], [data-date]');
          if (dateElem) {
            dateText = dateElem.textContent.trim() || dateElem.getAttribute('datetime') || dateElem.getAttribute('data-date');
          } else if (element.hasAttribute('data-date')) {
            dateText = element.getAttribute('data-date');
          } else if (element.hasAttribute('data-ongoing')) {
            dateText = 'Ongoing';
          } else {
            // Look for date patterns in the text
            const dateRegex = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?)?(?:,\s*\d{4})?\b|\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}\b|\b(?:daily|ongoing|permanent|weekly)\b/i;
            const match = element.textContent.match(dateRegex);
            if (match) {
              dateText = match[0];
            }
          }
          
          // Get URL
          const linkElem = element.querySelector('a[href]');
          if (linkElem) {
            const href = linkElem.getAttribute('href');
            if (href && !href.includes('#') && !href.includes('javascript:')) {
              url = href;
            }
          } else if (element.hasAttribute('data-url')) {
            url = element.getAttribute('data-url');
          }
          
          // Get description
          const descElem = element.querySelector('.description, .excerpt, .summary, .event-description, [class*="desc"]');
          if (descElem) {
            description = descElem.textContent.trim();
          } else {
            // Use text content excluding the title
            const fullText = element.textContent.trim();
            if (title && fullText.includes(title)) {
              description = fullText.replace(title, '').trim();
            } else {
              description = fullText;
            }
            
            // Limit description length
            if (description.length > 500) {
              description = description.substring(0, 500) + '...';
            }
          }
          
          // Get image
          const imageElem = element.querySelector('img');
          if (imageElem) {
            image = imageElem.getAttribute('src') || imageElem.getAttribute('data-src');
          } else if (element.hasAttribute('data-image')) {
            image = element.getAttribute('data-image');
          }
          
          // Get category if not already determined
          if (!category) {
            if (element.hasAttribute('data-category')) {
              category = element.getAttribute('data-category');
            } else if (element.className.includes('exhibit') || description.toLowerCase().includes('exhibit')) {
              category = 'Exhibit';
            } else if (element.className.includes('show') || 
                      description.toLowerCase().includes('planetarium') || 
                      title.toLowerCase().includes('planetarium')) {
              category = 'Show';
            } else {
              category = 'Event';
            }
          }
          
          // Add location if known but not specified
          const location = element.getAttribute('data-location') || (venueInfo ? venueInfo.name : null);
          
          // Check if the event has enough authentic information for strict no-fallback
          const hasEnoughData = title && (title.length > 5) && 
                              ((dateText && dateText.length > 3) || category === 'Exhibit') && 
                              (url || description);
                              
          // Calculate authenticity score
          let authenticityScore = 0;
          if (title && title.length > 10) authenticityScore += 2;
          if (dateText) authenticityScore += 2;
          if (url && (url.includes('spacecentre.ca') || url.includes('space-centre'))) authenticityScore += 3;
          else if (url) authenticityScore += 1;
          if (description && description.length > 50) authenticityScore += 2;
          if (image) authenticityScore += 1;
          
          // Only add events with titles and sufficient information - strict no-fallback requirement
          if (hasEnoughData && authenticityScore >= 5) {
            // Check for placeholder titles
            const placeholderTitles = ['event', 'show', 'exhibit', 'program', 'presentation', 'upcoming'];
            const isPlaceholder = placeholderTitles.some(term => 
                title.toLowerCase().trim() === term || 
                title.toLowerCase().trim().startsWith(`${term}:`));
                
            if (!isPlaceholder) {
              // Capture raw HTML content for synthetic content detection
              const rawHtml = card.outerHTML || '';
              
              processedEvents.push({
                title,
                rawDateText: dateText,
                url,
                description,
                image,
                location,
                categories: [category],
                isExhibit: category === 'Exhibit',
                authenticityScore,
                venueInfo,
                _rawHtml: rawHtml // Store raw HTML for later analysis
              });
              debugLog(`Added event: "${title}" - Score: ${authenticityScore}`);
            } else {
              debugLog(`Rejected placeholder title: "${title}"`);
            }
          } else {
            debugLog(`Skipped low-quality event: "${title || 'Untitled'}" - Score: ${authenticityScore}`);
          }
        } catch (error) {
          debugLog(`Error processing content block: ${error.message}`);
        }
      });
      
      debugLog(`Extracted ${processedEvents.length} validated events from ${contentBlocks.length} content blocks`);
      return processedEvents;
    }, this.venueInfo, isShowPage, isExhibitPage);
    
    console.log(`Extracted ${events.length} events, processed ${events.length} valid events`);
    return events;
  }
  
  /**
   * Remove duplicate events and normalize URLs
   * @param {Array} events Array of event objects
   * @returns {Array} Array of deduplicated event objects
   */
  _removeDuplicateEvents(events) {
    console.log(`Removing duplicates from ${events.length} events...`);
    
    // First, normalize URLs and dates
    const normalizedEvents = events.map(event => {
      // Normalize URL
      if (event.url) {
        // Make sure URL is absolute
        if (!event.url.startsWith('http')) {
          try {
            event.url = new URL(event.url, this.url).href;
          } catch (e) {
            console.log(`Error creating absolute URL: ${event.url}`);
            // If we can't create a valid URL, prefix with the base URL
            if (event.url.startsWith('/')) {
              event.url = `${this.url.replace(/\/$/, '')}${event.url}`;
            } else {
              event.url = `${this.url.replace(/\/$/, '')}/${event.url}`;
            }
          }
        }
        
        // Remove trailing slashes
        event.url = event.url.replace(/\/$/, '');
        
        // Remove anchor tags
        event.url = event.url.replace(/#.*$/, '');
        
        // Remove query parameters that are usually tracking-related
        event.url = event.url.replace(/\?(utm_|source=|ref=|fbclid=).*$/, '');
        
        // Normalize URL encoding
        try {
          event.url = decodeURI(encodeURI(event.url));
        } catch (e) {
          console.log(`Error normalizing URL: ${event.url}`);
        }
        
        // Validate URL - must be related to Space Centre
        // No fallbacks - only accept authentic Space Centre URLs
        if (!event.url.includes('spacecentre.ca') && 
            !event.url.includes('space-centre') && 
            !event.url.includes('macmillanspace') && 
            !event.url.includes('hrmacmillan')) {
          console.log(`Rejected URL: Not a Space Centre URL: ${event.url}`);
          event.url = null; // Clear invalid URLs
        }
        
        // Check for test/example URLs which should be rejected
        if (event.url && (
          // Explicit test domains
          event.url.includes('example.com') || 
          event.url.includes('example.org') ||
          event.url.includes('localhost') ||
          event.url.includes('127.0.0.1') ||
          
          // Test indicators in URL
          /\btest\b/i.test(event.url) || 
          /\bsample\b/i.test(event.url) || 
          /\bdemo\b/i.test(event.url) ||
          /\bplaceholder\b/i.test(event.url) ||
          /\bdummy\b/i.test(event.url) ||
          /\btemplate\b/i.test(event.url) ||
          /\bmockup\b/i.test(event.url) ||
          
          // Generic numbered event URLs with no meaningful slug
          /\/(event|program|exhibit|show|workshop)\/\d+\/?$/.test(event.url) ||
          
          // Default page indicators
          /\/(index|default|home)\.html?$/.test(event.url) ||
          
          // Very short path URLs that are likely site home pages, not specific events
          (/^https?:\/\/[^\/]+\/?$/.test(event.url) && !event.url.includes('spacecentre.ca/event')) ||
          
          // URLs with common placeholder patterns
          /page-id=\d+$/.test(event.url) ||
          /postid=\d+$/.test(event.url) ||
          /\?p=\d+$/.test(event.url)
        )) {
          console.log(`Rejected URL: Looks like a test/example URL: ${event.url}`);
          event.url = null; // Clear suspicious URLs
        }
        
        // Validate URL structure for Space Centre events
        if (event.url && event.url.includes('spacecentre.ca')) {
          // URLs should typically follow patterns like /events/event-name or /exhibits/exhibit-name
          // Very short paths are suspicious
          const urlPath = new URL(event.url).pathname;
          if (urlPath.length < 3 || urlPath === '/' || !urlPath.includes('/')) {
            console.log(`Suspicious URL structure: ${event.url}`);
            // Don't reject outright, but mark for additional validation
            event.suspiciousUrl = true;
          }
        }
        
        // Additional check for numeric-only IDs in the URL path
        if (event.url && /\/[0-9]{3,}$/.test(event.url)) {
          console.log(`Rejected URL: Numeric-only ID pattern: ${event.url}`);
          event.url = null; // Clear suspicious URLs
        }
        
        // Check for default, placeholder or landing page URLs
        if (event.url && (event.url.includes('default') || event.url.endsWith('/index'))) {
          console.log(`Rejected URL: Default/index page URL: ${event.url}`);
          event.url = null;
        }
      }
      
      // Create a normalized title key for comparison
      event.titleKey = event.title ? event.title.toLowerCase().replace(/\W+/g, ' ').trim() : '';
      
      // Parse dates if available
      if (event.rawDateText) {
        const dates = this._parseDate(event.rawDateText);
        if (dates.startDate) {
          event.startDate = dates.startDate;
        }
        if (dates.endDate) {
          event.endDate = dates.endDate;
        }
      }
      
      // Handle ongoing exhibits
      if (event.isExhibit && !event.startDate && (event.rawDateText === 'Ongoing' || !event.rawDateText)) {
        // Set to current date but capture explicit exhibit info
        event.startDate = new Date();
        event.isOngoing = true;
        
        // Set end date to 3 months in the future for ongoing exhibits
        event.endDate = new Date();
        event.endDate.setMonth(event.endDate.getMonth() + 3);
        
        // Mark as exhibit for validation
        event.categories = event.categories || [];
        if (!event.categories.includes('Exhibit')) {
          event.categories.push('Exhibit');
        }
        
        console.log(`Set ongoing exhibit dates for "${event.title}": ${event.startDate.toISOString()} - ${event.endDate.toISOString()}`);
      }
      
      return event;
    });
    
    // Track seen events by title to remove duplicates
    const uniqueEvents = [];
    const seenTitles = new Set();
    const seenUrls = new Set();
    
    normalizedEvents.forEach(event => {
      // Create a deduplication key using title and date
      const titleKey = `${event.titleKey}|${event.rawDateText || 'ongoing'}`;
      
      if (!seenTitles.has(titleKey) && (!event.url || !seenUrls.has(event.url))) {
        uniqueEvents.push(event);
        seenTitles.add(titleKey);
        if (event.url) {
          seenUrls.add(event.url);
        }
      }
    });
    
    console.log(`After deduplication: ${uniqueEvents.length} events`);
    return uniqueEvents;
  }
  
  /**
   * Parse date text into Date objects
   * @param {string} dateText The date text to parse
   * @returns {Object} Object with startDate and endDate
   */
  _parseDate(dateText) {
    if (!dateText) {
      return { startDate: null, endDate: null };
    }
    
    // Clean up and normalize the date text
    const cleanDateText = dateText
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\*|\(|\)|\[|\]|\{|\}|\"|\'/g, '')  // Remove special characters
      .replace(/^date:?\s*/i, '') // Remove "Date:" prefix if present
      .replace(/\bfrom\b|\bstarts\b/i, '') // Remove common words that interfere with parsing
      .replace(/\s*@\s*/, ' '); // Normalize @ time separator
      
    console.log(`Parsing date: "${cleanDateText}"`);
    
    const result = { startDate: null, endDate: null };
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Check if it's ongoing/permanent/continuous
    if (/\b(?:ongoing|permanent|daily|continuous|every\s+day)\b/i.test(cleanDateText)) {
      // For ongoing events, set start date to today and end date to 3 months in future
      result.startDate = new Date();
      result.endDate = new Date();
      result.endDate.setMonth(result.endDate.getMonth() + 3);
      console.log(`Parsed as ongoing event: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
      return result;
    }
    
    // Try to extract ISO format dates first (most reliable)
    const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?\b/g;
    const isoMatches = [...cleanDateText.matchAll(isoPattern)];
    
    if (isoMatches.length > 0) {
      // We have ISO format dates
      const startMatch = isoMatches[0];
      const endMatch = isoMatches.length > 1 ? isoMatches[1] : null;
      
      result.startDate = new Date(startMatch[0]);
      result.endDate = endMatch ? new Date(endMatch[0]) : new Date(result.startDate);
      
      console.log(`Parsed ISO date: ${result.startDate.toISOString()}${endMatch ? ` to ${result.endDate.toISOString()}` : ''}`);
      return result;
    }
    
    // Try to extract dates with month name format (full and abbreviated)
    const datePattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:to|-|\u2013|\u2014|and|through|until)\s*(?:(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(\d{1,2})(?:st|nd|rd|th)?)?)?(?:,?\s*((?:19|20)\d{2}))?\b/i;
    const matches = cleanDateText.match(datePattern);
    
    // Also look for day-first format with month name (common in some layouts)
    const dayFirstPattern = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s*(?:to|-|\u2013|\u2014|and|through|until)\s*(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?))?)?(?:,?\s*((?:19|20)\d{2}))?\b/i;
    const dayFirstMatches = !matches ? cleanDateText.match(dayFirstPattern) : null;
    
    // Alternative date format: mm/dd/yyyy or dd/mm/yyyy
    const altDatePattern = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](20\d{2}))?\b/g;
    const altMatches = [...cleanDateText.matchAll(altDatePattern)];
    
    // Time pattern to extract times if available
    const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/gi;
    const timeMatches = [...cleanDateText.matchAll(timePattern)];
    
    if (matches) {
      // Extract date components
      const month = matches[1];
      const day = parseInt(matches[2], 10);
      const endMonth = matches[3] || month; // If no end month, use the start month
      const endDay = matches[4] ? parseInt(matches[4], 10) : null;
      const year = matches[5] ? parseInt(matches[5], 10) : currentYear;
      
      // Create the start date - handle abbreviated month names
      const fullMonth = this._expandMonthName(month);
      const monthIndex = new Date(`${fullMonth} 1, 2000`).getMonth();
      result.startDate = new Date(year, monthIndex, day);
      
      // Create the end date if available
      if (endDay) {
        const fullEndMonth = this._expandMonthName(endMonth);
        const endMonthIndex = new Date(`${fullEndMonth} 1, 2000`).getMonth();
        result.endDate = new Date(year, endMonthIndex, endDay);
        
        // Check if end date is before start date (might be next year)
        if (result.endDate < result.startDate) {
          result.endDate.setFullYear(year + 1);
        }
      } else {
        // If no end day, set end date to start date
        result.endDate = new Date(result.startDate);
      }
      
      console.log(`Parsed month name date: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
    } else if (dayFirstMatches) {
      // Process day-first format (e.g., "15 Jan 2024")
      const day = parseInt(dayFirstMatches[1], 10);
      const month = dayFirstMatches[2];
      const endDay = dayFirstMatches[3] ? parseInt(dayFirstMatches[3], 10) : null;
      const endMonth = dayFirstMatches[4] || month; // If no end month, use the start month
      const year = dayFirstMatches[5] ? parseInt(dayFirstMatches[5], 10) : currentYear;
      
      // Create the start date - handle abbreviated month names
      const fullMonth = this._expandMonthName(month);
      const monthIndex = new Date(`${fullMonth} 1, 2000`).getMonth();
      result.startDate = new Date(year, monthIndex, day);
      
      // Create the end date if available
      if (endDay) {
        const fullEndMonth = this._expandMonthName(endMonth);
        const endMonthIndex = new Date(`${fullEndMonth} 1, 2000`).getMonth();
        result.endDate = new Date(year, endMonthIndex, endDay);
        
        // Check if end date is before start date (might be next year)
        if (result.endDate < result.startDate) {
          result.endDate.setFullYear(year + 1);
        }
      } else {
        // If no end day, set end date to start date
        result.endDate = new Date(result.startDate);
      }
      
      console.log(`Parsed day-first date: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
    } else if (altMatches.length > 0) {
      // Handle alternative date format
      const startMatch = altMatches[0];
      const endMatch = altMatches.length > 1 ? altMatches[1] : null;
      
      const part1 = parseInt(startMatch[1], 10);
      const part2 = parseInt(startMatch[2], 10);
      const year = startMatch[3] ? parseInt(startMatch[3], 10) : currentYear;
      
      // Determine if it's mm/dd or dd/mm format based on typical ranges
      let month, day;
      
      // If part1 is clearly a month (1-12) and part2 could be a day (higher than 12)
      if (part1 <= 12 && part2 > 12) {
        month = part1 - 1;
        day = part2;
      }
      // If part2 is clearly a month (1-12) and part1 could be a day (higher than 12)
      else if (part2 <= 12 && part1 > 12) {
        month = part2 - 1;
        day = part1;
      }
      // If both could be either, assume mm/dd format as it's more common in North America
      else {
        month = part1 - 1;
        day = part2;
      }
      
      result.startDate = new Date(year, month, day);
      
      // Handle end date if present
      if (endMatch) {
        const endPart1 = parseInt(endMatch[1], 10);
        const endPart2 = parseInt(endMatch[2], 10);
        const endYear = endMatch[3] ? parseInt(endMatch[3], 10) : year;
        
        // Use the same format determination as for start date
        let endMonth, endDay;
        if (endPart1 <= 12 && endPart2 > 12) {
          endMonth = endPart1 - 1;
          endDay = endPart2;
        } else if (endPart2 <= 12 && endPart1 > 12) {
          endMonth = endPart2 - 1;
          endDay = endPart1;
        } else {
          endMonth = endPart1 - 1;
          endDay = endPart2;
        }
        
        result.endDate = new Date(endYear, endMonth, endDay);
      } else {
        result.endDate = new Date(result.startDate);
      }
      
      console.log(`Parsed numeric date: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
    }
    
    // Handle time information
    if (timeMatches.length > 0 && result.startDate) {
      const startTimeMatch = timeMatches[0];
      const endTimeMatch = timeMatches.length > 1 ? timeMatches[1] : null;
      
      // Process start time
      const hour = parseInt(startTimeMatch[1], 10);
      const minute = startTimeMatch[2] ? parseInt(startTimeMatch[2], 10) : 0;
      const isPM = /pm|p\.m\./i.test(startTimeMatch[3]);
      
      // Adjust hours for PM
      const adjustedHour = isPM && hour < 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      
      result.startDate.setHours(adjustedHour, minute, 0, 0);
      
      // Process end time if available
      if (endTimeMatch && result.endDate) {
        const endHour = parseInt(endTimeMatch[1], 10);
        const endMinute = endTimeMatch[2] ? parseInt(endTimeMatch[2], 10) : 0;
        const isEndPM = /pm|p\.m\./i.test(endTimeMatch[3]);
        
        // Adjust hours for PM
        const adjustedEndHour = isEndPM && endHour < 12 ? endHour + 12 : (endHour === 12 && !isEndPM ? 0 : endHour);
        
        result.endDate.setHours(adjustedEndHour, endMinute, 0, 0);
      } else if (result.endDate) {
        // Default event duration - 2 hours if not specified
        result.endDate = new Date(result.startDate);
        result.endDate.setHours(result.startDate.getHours() + 2);
      }
      
      console.log(`With time adjustment: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}`);
    }
    
    // Final validation - ensure dates are valid and reasonable
    if (result.startDate && isNaN(result.startDate.getTime())) {
      console.log(`Invalid start date from: ${cleanDateText}`);
      result.startDate = null;
    }
    
    if (result.endDate && isNaN(result.endDate.getTime())) {
      console.log(`Invalid end date from: ${cleanDateText}`);
      result.endDate = null;
    }
    
    // If we have a valid date pair, make sure they're in the right order
    if (result.startDate && result.endDate && result.endDate < result.startDate) {
      // If the difference is small (might be a same-day event with times in wrong order)
      const hoursDiff = Math.abs(result.endDate - result.startDate) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        // Swap only the times, not the dates
        const tempHours = result.startDate.getHours();
        const tempMinutes = result.startDate.getMinutes();
        result.startDate.setHours(result.endDate.getHours(), result.endDate.getMinutes());
        result.endDate.setHours(tempHours, tempMinutes);
      } else {
        // Swap the dates completely
        const temp = result.startDate;
        result.startDate = result.endDate;
        result.endDate = temp;
      }
      console.log(`Fixed date order issue in: ${cleanDateText}`);
    }
    
    // For multi-day events, ensure reasonable duration (< 14 days for regular events)
    if (result.startDate && result.endDate) {
      const daysDifference = (result.endDate - result.startDate) / (1000 * 60 * 60 * 24);
      if (daysDifference > 14 && !cleanDateText.match(/\b(exhibit|ongoing|permanent|daily)\b/i)) {
        console.log(`Suspicious multi-day duration (${Math.round(daysDifference)} days) for non-exhibit: ${cleanDateText}`);
        // Set end date to one day after start for suspicious cases
        result.endDate = new Date(result.startDate);
        result.endDate.setDate(result.startDate.getDate() + 1);
      }
    }
    
    // Validate date is reasonable - strict no-fallback requirement
    if (result.startDate) {
      // Get Vancouver time (Pacific Time)
      const now = new Date();
      // Account for Vancouver timezone (Pacific Time, UTC-7/UTC-8)
      const pacificTimeOffset = -8; // Simplified, ideally would check DST
      const vancouverTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (pacificTimeOffset * 3600000));
      
      // Set reasonable date range boundaries
      const oneYearAgo = new Date(vancouverTime);
      oneYearAgo.setFullYear(vancouverTime.getFullYear() - 1);
      
      const threeYearsAhead = new Date(vancouverTime);
      threeYearsAhead.setFullYear(vancouverTime.getFullYear() + 3);
      
      // Reject dates that are obviously incorrect
      if (result.startDate < oneYearAgo) {
        console.log(`Rejected date: Start date too far in the past: ${result.startDate.toISOString()}`);
        // Check for possible year parsing errors (could be next year's event)
        if (result.startDate.getMonth() >= vancouverTime.getMonth()) {
          // This could be a future event with wrong year
          result.startDate.setFullYear(vancouverTime.getFullYear());
          if (result.endDate) result.endDate.setFullYear(vancouverTime.getFullYear());
          console.log(`Attempted to fix year: New date ${result.startDate.toISOString()}`);
        } else {
          result.startDate = null;
          result.endDate = null;
        }
      }
      
      if (result.startDate && result.startDate > threeYearsAhead) {
        console.log(`Rejected date: Start date too far in the future: ${result.startDate.toISOString()}`);
        result.startDate = null;
        result.endDate = null;
      }
    }
    
    // If we couldn't parse the date, log it
    if (!result.startDate) {
      console.log(`Could not parse date: ${cleanDateText}`);
    }
    
    return result;
  }
  
  /**
   * Validate whether an event has the required date information
   * @param {Object} event - The event to check
   * @returns {boolean} - Whether the event has valid date info
   */
  _validateDateRequirements(event) {
    // Must have date information or be an exhibit
    if (!event.startDate && !event.rawDateText && !event.isExhibit) {
      console.log(`Rejected event: Missing date information for "${event.title}"`);
      return false;
    }
    return true;
  }
      
  /**
   * Check for placeholder or generic titles that might indicate fallbacks
   * @param {Object} event - The event to check
   * @returns {boolean} - True if title appears to be a placeholder
   */
  _detectPlaceholderTitle(event) {
    const placeholderTitles = [
        'event', 'show', 'exhibit', 'presentation', 'workshop', 'program',
        'session', 'lecture', 'seminar', 'discussion', 'talk', 'tour', 'virtual',
        'activity', 'class', 'meeting', 'demo', 'demonstration', 'experience', 'untitled', 
        'view details', 'read more', 'learn more', 'click here', 'find out more',
        'register', 'book now', 'reserve', 'tickets', 'more info', 'example'
      ];
      
    const lowercaseTitle = event.title.toLowerCase().trim();
    
    if (placeholderTitles.some(placeholder => 
        lowercaseTitle === placeholder || 
        lowercaseTitle.includes(`${placeholder} at`) || 
        lowercaseTitle.startsWith(`${placeholder}:`) ||
        lowercaseTitle === `${placeholder}s` ||
        lowercaseTitle.endsWith(`${placeholder}`) ||
        lowercaseTitle.startsWith('upcoming'))) {
      console.log(`Detected placeholder title: "${event.title}"`);
      return true;
    }
    
    // Check for very short titles that might be incomplete
    if (event.title.length < 5 && !event.url?.includes('spacecentre')) {
      console.log(`Detected suspiciously short title: "${event.title}"`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Validate event title length
   * @param {Object} event - The event to check
   * @returns {boolean} - True if title is acceptable
   */
  _validateTitleLength(event) {
    if (event.title.trim().length < 6) {
      console.log(`Rejected event: Title too short "${event.title}"`);
      return false;
    }
    return true;
  }
      
  /**
   * Check for navigation or footer text captured incorrectly as events
   * @param {Object} event - The event to check 
   * @returns {boolean} - True if event contains navigation terms
   */
  _containsNavigationTerms(event) {
    const navigationTerms = [
        'privacy policy', 'terms of use', 'copyright', 'contact us', 'about us', 
        'sitemap', 'faq', 'help', 'search', 'menu', 'navigation', 'footer', 'header',
        'login', 'sign in', 'register', 'newsletter', 'subscribe', 'cart', 'account',
        'cookie', 'accessibility', 'social media', 'follow us', 'blog', 'news'
      ];
      
      // Check in title
      if (event.title) {
        const lowercaseTitle = event.title.toLowerCase();
        if (navigationTerms.some(term => lowercaseTitle.includes(term))) {
          console.log(`Detected navigation term in title: "${event.title}"`);
          return true;
        }
      }
      
      // Check in description too
      if (event.description) {
        const lowercaseDesc = event.description.toLowerCase();
        // Look for navigation patterns in description that suggest this isn't a real event
        if (navigationTerms.some(term => lowercaseDesc.includes(term)) &&
            (lowercaseDesc.includes('click here') || lowercaseDesc.includes('visit our'))) {
          console.log(`Detected navigation term in description for: "${event.title}"`);
          return true;
        }
      }
      
      return false;
    }
    
    /**
     * Calculate details score for an event to determine its completeness
     * @param {Object} event - The event to check
     * @returns {number} - Score representing how complete the event data is
     */
    _calculateDetailsScore(event) {
      let detailsScore = 0;
      
      // Award points for having different pieces of information
      if (event.url && (event.url.includes('spacecentre.ca') || event.url.includes('space-centre'))) detailsScore += 2;
      if (event.description && event.description.length > 50) detailsScore += 2;
      if (event.description && event.description.length > 100) detailsScore += 1; // Bonus for longer descriptions
      if (event.image && event.image.includes('spacecentre')) detailsScore += 2;  // More points for official images
      else if (event.image) detailsScore += 1;
      if (event.startDate) detailsScore += 2;
      if (event.endDate) detailsScore += 1;
      if (event.categories && event.categories.length > 0) detailsScore += 1;
      if (event.rawDateText && event.rawDateText.length > 5) detailsScore += 1;
      if (event.location && event.location.includes('Space Centre')) detailsScore += 1;
      
      return detailsScore;
    }
    
    /**
     * Determine the minimum details score needed for an event to be considered valid
     * @param {Object} event - The event to check
     * @returns {Object} - Object with minimumScore and whether there's a strongSpaceSignal
     */
    _determineMinimumScore(event) {
      // Events need to have a minimum level of detail - increased threshold
      // Use a dynamic minimum score based on event type and available information
      let minimumScore = event.isExhibit ? 7 : 6; // Higher thresholds for stricter validation
      
      // Adjust minimum score based on certain criteria
      if (event.url && (!event.url.includes('spacecentre.ca') && !event.url.includes('space-centre'))) {
        minimumScore += 1; // Require more validation for non-Space Centre URLs
      }
      
      // Lower score requirement if there's extremely strong space-related content
      const strongSpaceSignal = event.title && (
        event.title.toLowerCase().includes('planetarium') ||
        event.title.toLowerCase().includes('space centre') ||
        event.title.toLowerCase().includes('h.r. macmillan')
      );
      
      if (strongSpaceSignal) {
        minimumScore = Math.max(4, minimumScore - 1);
      }
      
      if (detailsScore < minimumScore) {
        console.log(`Rejected event: Insufficient details (score: ${detailsScore}/${minimumScore}) for "${event.title}"`);
        return false;
      }
      
      // Check if the description contains reasonable content and isn't just a placeholder
      if (event.description) {
        const description = event.description.toLowerCase();
        const placeholderDescriptions = [
          'description', 'no description available', 'tbd', 'to be determined',
          'to be announced', 'coming soon', 'check back later', 'details to follow',
          'information coming soon', 'more info', 'more information', 'placeholder'
        ];
        
        if (placeholderDescriptions.some(placeholder => description.includes(placeholder)) || 
            description.length < 20) {
          console.log(`Rejected event: Invalid description for "${event.title}"`);
          return false;
        }
        
        // Check for obviously synthetic content with expanded detection patterns
        if (description.includes('lorem ipsum') || 
            description.includes('sample text') || 
            description.includes('placeholder') ||
            description.includes('example event') ||
            description.includes('test event') ||
            description.includes('dummy') ||
            description.includes('placeholder description') ||
            description.includes('example description') ||
            description.includes('this is a description') ||
            description.includes('enter description here') ||
            /^\s*description\s*$/i.test(description) ||
            (description.length < 30 && /^[a-z\s]+$/i.test(description.trim())) || // Very simple text
            (description.match(/\[(.*?)\]/g) && !description.includes('[object Object]'))) {
          console.log(`Rejected event: Synthetic content detected in description for "${event.title}": "${description.substring(0, 50)}..."`);
          return false;
        }
        
        // Check for repetitive content that might indicate scraped placeholders
        if (description.split(' ').filter(word => word.length > 4).length < 5) {
          console.log(`Rejected event: Description lacks meaningful content for "${event.title}"`);
          return false;
        }
        
        // Check for suspiciously generic space-related descriptions
        // (Only if description is very short - these might be legitimate in longer context)
        if (description.length < 60 && 
            (/space experience|discover space|explore space|astronomy experience/i.test(description) && 
             description.split(' ').length < 10)) {
          console.log(`Rejected event: Generic space description for "${event.title}": "${description}"`);
          return false;
        }
      }
      
      // Check that the date is reasonable (not too far in the past or future)
      if (event.startDate) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(now.getFullYear() + 3);
        
        // Reject events too far in the past (unless they're exhibits)
        if (!event.isExhibit && event.startDate < sixMonthsAgo) {
          console.log(`Rejected event: Date too far in the past for "${event.title}": ${event.startDate.toISOString()}`);
          return false;
        }
        
        // Reject events too far in the future
        if (event.startDate > threeYearsFromNow) {
          console.log(`Rejected event: Date too far in the future for "${event.title}": ${event.startDate.toISOString()}`);
          return false;
        }
      }
      
      // Check for excessive capitalization or odd formatting in title
      if (event.title === event.title.toUpperCase() && event.title.length > 10) {
        console.log(`Rejected event: Excessive capitalization in title "${event.title}"`);
        return false;
      }
      
      // Ensure event is related to Space Centre by checking title keywords
      // Only apply this check for events, not exhibits (which may have more general titles)
      if (!event.isExhibit && event.title.length > 0) {
        const lowercaseTitle = event.title.toLowerCase();
        const spaceTerms = ['space', 'planet', 'star', 'astro', 'galaxy', 'cosmos', 'cosmic', 
                           'universe', 'solar', 'moon', 'mars', 'jupiter', 'saturn', 'observatory',
                           'telescope', 'planetarium', 'science', 'discovery', 'rocket', 'nasa',
                           'astronomy', 'astronaut', 'orbit', 'nebula', 'meteor', 'comet',
                           'workshop', 'presentation', 'lecture', 'class', 'space centre', 'spacecentre'];
        
        // For events (not exhibits), require at least some relevance to space topics
        // OR a very strong confidence score from other factors (URL, date, etc.)
        const hasSomeRelevance = spaceTerms.some(term => lowercaseTitle.includes(term));
        if (!hasSomeRelevance && detailsScore < 7) {
          console.log(`Rejected event: Not sufficiently related to Space Centre themes: "${event.title}" (score: ${detailsScore})`);
          return false;
        }
      }
      
      return true;
    };
    
    // Apply the validation function
    let validatedEvents = [];
    for (const event of events) {
      if (this.validateEvent(event)) {
        // If we got here, the event passed all validation checks
        validatedEvents.push(event);
      }
    }
    
    console.log(`Validation complete: ${validatedEvents.length}/${events.length} events passed strict validation`);
    
    return validatedEvents;
  }

  /**
   * Parse date text into Date objects
   * @param {string} dateText The date text to parse
   * @returns {Object} Object with startDate and endDate
   */
    // If we couldn't parse the date, log it and return null
    if (!result.startDate) {
      console.log(`Could not parse date: ${dateText}`);
    }
    
    return result;
  }
  
  /**
   * Helper method to expand abbreviated month names to full month names
   * @param {string} monthName Abbreviated or full month name
   * @returns {string} Full month name
   */
  _expandMonthName(monthName) {
    if (!monthName) return '';
    
    const monthMap = {
      'jan': 'January',
      'feb': 'February',
      'mar': 'March',
      'apr': 'April',
      'may': 'May',
      'jun': 'June',
      'jul': 'July',
      'aug': 'August',
      'sep': 'September',
      'sept': 'September',
      'oct': 'October',
      'nov': 'November',
      'dec': 'December'
    };
    
    // If it's already a full month name, return it
    if (monthName.length > 3) {
      const lowerMonth = monthName.toLowerCase();
      for (const [abbr, full] of Object.entries(monthMap)) {
        if (lowerMonth === full.toLowerCase()) {
          return full;
        }
      }
    }
    
    // Handle abbreviated month names
    const lowerAbbr = monthName.toLowerCase().substring(0, 3);
    return monthMap[lowerAbbr] || monthName; // Return original if not found
  }
  
  /**
   * Helper method to validate and score image URLs
   * Detects and rejects placeholder or synthetic images
   * @param {Object} event - Event object with potential image property
   * @returns {number} - Score awarded for the image (0, 1, or 2)
   */
  /**
   * Enhanced validation for images with more comprehensive checks
   * @param {Object} event - Event object with image URL
   * @returns {number} - Quality score for the image (0 if rejected)
   */
  _validateAndScoreImage(event) {
    if (!event.image) return 0;
    
    // Check for placeholder/stock images
    const placeholderImagePatterns = [
      /placeholder/i, /default/i, /sample/i, /stock-image/i, /no-image/i, 
      /example/i, /dummy/i, /blank/i, /template/i, /unknown/i, /missing/i,
      /\/(img|image)\/\d+\/?$/, // Generic numbered image URLs
      /\d{2,4}x\d{2,4}/, // Dimension placeholders like 300x200
      /icon-calendar/i, /icon-event/i, /icon-program/i, // Generic icons
      /test/i, /demo/i, /lorem/i, /generic/i, // Additional suspicious terms
      /image\d+/i,  // Generic numbered images
      /untitled/i,   // Untitled images
      /logo\d+/i,   // Generic numbered logos
      /img\d{3,}/i,  // Generic image with 3+ digit numbers
      /temporary/i, /temp[-_]image/i,
      /coming[-_]soon/i
   * @param {Object} event - The event object to check
   * @returns {boolean} - True if the content appears to be synthetic/generated, false otherwise
   */
  /**
   * Analyze HTML content to detect synthetic or placeholder elements
   * @param {string} html - The HTML content to analyze
   * @returns {boolean} - True if HTML appears to be synthetic/placeholder
   */
  _detectSyntheticHtml(html) {
    if (!html) return false;
    
    // Patterns that indicate synthetic or placeholder HTML content
    const syntheticHtmlPatterns = [
      // Empty or placeholder divs
      /<div[^>]*class="[^"]*placeholder[^"]*"[^>]*>/i,
      /<div[^>]*id="[^"]*placeholder[^"]*"[^>]*>/i,
      
      // HTML comments that indicate missing or pending content
      /<!--[^>]*placeholder[^>]*-->/i,
      /<!--[^>]*content pending[^>]*-->/i,
      /<!--[^>]*to be filled[^>]*-->/i,
      /<!--[^>]*todo[^>]*-->/i,
      
      // Autogenerated code markers
      /<!-- auto-?generated/i,
      /machine.?generated/i,
      
      // Data-* attributes with template or synthetic markers
      /data-template/i,
      /data-placeholder/i,
      
      // Common CMS placeholder patterns
      /\[insert[^\]]*\]/i,
      /\{\{[^}]*\}\}/i,
      
      // Inline styles that suggest placeholder content
      /style="[^"]*visibility:\s*hidden[^"]*"/i,
      /style="[^"]*display:\s*none[^"]*"/i,
      
      // Empty content containers
      /<p>\s*<\/p>/i,
      /<div>\s*<\/div>/i,
      /<span>\s*<\/span>/i,
      
      // Suspicious class names
      /class="[^"]*dummy[^"]*"/i,
      /class="[^"]*sample[^"]*"/i,
      /class="[^"]*test[^"]*content[^"]*"/i
    ];
    
    // Check for patterns that indicate synthetic HTML
    return syntheticHtmlPatterns.some(pattern => pattern.test(html));
  }
  
  _detectSyntheticContent(event) {
    if (!event.description) return false;
    
    const description = event.description.toLowerCase();
    const title = (event.title || '').toLowerCase();
    
    // Check if the original HTML content appears synthetic
    if (event._rawHtml && this._detectSyntheticHtml(event._rawHtml)) {
      console.log(`Synthetic HTML detected in event: "${event.title}"`);
      return true;
    }
    
    // Common patterns in machine-generated text
    const syntheticPatterns = [
      // Generic placeholder phrases
      /lorem ipsum/i,
      /\[insert .* here\]/i,
      /\{.*\}/i, // Template variable style
      /content pending/i,
      /to be filled/i,
      /coming soon/i,
      /under construction/i,
      /sample (text|content|event)/i,
      /placeholder/i,
      
      // Generic event descriptions
      /join us for an? (exciting|amazing|wonderful|fascinating) (event|program|experience|journey|adventure)/i,
      /don't miss this (opportunity|chance|event)/i,
      /this (event|program) is (suitable|perfect|ideal) for all ages/i,
      /(perfect|ideal|great) for the whole family/i,
      /(suitable|perfect) for children (of all ages|and adults)/i,
      /fun for (kids|children) of all ages/i,
      
      // Overly vague space content without specifics
      /explore the wonders of space/i,
      /learn about the (universe|cosmos|stars|planets)/i,
      /discover the secrets of the (universe|cosmos|galaxy)/i,
      /embark on a journey through (space|the cosmos|the universe)/i,
      /travel through space and time/i,
      /space awaits/i,
      
      // Repetitive patterns often found in generated content
      /(don't miss|be sure to attend|mark your calendars).{0,20}(don't miss|be sure to attend|mark your calendars)/i,
      /(exciting|amazing|fascinating|wonderful).{0,20}(exciting|amazing|fascinating|wonderful)/i,
      
      // Uncommon formatting that might indicate machine generation
      /\*\*.*\*\*/,  // Markdown-style bold
      /\[.*\]\(http/,  // Markdown-style links
      
      // Auto-generated event description patterns
      /this event (occurs|takes place|happens) (on|every)/i,
      /automatically generated/i,
      /subject to change without notice/i,
      /check back (often|regularly|later) for (updates|more information)/i,
      
      // Uninformative event templates
      /details coming soon/i,
      /stay tuned for (more|additional) (details|information)/i,
      /tickets (available soon|coming soon|on sale soon)/i
    ];
    
    // Additional indicators of synthetic text
    const syntheticIndicators = [
      // Description too short to be meaningful
      description.length < 40,
      
      // Description exactly matches or is very similar to title (lazy generation)
      event.title && (description === title || description.includes(title + '.')),
      
      // High proportion of superlatives often indicates generated text
      (description.match(/(amazing|incredible|spectacular|exceptional|extraordinary|outstanding|remarkable)/gi) || []).length > 2,
      
      // Extremely generic calls to action
      description.includes('for more information') && description.includes('contact us'),
      description.includes('visit our website') && description.includes('for details'),
      
      // Unparseable date or time information indicates synthetic content
      description.includes('date: tbd') || description.includes('time: tbd'),
      
      // Additional suspicious patterns
      description.includes('rescheduled') && !description.includes('rescheduled to'),
      description.includes('cancelled') && description.length < 100,
      description.includes('more details will be provided') || description.includes('details to follow'),
      description.includes('content will be updated') || description.includes('check website for'),
      
      // Overuse of exclamation marks often indicates synthetic content
      (description.match(/!/g) || []).length > 3,
      
      // Suspicious phrase repetition
      new Set(description.split(/[.,!?;]/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10)).size < 3,
      
      // Words repeated unusually often can indicate generated content
      description.split(' ').some(word => {
        const wordCount = description.split(new RegExp(`\\b${word}\\b`, 'gi')).length - 1;
        return word.length > 4 && wordCount > 3;
      })
    ];
    
    // Check for synthetic patterns
    const hasPatterns = syntheticPatterns.some(pattern => pattern.test(description));
    
    // Count how many indicators are present
    const indicatorCount = syntheticIndicators.filter(Boolean).length;
    
    // Debug output with detailed reasons
    if (hasPatterns || indicatorCount >= 2) {
      // Find which patterns matched for better debugging
      if (hasPatterns) {
        const matchedPatterns = syntheticPatterns
          .filter(pattern => pattern.test(description))
          .map(pattern => pattern.toString().substring(1, 30) + '...');
        console.log(`Synthetic patterns detected in "${event.title}": ${matchedPatterns.join(', ')}`);
      }
      
      if (indicatorCount >= 2) {
        console.log(`Multiple synthetic indicators (${indicatorCount}) detected in: "${event.title}"`);
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate space-related keyword relevance score for an event
   * This helps ensure we only capture genuine Space Centre events
   * @param {Object} event - The event object to analyze
   * @returns {Object} - Object with score and keywordMatches
   */
  _calculateSpaceRelevance(event) {
    const result = { score: 0, keywordMatches: [] };
    if (!event.title && !event.description) return result;
    
    // Combine text for analysis
    const combinedText = [
      event.title || '', 
      event.description || '',
      event.categories?.join(' ') || '',
      event.location || ''
    ].join(' ').toLowerCase();
    
    // Strong Space Centre specific program keywords
    const spaceCentrePrograms = [
      'planetarium', 'star theatre', 'cosmic courtyard', 'observatory',
      'astronaut', 'space station', 'ground station', 'gordon southam',
      'macmillan', 'space centre', 'h.r. macmillan', 'hr macmillan',
      'virtual reality', 'live science', 'science theatre', 'space gallery',
      'solar system', 'mars academy', 'space map', 'space race', 
      'night sky', 'star gazing', 'meteor shower', 'eclipse viewing',
      'rocket launch', 'star party', 'harold wright', 'telescope'
    ];
    
    // Space science related keywords (medium strength)
    const spaceKeywords = [
      'astronomy', 'space', 'planet', 'star', 'galaxy', 'cosmos', 'cosmic',
      'universe', 'nasa', 'esa', 'csa', 'moon', 'mars', 'jupiter', 'saturn',
      'venus', 'mercury', 'uranus', 'neptune', 'pluto', 'comet', 'asteroid',
      'meteor', 'solar', 'lunar', 'constellation', 'telescope', 'orbit',
      'satellite', 'exoplanet', 'science', 'gravity', 'spacecraft', 'rocket',
      'astro', 'nebula', 'interstellar', 'black hole', 'supernova', 'stargazing'
    ];
    
    // Check for program matches (strong indicators)
    spaceCentrePrograms.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        result.score += 3;
        result.keywordMatches.push(keyword);
      }
    });
    
    // Check for space-related matches
    spaceKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        result.score += 1;
        result.keywordMatches.push(keyword);
      }
    });
    
    // Strong bonus for explicit mentions of H.R. MacMillan Space Centre
    if (combinedText.includes('space centre')) {
      result.score += 5;
    }
    
    // Bonus for explicitly mentioning space education
    if (combinedText.includes('astronomy class') || 
        combinedText.includes('space education') || 
        combinedText.includes('science education')) {
      result.score += 2;
    }
    
    return result;
  }
  
  /**
   * Enhanced event authenticity check combining multiple validation approaches
   * This is a critical component of the strict no-fallback enforcement
   * @param {Object} event - The event to validate
   * @param {Object} rejectionStats - Object to track rejection statistics
   * @returns {boolean} - True if event passes all authenticity checks
   */
  /**
   * Strict date validation for non-fallback events
   * Ensures dates are realistic, well-formed, and within reasonable ranges
   * @param {Object} event - Event to validate dates for
   * @returns {boolean} - Whether the dates are valid
   */
  _validateNonFallbackDates(event) {
    // Skip validation for exhibits which might be permanent
    if (event.isExhibit) return true;
    
    const now = new Date();
    const vancouverTZ = 'America/Vancouver';
    
    try {
      // Check for suspicious time patterns
      if (event.startDate) {
        // Suspicious if every event starts exactly at the hour or half hour and has zero seconds
        const minutes = event.startDate.getMinutes();
        const seconds = event.startDate.getSeconds();
        
        if (seconds === 0 && (minutes === 0 || minutes === 30)) {
          // This is potentially suspicious, check if endDate has same pattern
          if (event.endDate && 
              event.endDate.getSeconds() === 0 && 
              (event.endDate.getMinutes() === 0 || event.endDate.getMinutes() === 30)) {
            // Both start and end times are perfectly on hour/half-hour boundaries
            // This is less likely for real events unless they're scheduled that way
            // Check if this is a reasonable duration (e.g., 1, 1.5, 2, or 3 hours)
            const durationHours = (event.endDate - event.startDate) / (1000 * 60 * 60);
            if (![0.5, 1, 1.5, 2, 2.5, 3].includes(durationHours)) {
              console.log(`Suspicious date pattern: Exact hour/half-hour with unusual duration (${durationHours}h) for "${event.title}"`);  
              return false;
            }
          }
        }
        
        // Reject dates too far in the past (older than 2 weeks)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(now.getDate() - 14);
        if (event.startDate < twoWeeksAgo) {
          console.log(`Rejecting past event: ${event.title} (${event.startDate.toISOString()})`);
          return false;
        }
        
        // Flag dates suspiciously far in future (over 12 months)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(now.getFullYear() + 1);
        if (event.startDate > oneYearFromNow) {
          // Space Centre rarely posts events more than a year in advance
          // If it's extremely far in the future, reject it
          const threeYearsFromNow = new Date();
          threeYearsFromNow.setFullYear(now.getFullYear() + 3);
          
          if (event.startDate > threeYearsFromNow) {
            console.log(`Rejecting unreasonably future event: ${event.title} (${event.startDate.toISOString()})`);
            return false;
          }
          
          // For dates 1-3 years in future, just log a warning but accept if all other criteria pass
          console.log(`Warning: Event date far in future: ${event.title} (${event.startDate.toISOString()})`);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Date validation error for "${event.title}": ${error.message}`);
      return false;
    }
  }
  
  /**
   * Enhanced validation for image URLs with more comprehensive checks
   * @param {Object} event - Event object with image URL
   * @returns {number} - Quality score for the image (0 if rejected)
   */
  _validateImageQuality(event) {
    if (!event.image) return 0;
    
    // Check for placeholder/stock images
    const placeholderImagePatterns = [
      /placeholder/i, 
      /default[-_]?image/i,
      /stock[-_]?image/i,
      /sample[-_]?image/i,
      /dummy[-_]?image/i,
      /no[-_]?image/i, 
      /example/i, 
      /blank/i, 
      /template/i, 
      /unknown/i, 
      /missing/i,
      /\/(img|image)\/\d+\/?$/, 
      /\d{2,4}x\d{2,4}/, 
      /icon/i,
      /test/i, 
      /demo/i, 
      /lorem/i, 
      /generic/i,
      /untitled/i,
      /temporary/i,
      /coming[-_]soon/i
    ];
    
    const suspiciousImageExtensions = ['svg', 'ico', 'gif', 'tif'];
    
    // Check for suspicious URL structures
    const suspiciousUrlPatterns = [
      /data:image\//i,  // Data URLs
      /base64/i,        // Base64 encoded images
      /gravatar/i,      // Generic avatars
      /\/avatar/i,      // Generic avatar images
      /\/sample\//i,    // Sample directories
      /\/placeholder\//i, // Placeholder directories
      /\/default\//i,   // Default image directories
      /\?dim=\d+/i,    // Generic dimension parameters
      /\?w=\d+&h=\d+/i // Generic resizing parameters
    ];
    
    // Check if image URL matches any placeholder patterns
    if (placeholderImagePatterns.some(pattern => pattern.test(event.image))) {
      console.log(`Rejected placeholder image for "${event.title}": ${event.image}`);
      return 0;
    }
    
    // Check if image has suspicious extension
    if (suspiciousImageExtensions.some(ext => event.image.toLowerCase().endsWith(`.${ext}`))) {
      console.log(`Rejected suspicious extension image for "${event.title}": ${event.image}`);
      return 0;
    }
    
    // Check for suspicious URL structure
    if (suspiciousUrlPatterns.some(pattern => pattern.test(event.image))) {
      console.log(`Rejected suspicious URL pattern image for "${event.title}": ${event.image}`);
      return 0;
    }
    
    // Scoring for valid images
    if (event.image.includes('spacecentre.ca') || event.image.includes('space-centre')) {
      return 3; // Strongly prefer Space Centre domain images
    } else if (event.image.includes('astronomy') || event.image.includes('space') || 
              event.image.includes('star') || event.image.includes('planet') ||
              event.image.includes('galaxy') || event.image.includes('science')) {
      return 2; // Prefer space/astronomy related images
    }
    
    return 1; // Valid but generic image
  }
  
  _verifyEventAuthenticity(event, rejectionStats) {
    // Calculate space relevance score
    const spaceRelevance = this._calculateSpaceRelevance(event);
    let detailsScore = 0;
    let minimumScore = 5; // Base minimum score
    
    // Add space relevance bonus to details score
    if (spaceRelevance.score > 0) {
      const relevanceBonus = Math.min(3, Math.floor(spaceRelevance.score / 2));
      detailsScore += relevanceBonus;
      console.log(`Space relevance for "${event.title}": score=${spaceRelevance.score}, bonus=${relevanceBonus}, matches=${spaceRelevance.keywordMatches.join(', ')}`);
    }
    
    // Run our strict non-fallback date validation
    if (!this._validateNonFallbackDates(event)) {
      console.log(`Authentication failed: Date validation failed for "${event.title}"`);
      rejectionStats.dateValidationFailed++;
      rejectionStats.total++;
      return false;
    }
    
    // Check for synthetic content using our advanced detector
    if (this._detectSyntheticContent(event)) {
      console.log(`Authentication failed: Synthetic content detected in "${event.title}"`);
      rejectionStats.syntheticContent++;
      rejectionStats.total++;
      return false;
    }
    
    // Validate image URLs for authenticity using our enhanced method
    if (event.image) {
      const imageScore = this._validateImageQuality(event);
      detailsScore += imageScore;
      
      if (imageScore === 0) {
        // Image was rejected as suspicious
        rejectionStats.suspiciousImageUrl++;
      }
    }
    
    // Check for Vancouver-specific indicators
    const vancouverTerms = ['vancouver', 'british columbia', 'bc', 'canada', 'pacific'];
    const hasVancouverContext = vancouverTerms.some(term => 
      (event.location && event.location.toLowerCase().includes(term)) ||
      (event.description && event.description.toLowerCase().includes(term))
    );
    
    if (hasVancouverContext) {
      detailsScore += 1;
    }
    
    // Validate URL structure for known Space Centre event URL patterns
    if (event.url) {
      const spaceCentreURLPatterns = [
        /spacecentre\.ca\/events\//i,
        /spacecentre\.ca\/event\//i,
        /spacecentre\.ca\/exhibits\//i,
        /spacecentre\.ca\/shows\//i,
        /spacecentre\.ca\/programs\//i
      ];
      
      if (spaceCentreURLPatterns.some(pattern => pattern.test(event.url))) {
        detailsScore += 2;
      }
    }
    
    // Check for highly specific event information that's unlikely to be synthetic
    const hasSpecificDetails = (
      (event.startDate && event.startDate.getHours() !== 0) || // Has specific time, not just date
      (event.price && !['free', 'contact us', 'tbd', 'varies'].includes(event.price.toLowerCase())) || // Has specific price
      (event.location && event.location.length > 15) // Has detailed location
    );
    
    if (hasSpecificDetails) {
      detailsScore += 2;
    }
    
    // Strengthen our requirements for non-Space Centre URLs
    if (event.url && (!event.url.includes('spacecentre.ca') && !event.url.includes('space-centre'))) {
      minimumScore += 2; // Stricter validation for external URLs
    }
    
    // Check if we have strong Space Centre specific content
    const strongSignal = (spaceRelevance.score >= 8) || 
                       (event.title && (
                          event.title.toLowerCase().includes('planetarium') ||
                          event.title.toLowerCase().includes('space centre') ||
                          event.title.toLowerCase().includes('h.r. macmillan')
                        ));
    
    // Adjust minimum score for very strong signals
    if (strongSignal) {
      minimumScore = Math.max(3, minimumScore - 1);
    }
    
    // Final authenticity check based on all criteria
    const passedAuthenticity = detailsScore >= minimumScore;
    
    if (!passedAuthenticity) {
      console.log(`Authentication failed: Insufficient authenticity score (${detailsScore}/${minimumScore}) for "${event.title}"`);
      rejectionStats.failedAuthenticityCheck++;
      rejectionStats.total++;
      
      // Track the specific reason for failing authenticity
      if (spaceRelevance.score < 3) {
        rejectionStats.insufficientSpaceRelevance++;
      }
    } else if (detailsScore === minimumScore) {
      // This event just barely passed - log it as suspicious but accepted
      console.log(`WARNING: Event barely passed authenticity check (${detailsScore}/${minimumScore}): "${event.title}"`);
      rejectionStats.suspiciousButAccepted++;
    }
    
    return passedAuthenticity;
  }

  /**
   * Filter events based on strict validation criteria
   * @param {Array} events - Array of events to validate
   * @returns {Object} - Object containing validated events and rejection statistics
   */
  _validateEvents(events) {
    // Simple implementation for quick fix
    const validEvents = [];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Basic validation
      if (!event.title || event.title.trim() === '') {
        console.log('Rejected: Missing title');
        continue;
      }
      
      // Must have date info or be exhibit
      if (!event.startDate && !event.rawDateText && !event.isExhibit) {
        console.log(`Rejected: Missing date for "${event.title}"`);
        continue;
      }
      
      // Add valid event to results
      validEvents.push(event);
    }
    
    console.log(`Validation: ${validEvents.length}/${events.length} events passed`);
    return validEvents;
  }
      
      // Calculate a score to determine how complete this event data is
      const detailsScore = this._calculateDetailsScore(event);
      
      // Determine minimum score needed based on context
      const { minimumScore, strongSpaceSignal } = this._determineMinimumScore(event);
      
      // Apply stricter validation if enabled
      if (this.strictValidation) {
        
        // Require a minimum score
        if (detailsScore < minimumScore) {
          console.log(`Rejected event: Insufficient details score ${detailsScore} < ${minimumScore} for "${event.title}"`);
          rejectionStats.lowDetailScore++;
          rejectionStats.total++;
          continue;
        }
        
        // Require sufficient description content for completeness
        if (event.description && event.description.trim().length < 20) {
          console.log(`Rejected event: Description too short for "${event.title}"`);
            description.includes('placeholder') ||
            description.includes('example event') ||
            description.includes('test event') ||
            description.includes('dummy') ||
            description.includes('placeholder description') ||
            description.includes('example description') ||
            description.includes('this is a description') ||
            description.includes('enter description here') ||
            /^\s*description\s*$/i.test(description) ||
            (description.length < 30 && /^[a-z\s]+$/i.test(description.trim())) || // Very simple text
            (description.match(/\[(.*?)\]/g) && !description.includes('[object Object]'))) {
          console.log(`Rejected event: Synthetic content detected in description for "${event.title}": "${description.substring(0, 50)}..."`);
          rejectionStats.placeholderDescription++;
          rejectionStats.total++;
          return false;
        }
        
        // Check for repetitive content that might indicate scraped placeholders
        if (description.split(' ').filter(word => word.length > 4).length < 5) {
          console.log(`Rejected event: Description lacks meaningful content for "${event.title}"`);
          rejectionStats.insufficientDescription++;
          rejectionStats.total++;
          return false;
        }
        
        // Check for suspiciously generic space-related descriptions
        // (Only if description is very short - these might be legitimate in longer context)
        if (description.length < 60 && 
            (/space experience|discover space|explore space|astronomy experience/i.test(description) && 
             description.split(' ').length < 10)) {
          console.log(`Rejected event: Generic space description for "${event.title}": "${description}"`);
          rejectionStats.syntheticContent++;
          rejectionStats.total++;
          return false;
        }
      }
      
      // Check that the date is reasonable (not too far in the past or future)
      if (event.startDate) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(now.getFullYear() + 3);
        
        // Reject events too far in the past (unless they're exhibits)
        if (!event.isExhibit && event.startDate < sixMonthsAgo) {
          console.log(`Rejected event: Date too far in the past for "${event.title}": ${event.startDate.toISOString()}`);
          rejectionStats.invalidDateRange++;
          rejectionStats.total++;
          return false;
        }
        
        // Reject events too far in the future
        if (event.startDate > threeYearsFromNow) {
          console.log(`Rejected event: Date too far in the future for "${event.title}": ${event.startDate.toISOString()}`);
          rejectionStats.invalidDateRange++;
          rejectionStats.total++;
          return false;
        }
      }
      
      // Check for excessive capitalization or odd formatting in title
      if (event.title === event.title.toUpperCase() && event.title.length > 10) {
        console.log(`Rejected event: Excessive capitalization in title "${event.title}"`);
        rejectionStats.excessiveCapitalization++;
        rejectionStats.total++;
        return false;
      }
      
      // Ensure event is related to Space Centre by checking title keywords
      // Only apply this check for events, not exhibits (which may have more general titles)
      if (!event.isExhibit && event.title.length > 0) {
        const lowercaseTitle = event.title.toLowerCase();
        const spaceTerms = ['space', 'planet', 'star', 'astro', 'galaxy', 'cosmos', 'cosmic', 
                           'universe', 'solar', 'moon', 'mars', 'jupiter', 'saturn', 'observatory',
                           'telescope', 'planetarium', 'science', 'discovery', 'rocket', 'nasa',
                           'astronomy', 'astronaut', 'orbit', 'nebula', 'meteor', 'comet',
                           'workshop', 'presentation', 'lecture', 'class', 'space centre', 'spacecentre'];
        
        // For events (not exhibits), require at least some relevance to space topics
        // OR a very strong confidence score from other factors (URL, date, etc.)
        const hasSomeRelevance = spaceTerms.some(term => lowercaseTitle.includes(term));
        if (!hasSomeRelevance && detailsScore < 7) {
          console.log(`Rejected event: Not sufficiently related to Space Centre themes: "${event.title}" (score: ${detailsScore})`);
          rejectionStats.unrelevantContent++;
          rejectionStats.total++;
          return false;
        }
      }
      
      return true;
    });
    
    // Create a detailed validation report
    console.log('\n==== EVENT VALIDATION REPORT ====');
    console.log(`Total events processed: ${events.length}`);
    console.log(`Events passing validation: ${validatedEvents.length} (${Math.round(validatedEvents.length / events.length * 100)}%)`);
    console.log(`Events rejected: ${rejectionStats.total} (${Math.round(rejectionStats.total / events.length * 100)}%)`);
    
    // Print detailed rejection statistics
    if (rejectionStats.total > 0) {
      console.log('\nREJECTION REASONS:');
      const sortedReasons = Object.entries(rejectionStats)
        .filter(([key, value]) => key !== 'total' && key !== 'suspiciousButAccepted' && value > 0)
        .sort((a, b) => b[1] - a[1]);
      
      sortedReasons.forEach(([reason, count]) => {
        const percentage = Math.round(count / rejectionStats.total * 100);
        console.log(`- ${reason}: ${count} (${percentage}%)`);
      });
    }
    
    // Report on suspicious but accepted events
    if (rejectionStats.suspiciousButAccepted > 0) {
      console.log(`\nWARNING: ${rejectionStats.suspiciousButAccepted} events were flagged as suspicious but accepted`);
    }
    
    // Calculate event quality metrics
    const qualityMetrics = this._calculateEventQualityMetrics(validatedEvents);
    console.log('\nQUALITY METRICS:');
    Object.entries(qualityMetrics).forEach(([metric, value]) => {
      console.log(`- ${metric}: ${typeof value === 'number' ? Math.round(value * 100) + '%' : value}`);
    });
    
    console.log('\n==== END REPORT ====\n');
    
    // Return both the valid events and the rejection statistics
    return {
      events: validatedEvents,
      rejectionStats,
      qualityMetrics
    };
  }
  
  /**
   * Calculate quality metrics for the validated events
   * @param {Array} events - The validated events
   * @returns {Object} - Object with quality metrics
   */
  _calculateEventQualityMetrics(events) {
    if (!events || events.length === 0) {
      return { 
        averageDescriptionLength: 0,
        percentWithImages: 0,
        percentWithOfficialUrls: 0,
        averageSpaceRelevance: 0,
        validEventCount: 0
      };
    }
    
    // Calculate description lengths
    const descriptionLengths = events
      .filter(event => event.description)
      .map(event => event.description.length);
      
    const avgDescLength = descriptionLengths.length > 0 
      ? descriptionLengths.reduce((sum, len) => sum + len, 0) / descriptionLengths.length 
      : 0;
    
    // Calculate image percentage
    const withImages = events.filter(event => event.image).length;
    const imagePercentage = events.length > 0 ? withImages / events.length : 0;
    
    // Calculate official URL percentage
    const withOfficialUrls = events.filter(event => 
      event.url && (event.url.includes('spacecentre.ca') || event.url.includes('space-centre'))
    ).length;
    const officialUrlPercentage = events.length > 0 ? withOfficialUrls / events.length : 0;
    
    // Calculate space relevance
    const spaceRelevanceScores = events.map(event => this._calculateSpaceRelevance(event).score);
    const avgSpaceRelevance = spaceRelevanceScores.length > 0 
      ? spaceRelevanceScores.reduce((sum, score) => sum + score, 0) / spaceRelevanceScores.length 
      : 0;
    
    // Calculate date range distribution
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    
    const nextThreeMonths = new Date(now);
    nextThreeMonths.setMonth(now.getMonth() + 3);
    
    const eventsWithDates = events.filter(event => event.startDate);
    const upcomingEvents = eventsWithDates.filter(event => event.startDate >= now);
    const thisMonthEvents = upcomingEvents.filter(event => event.startDate < nextMonth);
    const nextQuarterEvents = upcomingEvents.filter(event => 
      event.startDate >= nextMonth && event.startDate < nextThreeMonths
    );
    
    return {
      validEventCount: events.length,
      averageDescriptionLength: Math.round(avgDescLength),
      percentWithImages: imagePercentage,
      percentWithOfficialUrls: officialUrlPercentage,
      averageSpaceRelevance: avgSpaceRelevance,
      thisMonthEventCount: thisMonthEvents.length,
      nextQuarterEventCount: nextQuarterEvents.length,
      futureEventCount: upcomingEvents.length,
      dateCoverage: eventsWithDates.length > 0 ? eventsWithDates.length / events.length : 0
    };
  }
}

  /**
   * Run a diagnostic test on the scraper with both synthetic and real events
   * This is useful for testing the validation logic and debugging
   * @param {Object} options - Test configuration options
   * @returns {Promise<Object>} - Test results
   */
  async runDiagnosticTest(options = {}) {
    console.log('\n=== SPACE CENTRE EVENTS DIAGNOSTIC TEST ===');
    console.log(`Running at: ${new Date().toISOString()}\n`);
    
    const testEvents = this._generateTestEvents();
    const realEvents = options.useRealEvents ? 
      await this.getEvents({maxEvents: options.maxEvents || 5}) : [];
    
    console.log(`Generated ${testEvents.length} synthetic test events`);
    if (realEvents.length) {
      console.log(`Retrieved ${realEvents.length} real events from website`);
    }
    
    // Combine test and real events
    const combinedEvents = [...testEvents];
    if (realEvents.length) {
      combinedEvents.push(...realEvents);
    }
    
    // Shuffle events to randomize the order
    const shuffledEvents = this._shuffleArray(combinedEvents);
    
    console.log(`Running validation on ${shuffledEvents.length} total events...\n`);
    
    // Validate the events
    const validationResult = this._validateEvents(shuffledEvents);
    
    // Compare expected vs actual results
    const syntheticPassed = testEvents.filter(e => !e._shouldReject && 
      validationResult.events.some(ve => ve.title === e.title));
    
    const syntheticCorrectlyRejected = testEvents.filter(e => e._shouldReject && 
      !validationResult.events.some(ve => ve.title === e.title));
    
    const syntheticIncorrectlyPassed = testEvents.filter(e => e._shouldReject && 
      validationResult.events.some(ve => ve.title === e.title));
    
    const syntheticIncorrectlyRejected = testEvents.filter(e => !e._shouldReject && 
      !validationResult.events.some(ve => ve.title === e.title));
    
    // Generate test report
    console.log('\n=== DIAGNOSTIC TEST RESULTS ===');
    console.log(`Total events processed: ${shuffledEvents.length}`);
    console.log(`Events passing validation: ${validationResult.events.length}`);
    console.log(`Events rejected: ${validationResult.rejectionStats.total}\n`);
    
    console.log('SYNTHETIC TEST EVENT VALIDATION:');
    console.log(`✓ Correctly accepted: ${syntheticPassed.length}`);
    console.log(`✓ Correctly rejected: ${syntheticCorrectlyRejected.length}`);
    console.log(`✗ Incorrectly accepted: ${syntheticIncorrectlyPassed.length}`);
    console.log(`✗ Incorrectly rejected: ${syntheticIncorrectlyRejected.length}\n`);
    
    // Calculate accuracy metrics
    const totalSynthetic = testEvents.length;
    const correctlyHandled = syntheticPassed.length + syntheticCorrectlyRejected.length;
    const accuracy = Math.round((correctlyHandled / totalSynthetic) * 100);
    
    console.log(`Overall accuracy: ${accuracy}%`);
    console.log('=== END OF DIAGNOSTIC TEST ===\n');
    
    return {
      accuracy,
      syntheticPassed,
      syntheticCorrectlyRejected,
      syntheticIncorrectlyPassed,
      syntheticIncorrectlyRejected,
      validationResult
    };
  }
  
  /**
   * Generate synthetic test events for diagnostic validation
   * @returns {Array} - Array of test events with _shouldReject property
   */
  _generateTestEvents() {
    const events = [];
    const now = new Date();
    
    // Helper to add days to a date
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(date.getDate() + days);
      return result;
    };
    
    // 1. Good event that should pass all validation
    events.push({
      title: 'Astronomy Night: Summer Stars',
      description: 'Join us at the H.R. MacMillan Space Centre for an evening of stargazing and astronomy. ' +
        'Our expert astronomers will guide you through the summer constellations visible from Vancouver, ' +
        'followed by telescope viewing from our observatory (weather permitting).',
      startDate: addDays(now, 7),
      endDate: addDays(now, 7),
      url: 'https://www.spacecentre.ca/events/astronomy-night-summer-2025',
      image: 'https://www.spacecentre.ca/wp-content/uploads/2025/04/summer-stars-event.jpg',
      location: 'H.R. MacMillan Space Centre, 1100 Chestnut St, Vancouver',
      categories: ['Astronomy', 'Evening Event'],
      price: '$19.75 adult, $16.00 youth/senior',
      _shouldReject: false // This should pass validation
    });
    
    // 2. Event with synthetic/placeholder content that should be rejected
    events.push({
      title: 'Space Event',
      description: 'This is a sample event description. Lorem ipsum dolor sit amet. ' +
        'Join us for this exciting event that is perfect for all ages!',
      startDate: addDays(now, 14),
      url: 'https://example.com/space-event',
      image: 'https://example.com/images/placeholder.jpg',
      location: 'Space Centre',
      _shouldReject: true // This should fail validation
    });
    
    // 3. Event with suspicious date pattern that should be rejected
    events.push({
      title: 'Mars Mission Planning',
      description: 'Learn about NASA plans to send humans to Mars in the next decade.',
      startDate: addDays(now, 1095), // 3 years in the future
      url: 'https://www.spacecentre.ca/events/mars-mission',
      image: 'https://www.spacecentre.ca/images/mars-mission.jpg',
      location: 'H.R. MacMillan Space Centre',
      _shouldReject: true // This should fail validation due to date too far in future
    });
    
    // 4. Event with good content but non-Space Centre URL
    events.push({
      title: 'Solar Eclipse Viewing Party',
      description: 'Join us for this special event to safely view the partial solar eclipse. ' +
        'We will provide solar viewing glasses and have telescopes with solar filters. ' +
        'Our astronomers will explain the science behind eclipses and answer your questions.',
      startDate: addDays(now, 21),
      endDate: addDays(now, 21),
      url: 'https://vancouverastronomy.com/eclipse-viewing',
      image: 'https://vancouverastronomy.com/images/eclipse-2025.jpg',
      location: 'H.R. MacMillan Space Centre Observatory',
      categories: ['Astronomy', 'Special Event'],
      _shouldReject: false // This should pass with our enhanced validation
    });
    
    // 5. Event with repetitive/machine-generated text patterns
    events.push({
      title: 'Space Adventures Workshop',
      description: 'Discover the exciting world of space! This exciting workshop offers exciting ' +
        'opportunities to learn about space. Space is exciting and this workshop is perfect ' +
        'for all ages. Don\'t miss this opportunity! Don\'t miss this exciting event!',
      startDate: addDays(now, 5),
      url: 'https://www.spacecentre.ca/workshops',
      location: 'Education Room',
      _shouldReject: true // Should be rejected due to synthetic content patterns
    });
    
    // 6. Event with minimal but valid information
    events.push({
      title: 'Planetarium: Cosmic Journeys',
      description: 'Our newest planetarium show takes you on a tour through the cosmos.',
      startDate: addDays(now, 3),
      url: 'https://www.spacecentre.ca/planetarium/cosmic-journeys',
      location: 'H.R. MacMillan Space Centre Planetarium',
      _shouldReject: false // Should pass because it has planetarium in title despite minimal info
    });
    
    // 7. Event with HTML placeholder content in raw HTML
    events.push({
      title: 'Space Science Demo',
      description: 'Interactive demonstrations of space science principles.',
      startDate: addDays(now, 10),
      url: 'https://www.spacecentre.ca/demos',
      _rawHtml: '<div class="event-card"><h3>Space Science Demo</h3><p>Interactive demonstrations of space science principles.</p><!-- TODO: Add more content here --><div class="placeholder"></div></div>',
      _shouldReject: true // Should be rejected due to placeholder HTML
    });
    
    // 8. Generic non-space event that should be rejected
    events.push({
      title: 'General Community Meeting',
      description: 'Monthly community meeting to discuss local issues.',
      startDate: addDays(now, 15),
      location: 'Community Room',
      categories: ['Community'],
      _shouldReject: true // Should fail due to lack of space relevance
    });
    
    // 9. Valid space exhibit
    events.push({
      title: 'Cosmic Wonders: Interactive Space Exhibit',
      description: 'Explore the wonders of our universe through interactive displays and hands-on ' +
        'activities. Learn about black holes, neutron stars, and the origins of our universe.',
      isExhibit: true,
      url: 'https://www.spacecentre.ca/exhibits/cosmic-wonders',
      image: 'https://www.spacecentre.ca/images/exhibits/cosmic-exhibit.jpg',
      location: 'Main Gallery',
      _shouldReject: false // Valid exhibit should pass
    });
    
    // 10. Event with suspicious image URL
    events.push({
      title: 'Rocket Science Workshop',
      description: 'Learn the principles of rocket science and build your own model rocket.',
      startDate: addDays(now, 25),
      url: 'https://www.spacecentre.ca/workshops/rockets',
      image: 'https://placekitten.com/400/300', // Obvious placeholder image
      location: 'Workshop Room',
      _shouldReject: true // Should be rejected due to suspicious image URL
    });
    
    return events;
  }
  
  /**
   * Shuffle an array randomly (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = SpaceCentreEvents;
