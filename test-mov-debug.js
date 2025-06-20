/**
 * Debug script for Museum of Vancouver website
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugMuseumOfVancouver() {
  console.log("Analyzing Museum of Vancouver website structure...");
  const url = "https://museumofvancouver.ca/events-programs";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    console.log("Response Status:", response.status);
    const html = response.data;
    
    // Save the HTML to a file for inspection
    fs.writeFileSync('mov-debug.html', html);
    console.log("Saved HTML to mov-debug.html");
    
    // Load with cheerio
    const $ = cheerio.load(html);
    
    // Log the page title
    console.log(`Page Title: ${$('title').text()}`);
    
    // Check for event list containers
    console.log("\n=== Checking for event containers ===");
    const possibleContainers = [
      '.summary-item',
      '.eventlist',
      '.event-item',
      '.event-list',
      '.events-list',
      '.summary-title-link',
      '.summary-content',
      '.events-collection',
      '.event-collection',
      '.collection-type-events',
      'article',
      '.sqs-block'
    ];
    
    possibleContainers.forEach(selector => {
      const count = $(selector).length;
      console.log(`${selector}: ${count}`);
      
      if (count > 0) {
        console.log(`First ${selector} example:`);
        console.log($(selector).first().html().substring(0, 300) + '...');
      }
    });
    
    // Check for specific event links
    console.log("\n=== Looking for event links ===");
    const links = $('a').filter((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text() || '';
      return href.includes('event') || href.includes('exhibition') || text.includes('Event') || text.match(/\d{1,2}(?:st|nd|rd|th)?.+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    });
    
    console.log(`Found ${links.length} potential event links`);
    
    links.each((i, link) => {
      if (i < 10) { // Limit output to first 10 links
        const $link = $(link);
        console.log(`Link ${i+1}:`);
        console.log(`  Text: ${$link.text().trim()}`);
        console.log(`  Href: ${$link.attr('href')}`);
        console.log(`  Parent: ${$link.parent().prop('tagName')} with class "${$link.parent().attr('class')}"`);
      }
    });
    
  } catch (error) {
    console.error("Error analyzing Museum of Vancouver:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", JSON.stringify(error.response.headers));
    }
  }
}

// Run the debug function
debugMuseumOfVancouver();
