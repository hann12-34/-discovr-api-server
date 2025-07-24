/**
 * Debug Foufounes Électriques WordPress structure
 */

const puppeteer = require('puppeteer');

async function debugFoufounes() {
    console.log('🔍 Debugging Foufounes Électriques WordPress structure...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
        
        page.setDefaultNavigationTimeout(15000);
        
        await page.goto('https://www.foufouneselectriques.com/events/', { waitUntil: 'networkidle2' });
        
        // Get WordPress post structure
        const wpStructure = await page.evaluate(() => {
            const results = {
                posts: [],
                eventElements: [],
                wpSelectors: {}
            };
            
            // Check for WordPress post selectors
            const wpSelectors = [
                '.post', '.hentry', '[class*="post-"]', '[class*="event-"]',
                '.ajde_events', '.ajde_event', '.evo-event', '.eventon-event',
                '.event-item', '.event-card', '.event-listing',
                '.elementor-widget', '.elementor-element'
            ];
            
            wpSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        results.wpSelectors[selector] = {
                            count: elements.length,
                            sample: elements[0] ? {
                                className: elements[0].className,
                                id: elements[0].id,
                                textContent: elements[0].textContent.substring(0, 200).trim()
                            } : null
                        };
                    }
                } catch (e) {
                    // Skip
                }
            });
            
            // Look for text that might be events
            const textElements = document.querySelectorAll('*');
            const eventKeywords = ['concert', 'show', 'party', 'night', 'event', 'live', 'dj'];
            
            Array.from(textElements).forEach(el => {
                const text = el.textContent;
                if (text && text.length > 10 && text.length < 200) {
                    const lowerText = text.toLowerCase();
                    if (eventKeywords.some(keyword => lowerText.includes(keyword))) {
                        if (el.tagName && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) {
                            results.eventElements.push({
                                tagName: el.tagName,
                                className: el.className,
                                text: text.trim().substring(0, 150)
                            });
                        }
                    }
                }
            });
            
            return results;
        });
        
        console.log('📦 WordPress selectors found:');
        Object.entries(wpStructure.wpSelectors).forEach(([selector, info]) => {
            console.log(`   ${selector}: ${info.count} elements`);
            if (info.sample) {
                console.log(`      Class: ${info.sample.className}`);
                console.log(`      ID: ${info.sample.id}`);
                console.log(`      Text: ${info.sample.textContent}...`);
            }
        });
        
        console.log('\n🎵 Potential event text found:');
        wpStructure.eventElements.slice(0, 10).forEach((el, i) => {
            console.log(`   ${i + 1}. <${el.tagName} class="${el.className}">`);
            console.log(`      "${el.text}"`);
        });
        
        // Check for any calendar or date elements
        const calendarElements = await page.evaluate(() => {
            const results = [];
            const calendarSelectors = [
                '.calendar', '.cal', '[class*="calendar"]', '[class*="cal-"]',
                '.date', '[class*="date"]', '[class*="time"]',
                '[class*="month"]', '[class*="day"]', '[class*="year"]'
            ];
            
            calendarSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        results.push({
                            selector,
                            count: elements.length,
                            samples: Array.from(elements).slice(0, 3).map(el => ({
                                tagName: el.tagName,
                                className: el.className,
                                textContent: el.textContent.trim().substring(0, 100)
                            }))
                        });
                    }
                } catch (e) {
                    // Skip
                }
            });
            
            return results;
        });
        
        console.log('\n📅 Calendar/Date elements:');
        calendarElements.forEach(item => {
            console.log(`   ${item.selector}: ${item.count} elements`);
            item.samples.forEach((sample, i) => {
                console.log(`      ${i + 1}. <${sample.tagName} class="${sample.className}">`);
                console.log(`         "${sample.textContent}"`);
            });
        });
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the debug
if (require.main === module) {
    debugFoufounes()
        .then(() => {
            console.log('\n🎉 Foufounes debug completed!');
        })
        .catch(error => {
            console.error('Debug error:', error);
        });
}
