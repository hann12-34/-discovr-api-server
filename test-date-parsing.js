// Test date parsing patterns

const testDates = [
    "September 10th 2025",
    "July 26th 2025", 
    "July 22nd 2025",
    "December 31st 2025"
];

function testPatterns() {
    console.log('Testing date patterns...\n');
    
    // Pattern 1: Month Day Year (my new pattern)
    const monthDayYearPattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i;
    
    // Pattern 2: More flexible
    const monthDayYearPattern2 = /(\d{1,2})\s+([\w]+)\s+(\d{4})|([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
    
    testDates.forEach(dateStr => {
        console.log(`Testing: "${dateStr}"`);
        
        const match1 = dateStr.match(monthDayYearPattern);
        const match2 = dateStr.match(monthDayYearPattern2);
        
        console.log(`  Pattern 1: ${match1 ? 'MATCH' : 'NO MATCH'}`);
        if (match1) {
            console.log(`    Month: ${match1[1]}, Day: ${match1[2]}, Year: ${match1[3]}`);
        }
        
        console.log(`  Pattern 2: ${match2 ? 'MATCH' : 'NO MATCH'}`);
        if (match2) {
            if (match2[1]) {
                console.log(`    Day: ${match2[1]}, Month: ${match2[2]}, Year: ${match2[3]}`);
            } else {
                console.log(`    Month: ${match2[4]}, Day: ${match2[5]}, Year: ${match2[6]}`);
            }
        }
        
        console.log('');
    });
    
    // Test month mapping
    console.log('Testing month mapping...');
    const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
    };
    
    ['July', 'September', 'December'].forEach(month => {
        const monthNum = months[month.toLowerCase()];
        console.log(`  ${month} -> ${monthNum}`);
    });
}

testPatterns();
