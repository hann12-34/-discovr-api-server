# Fortune Sound Club Scraper Troubleshooting Guide

This guide addresses common issues that may occur with the Fortune Sound Club scraper and its integration with the Discovr API.

## Issue: No Events Showing in the App

### Diagnostic Steps

1. **Check Python Scraper Output**
   ```bash
   cd /Users/seongwoohan/CascadeProjects/Discovr-API/Scrapers/FortuneSound
   python3 fortune_scraper.py
   ```
   
   Expected result: This should create or update `fortune_events.json` with newly scraped events.
   
   If this fails:
   - Check for Python errors in the output
   - Verify internet connection
   - Check if the Fortune Sound Club website structure has changed

2. **Verify JSON Output Format**
   ```bash
   cat /Users/seongwoohan/CascadeProjects/Discovr-API/Scrapers/FortuneSound/fortune_events.json
   ```
   
   The output should be a direct array of event objects, not wrapped in another object.

3. **Test the Bridge Integration**
   ```bash
   cd /Users/seongwoohan/CascadeProjects/Discovr-API
   node test-fortune-bridge.js
   ```
   
   This should show the events being loaded from the JSON file and properly formatted.

4. **Check Events in MongoDB**
   ```javascript
   // Using MongoDB shell or a tool like MongoDB Compass
   use Discovr
   db.events.find({"venue.name": "Fortune Sound Club"}).count()
   db.events.find({"venue.name": "Fortune Sound Club"}).limit(3)
   ```

5. **Verify API Response**
   ```bash
   curl -H "X-Disable-HTTP3: 1" -H "X-Force-HTTP-Version: 1.1" https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1/venues/events/all
   ```
   
   Check that Fortune Sound Club events are included in the API response.

## Issue: Date Parsing Errors

If you see errors related to date parsing:

1. Check the format of dates in the Python scraper output:
   ```python
   # In fortune_scraper.py
   print(f"Parsed date: {event_date} -> {formatted_date}")
   ```

2. Verify the bridge is correctly handling date strings:
   ```javascript
   // In fortuneSoundClubBridge.js
   console.log('Raw date:', event.startDate);
   console.log('Parsed date:', new Date(event.startDate));
   ```

## Issue: Missing Event Details

If events are missing important details:

1. **Check Scraper Selectors**
   
   The Python scraper uses specific CSS selectors to extract event information. If the Fortune Sound Club website structure changes, these selectors may need to be updated.
   
   Key selectors to check in `fortune_scraper.py`:
   ```python
   # Event container
   event_links = soup.select(".eventlist-title-link")
   
   # Event details
   title_element = soup.select_one(".eventlist-title")
   date_element = soup.select_one(".event-date")
   ```

2. **Check Image Extraction**
   
   If images aren't showing up:
   ```python
   # Debug image extraction
   image_element = soup.select_one(".eventlist-featured-image img")
   print(f"Image element found: {image_element is not None}")
   if image_element:
       print(f"Image URL: {image_element.get('data-src') or image_element.get('src')}")
   ```

## Issue: MongoDB Integration Failures

If events aren't being saved to MongoDB:

1. **Check Connection String**
   
   Verify the MongoDB connection string in your configuration or environment variables.

2. **Test MongoDB Connection**
   ```bash
   node test-mongodb-connection.js
   ```

3. **Check IP Whitelist**
   
   Ensure your IP address is whitelisted in MongoDB Atlas.

4. **Look for Authentication Errors**
   
   Check logs for authentication failures when connecting to MongoDB.

## Issue: API Returns HTTP/3 Errors

If you see HTTP/3 related errors in the app logs:

1. **Add Required Headers**
   
   Make sure all API requests include:
   ```
   X-Disable-HTTP3: 1
   X-Force-HTTP-Version: 1.1
   ```

2. **Update UnifiedEventResolver in iOS App**
   
   Ensure the iOS app is using the updated `UnifiedEventResolver` that can handle both direct array and wrapped object formats.

## Issue: Duplicate Events

If you see duplicate events in the app:

1. **Check Event IDs**
   
   Verify that each event has a unique `id` field based on its content:
   ```javascript
   // Inside fortuneSoundClubBridge.js
   const idSource = `${event.title}-${this.venue.name}-${event.startDate?.toISOString() || new Date().toISOString()}`;
   const id = uuidv5(idSource, NAMESPACE);
   ```

2. **Verify Deduplication Logic**
   
   Check the deduplication logic in `scrapers/index.js`:
   ```javascript
   const deduplicatedEvents = await deduplication.deduplicateEvents(allEvents);
   ```

## Issue: Unable to Run Python Scraper

If you can't run the Python scraper:

1. **Check Python Environment**
   ```bash
   python3 --version
   pip3 list | grep beautifulsoup
   pip3 list | grep requests
   ```

2. **Install Required Python Packages**
   ```bash
   pip3 install beautifulsoup4 requests
   ```

3. **Check File Permissions**
   ```bash
   chmod +x fortune_scraper.py
   ```

## Quick Fixes for Common Issues

1. **No Events Found**
   - Run the Python scraper manually to refresh `fortune_events.json`
   - Check the Fortune Sound Club website is accessible

2. **Date Parsing Issues**
   - Update the date parsing logic in `fortune_scraper.py` to match new date formats
   - Add more date format patterns to handle variations

3. **MongoDB Connection Issues**
   - Check network connectivity
   - Verify MongoDB Atlas credentials
   - Ensure IP whitelist includes your current IP

4. **Bridge Integration Issues**
   - Verify file paths in `fortuneSoundClubBridge.js`
   - Check JSON file is readable by the Node.js process

5. **API Response Format Issues**
   - Ensure events are formatted according to the expected schema
   - Verify the iOS app can handle both array and object responses
