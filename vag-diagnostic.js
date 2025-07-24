const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Diagnostic script for the Vancouver Art Gallery website
 * This script focuses on capturing information about the page structure
 * without trying to scrape events yet
 */
async function runDiagnostic() {
  console.log('Starting Vancouver Art Gallery website diagnostic...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Configure the page
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(30000); // 30 seconds timeout
    
    // Add console log capturing
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    
    // Navigate to the page
    console.log('Navigating to the events page...');
    await page.goto('https://www.vanartgallery.bc.ca/exhibitions-and-events/', { 
      waitUntil: 'networkidle2'
    });
    
    console.log('Page loaded. Taking screenshot...');
    await page.screenshot({ path: 'vag-page-loaded.png', fullPage: true });
    
    // Log the page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Look for h2 elements to understand page structure
    console.log('Analyzing page structure...');
    const headings = await page.evaluate(() => {
      const h2Elements = Array.from(document.querySelectorAll('h2'));
      return h2Elements.map(h2 => ({
        text: h2.textContent.trim(),
        hasUpcomingEvents: h2.textContent.trim() === 'Upcoming Events',
        parentClass: h2.parentElement ? h2.parentElement.className : 'none',
        hasUlSibling: !!h2.parentElement?.querySelector('ul')
      }));
    });
    
    console.log('H2 headings found on page:', headings);
    
    // Check if there's a cookie banner
    const hasCookieBanner = await page.evaluate(() => {
      const cookieBanner = document.querySelector('#cky-consent-container');
      return !!cookieBanner && cookieBanner.style.display !== 'none';
    });
    
    console.log(`Cookie banner present: ${hasCookieBanner}`);
    
    if (hasCookieBanner) {
      console.log('Taking screenshot of cookie banner...');
      await page.screenshot({ path: 'vag-cookie-banner.png' });
      
      // Try to accept cookies if banner is present
      const acceptButton = await page.$('#cky-btn-accept');
      if (acceptButton) {
        console.log('Attempting to click accept cookies button...');
        await acceptButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'vag-after-cookie-accept.png' });
      }
    }
    
    // Check for iframes which might contain the content
    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
        id: iframe.id,
        src: iframe.src,
        width: iframe.width,
        height: iframe.height
      }));
    });
    
    console.log('Iframes found on page:', iframes);
    
    // Save the page HTML for analysis
    const html = await page.content();
    fs.writeFileSync('vag-page-diagnostic.html', html);
    console.log('Saved page HTML to vag-page-diagnostic.html');
    
    console.log('Diagnostic complete!');
  } catch (error) {
    console.error('Error during diagnostic:', error);
    await page.screenshot({ path: 'vag-error-state.png' });
  } finally {
    await browser.close();
  }
}

runDiagnostic().catch(console.error);
