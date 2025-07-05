/**
 * Debug script for The Improv Centre website
 * This will analyze the site structure and extract key information for debugging
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugImprovCentre() {
  console.log('🔍 Starting Improv Centre debug analysis...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
  
  try {
    // Visit main shows page
    console.log('Navigating to shows page...');
    await page.goto('https://theimprovcentre.ca/shows/', { waitUntil: 'networkidle2' });
    
    // Take screenshot
    await page.screenshot({ path: 'improv-centre-main.png', fullPage: true });
    console.log('Saved screenshot of main shows page');
    
    // Save HTML
    const mainHtml = await page.content();
    fs.writeFileSync('improv-centre-main.html', mainHtml);
    console.log('Saved HTML of main shows page');

    // Extract all links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({
          href: a.href,
          text: a.textContent.trim(),
          classes: a.className,
          parentElement: a.parentElement ? a.parentElement.tagName : 'none'
        }))
        .filter(link => link.href && (
          link.href.includes('show') || 
          link.href.includes('event') ||
          link.href.includes('ticket') ||
          link.text.toLowerCase().includes('show') ||
          link.text.toLowerCase().includes('event') ||
          link.text.toLowerCase().includes('ticket')
        ));
    });

    console.log(`Found ${links.length} relevant links`);
    console.log(links.slice(0, 10)); // Show first 10 links

    // Check for show containers
    const showElements = await page.evaluate(() => {
      // Check for various structures that might contain shows
      const possibleContainers = [
        // Classes
        '.show', '.event', '.event-container', '.show-container', '.listing',
        '.wp-block-group', '.wp-block-column', '.card', '.event-card', '.post',
        
        // Common WordPress structures
        'article', '.entry-content', '.content-area', '.main', 'main',
        
        // Section elements
        'section', '.section'
      ];

      const results = [];
      
      for (const selector of possibleContainers) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.push({
            selector,
            count: elements.length,
            firstElementHtml: elements[0].outerHTML.substring(0, 300) + '...'
          });
        }
      }
      
      return results;
    });

    console.log('Possible show containers:');
    console.log(showElements);

    // Extract all images
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(img => ({
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
          classes: img.className
        }))
        .filter(img => 
          img.src && 
          img.width > 100 && 
          img.height > 100 && 
          !img.src.includes('logo') &&
          !img.src.includes('icon')
        );
    });

    console.log(`Found ${images.length} images`);
    console.log(images.slice(0, 5)); // Show first 5 images

    // Extract headings
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5'))
        .map(h => ({
          text: h.textContent.trim(),
          tag: h.tagName,
          classes: h.className
        }));
    });

    console.log(`Found ${headings.length} headings`);
    console.log(headings);

    // Visit the tickets page to see if events are listed there
    await page.goto('https://tickets.theimprovcentre.ca/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'improv-centre-tickets.png', fullPage: true });
    console.log('Saved screenshot of tickets page');
    
    // Extract events from tickets page
    const ticketEvents = await page.evaluate(() => {
      // Look for event listings specific to ticket platforms
      const eventElements = document.querySelectorAll('.event_item, .event-item, .performance, .performance-item, .show');
      
      const events = [];
      for (const element of eventElements) {
        events.push({
          html: element.outerHTML.substring(0, 300) + '...',
          text: element.textContent.trim().substring(0, 150) + '...'
        });
      }
      
      return events;
    });
    
    console.log(`Found ${ticketEvents.length} events on tickets page`);
    console.log(ticketEvents);

    // Save a detailed report
    const report = {
      links: links,
      containers: showElements,
      images: images,
      headings: headings,
      ticketEvents: ticketEvents
    };
    
    fs.writeFileSync('improv-centre-debug-report.json', JSON.stringify(report, null, 2));
    console.log('Saved detailed debug report to improv-centre-debug-report.json');
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
    console.log('Debug analysis complete');
  }
}

// Run the debug script
debugImprovCentre().catch(console.error);
