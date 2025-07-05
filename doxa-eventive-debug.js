/**
 * Debug script for DOXA Film Festival on Eventive.org platform
 * This will analyze the site structure and extract key information for debugging
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugDOXAEventive() {
  console.log('🔍 Starting DOXA Eventive debug analysis...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
  
  try {
    // Visit the Eventive schedule page
    console.log('Navigating to Eventive schedule page...');
    await page.goto('https://doxa2025.eventive.org/schedule', { 
      waitUntil: 'networkidle2',
      timeout: 60000  // Increased timeout for SPAs
    });
    
    // Wait additional time for SPA to load content
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot
    await page.screenshot({ path: 'doxa-eventive-schedule.png', fullPage: true });
    console.log('Saved screenshot of Eventive schedule page');
    
    // Save HTML
    const mainHtml = await page.content();
    fs.writeFileSync('doxa-eventive-schedule.html', mainHtml);
    console.log('Saved HTML of Eventive schedule page');

    // Extract page structure and components
    const pageStructure = await page.evaluate(() => {
      // Helper to get unique selectors
      const getUniqueSelectors = (count) => {
        const selectors = {};
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(Boolean);
            for (const cls of classes) {
              if (!selectors[cls]) selectors[cls] = 0;
              selectors[cls]++;
            }
          }
          if (el.id) {
            if (!selectors['#' + el.id]) selectors['#' + el.id] = 0;
            selectors['#' + el.id]++;
          }
        }
        
        // Return most common selectors
        return Object.entries(selectors)
          .filter(([selector, count]) => count > 1) // Only selectors used multiple times
          .sort((a, b) => b[1] - a[1])  // Sort by frequency
          .slice(0, count)  // Take top N
          .map(([selector, count]) => ({ selector, count }));
      };
      
      // Find potential event containers
      const findEventContainers = () => {
        const potentialContainers = [];
        
        // Selectors that might contain events in Eventive
        const selectors = [
          '.film-list-item', '.event-card', '.screening', '.film-card',
          '.film-block', '.film-tile', '.screening-item', '.program-item',
          '.event-row', '.event-item', '.schedule-item'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            potentialContainers.push({
              selector,
              count: elements.length,
              sample: elements[0].outerHTML.slice(0, 500)
            });
          }
        }
        
        return potentialContainers;
      };
      
      // Extract heading structure
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => ({
          text: h.textContent.trim(),
          tag: h.tagName,
          classes: h.className
        }));
      
      // Look for links that might point to individual events
      const eventLinks = Array.from(document.querySelectorAll('a'))
        .filter(link => {
          const href = link.href || '';
          return href.includes('/films/') || 
                 href.includes('/events/') || 
                 href.includes('/schedule/') || 
                 href.includes('/screening/');
        })
        .map(link => ({
          url: link.href,
          text: link.textContent.trim(),
          classes: link.className
        }))
        .slice(0, 20); // Limit to 20 links
      
      // Check for film titles or names
      const filmTitles = Array.from(document.querySelectorAll('.title, .film-title, .event-title'))
        .map(el => ({
          text: el.textContent.trim(),
          classes: el.className,
          parent: el.parentElement ? el.parentElement.tagName : 'none'
        }))
        .slice(0, 20);
      
      // Look for date/time info
      const dateElements = Array.from(document.querySelectorAll('.date, .time, .datetime, time'))
        .map(el => ({
          text: el.textContent.trim(),
          classes: el.className,
          parent: el.parentElement ? el.parentElement.tagName : 'none'
        }))
        .slice(0, 20);
      
      // Get images
      const images = Array.from(document.querySelectorAll('img'))
        .filter(img => img.width > 100 && img.height > 100)
        .map(img => ({
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
          classes: img.className
        }))
        .slice(0, 10);
        
      return {
        commonSelectors: getUniqueSelectors(20),
        potentialEventContainers: findEventContainers(),
        headings,
        eventLinks,
        filmTitles,
        dateElements,
        images
      };
    });
    
    // Print summary
    console.log('Page Analysis:');
    console.log('===========================');
    console.log(`Found ${pageStructure.potentialEventContainers.length} potential event containers`);
    console.log(`Found ${pageStructure.eventLinks.length} event links`);
    console.log(`Found ${pageStructure.filmTitles.length} film titles`);
    console.log(`Found ${pageStructure.dateElements.length} date elements`);
    
    // Sample event links
    if (pageStructure.eventLinks.length > 0) {
      console.log('\nSample event links:');
      pageStructure.eventLinks.slice(0, 3).forEach(link => {
        console.log(`- ${link.text || '(no text)'}: ${link.url}`);
      });
    }
    
    // Save detailed report
    fs.writeFileSync('doxa-eventive-debug-report.json', JSON.stringify(pageStructure, null, 2));
    console.log('Saved detailed debug report to doxa-eventive-debug-report.json');
    
    // Visit a sample event page if links were found
    if (pageStructure.eventLinks.length > 0) {
      const sampleEventUrl = pageStructure.eventLinks[0].url;
      console.log(`\nVisiting sample event page: ${sampleEventUrl}`);
      
      await page.goto(sampleEventUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot
      await page.screenshot({ path: 'doxa-eventive-sample-event.png', fullPage: true });
      
      // Extract event data
      const eventData = await page.evaluate(() => {
        // Look for title
        const title = document.querySelector('h1')?.textContent.trim() || 
                      document.querySelector('.title, .film-title, .event-title')?.textContent.trim();
                      
        // Look for date/time
        const dateElements = document.querySelectorAll('.date, .time, .datetime, time, .screening-time');
        let dateText = '';
        for (const el of dateElements) {
          const text = el.textContent.trim();
          if (text && text.length > dateText.length) {
            dateText = text;
          }
        }
        
        // Look for description
        const descElements = document.querySelectorAll('.description, .synopsis, .about, p');
        let description = '';
        for (const el of descElements) {
          const text = el.textContent.trim();
          if (text && text.length > 100 && text.length > description.length) {
            description = text;
          }
        }
        
        // Look for venue
        const venueElements = document.querySelectorAll('.venue, .location, .theater');
        let venue = '';
        for (const el of venueElements) {
          const text = el.textContent.trim();
          if (text && text.includes('Theatre') || text.includes('Cinema') || text.includes('Center')) {
            venue = text;
            break;
          }
        }
        
        // Get main image
        const image = document.querySelector('img[class*="poster"], img[class*="film"], .featured-image img')?.src;
        
        return { title, dateText, description, venue, image };
      });
      
      console.log('\nSample Event Data:');
      console.log('===========================');
      console.log(eventData);
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
    console.log('\nDebug analysis complete');
  }
}

// Run the debug script
debugDOXAEventive().catch(console.error);
