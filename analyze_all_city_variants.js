/**
 * All Cities Variants Analysis Script
 * Analyzes venue addresses/locations for all 5 focus cities to find hidden events
 * Calgary, Montreal, New York, Toronto, Vancouver
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function analyzeAllCityVariants() {
  try {
    console.log('🌍 ANALYZING ALL CITY VARIANTS IN VENUE DATA...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define city variants for all 5 focus cities
    const cityVariants = {
      'Calgary': [
        'calgary', 'yyc', 'cowtown', 'stampede city', 'alberta', 'ab',
        'bowness', 'kensington', 'inglewood', 'kingsland', 'mission',
        'eau claire', 'downtown calgary', 'calgary downtown', 'beltline',
        'hillhurst', 'chinatown calgary', 'forest lawn', 'mount royal'
      ],
      'Montreal': [
        'montreal', 'montréal', 'mtl', 'quebec', 'qc', 'old montreal',
        'vieux-montréal', 'plateau', 'mile end', 'westmount', 'outremont',
        'verdun', 'laval', 'longueuil', 'saint-laurent', 'rosemont',
        'hochelaga', 'villeray', 'ahuntsic', 'côte-des-neiges'
      ],
      'New York': [
        'nyc', 'new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island',
        'harlem', 'williamsburg', 'soho', 'tribeca', 'chelsea', 'midtown', 'downtown',
        'upper east side', 'upper west side', 'lower east side', 'east village', 'west village',
        'greenwich village', 'financial district', 'chinatown', 'little italy',
        'times square', 'broadway', 'central park', 'wall street', 'fifth avenue'
      ],
      'Toronto': [
        'toronto', 'to', 'the 6ix', 'the six', 'ontario', 'on', 'yyz',
        'downtown toronto', 'scarborough', 'north york', 'etobicoke', 'york',
        'mississauga', 'markham', 'richmond hill', 'vaughan', 'brampton',
        'king street', 'queen street', 'dundas', 'bloor', 'entertainment district',
        'distillery district', 'harbourfront', 'cn tower area', 'financial district toronto'
      ],
      'Vancouver': [
        'vancouver', 'yvr', 'van city', 'british columbia', 'bc', 'gastown',
        'yaletown', 'kitsilano', 'west end', 'commercial drive', 'main street',
        'granville', 'robson', 'downtown vancouver', 'north vancouver', 'west vancouver',
        'burnaby', 'richmond', 'surrey', 'coquitlam', 'new westminster',
        'chinatown vancouver', 'mount pleasant', 'fairview', 'kerrisdale'
      ]
    };

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    const cityResults = {};

    // Analyze each city
    for (const [cityName, variants] of Object.entries(cityVariants)) {
      console.log(`🏙️ ANALYZING ${cityName.toUpperCase()}...`);
      
      const exactMatches = [];
      const variantMatches = [];
      const variantCounts = {};

      for (const event of allEvents) {
        const location = (event.location || '').toLowerCase();
        const venueName = (event.venue?.name || '').toLowerCase();
        const venueAddress = (event.venue?.address || '').toLowerCase();
        const venueCity = (event.venue?.city || '').toLowerCase();
        const eventTitle = (event.title || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        
        // Combine all text fields for searching
        const allText = `${location} ${venueName} ${venueAddress} ${venueCity} ${eventTitle} ${description}`;
        
        // Check for exact city name match (what the app currently finds)
        const hasExactMatch = location.includes(cityName.toLowerCase()) || 
                            venueName.includes(cityName.toLowerCase()) || 
                            venueAddress.includes(cityName.toLowerCase()) ||
                            venueCity.includes(cityName.toLowerCase());
        
        if (hasExactMatch) {
          exactMatches.push({
            title: event.title,
            location: event.location,
            venue: event.venue,
            id: event._id
          });
        }
        
        // Check for city variants
        const foundVariants = [];
        variants.forEach(variant => {
          if (allText.includes(variant)) {
            foundVariants.push(variant);
            variantCounts[variant] = (variantCounts[variant] || 0) + 1;
          }
        });
        
        if (foundVariants.length > 0) {
          // Only add to variant matches if it's not already in exact matches
          if (!exactMatches.some(exact => exact.id.toString() === event._id.toString())) {
            variantMatches.push({
              title: event.title,
              location: event.location,
              venue: event.venue,
              foundVariants: foundVariants,
              id: event._id
            });
          }
        }
      }

      cityResults[cityName] = {
        exact: exactMatches.length,
        variants: variantMatches.length,
        total: exactMatches.length + variantMatches.length,
        variantCounts: variantCounts,
        sampleVariants: variantMatches.slice(0, 5),
        sampleExact: exactMatches.slice(0, 3)
      };

      console.log(`   ✅ Events with exact "${cityName}": ${exactMatches.length}`);
      console.log(`   🔍 Events with ${cityName} variants (hidden): ${variantMatches.length}`);
      console.log(`   📊 Total potential ${cityName} events: ${exactMatches.length + variantMatches.length}`);
      
      if (variantMatches.length > 0) {
        console.log(`   📈 Improvement possible: +${variantMatches.length} events (+${Math.round((variantMatches.length / (exactMatches.length || 1)) * 100)}%)`);
      }
      console.log('');
    }

    console.log('\n🏆 COMPREHENSIVE CITY ANALYSIS SUMMARY:');
    console.log('=' .repeat(80));
    console.log('City'.padEnd(12) + 'Current'.padEnd(12) + 'Hidden'.padEnd(12) + 'Total'.padEnd(12) + 'Improvement');
    console.log('-'.repeat(80));
    
    for (const [cityName, results] of Object.entries(cityResults)) {
      const improvement = results.variants > 0 ? `+${Math.round((results.variants / (results.exact || 1)) * 100)}%` : '0%';
      console.log(
        cityName.padEnd(12) + 
        results.exact.toString().padEnd(12) + 
        results.variants.toString().padEnd(12) + 
        results.total.toString().padEnd(12) + 
        improvement
      );
    }

    console.log('\n🎯 PRIORITY FIXES NEEDED:');
    console.log('=' .repeat(50));
    
    const sortedByImprovement = Object.entries(cityResults)
      .sort((a, b) => b[1].variants - a[1].variants)
      .filter(([_, results]) => results.variants > 0);

    if (sortedByImprovement.length > 0) {
      sortedByImprovement.forEach(([cityName, results], index) => {
        console.log(`${index + 1}. ${cityName}: +${results.variants} hidden events`);
        
        // Show top variants for this city
        const topVariants = Object.entries(results.variantCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        if (topVariants.length > 0) {
          console.log(`   Top variants: ${topVariants.map(([variant, count]) => `${variant}(${count})`).join(', ')}`);
        }
        
        // Show sample hidden events
        if (results.sampleVariants.length > 0) {
          console.log(`   Sample hidden events:`);
          results.sampleVariants.slice(0, 2).forEach(event => {
            console.log(`   - "${event.title}" (${event.foundVariants.join(', ')})`);
          });
        }
        console.log('');
      });
    } else {
      console.log('✅ All cities have perfect visibility - no hidden events found!');
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('=' .repeat(30));
    sortedByImprovement.forEach(([cityName, results], index) => {
      if (results.variants > 10) {
        console.log(`${index + 1}. Create normalization script for ${cityName} (+${results.variants} events)`);
      }
    });

    console.log('\n🏆 ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error analyzing city variants:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the analysis
analyzeAllCityVariants().catch(console.error);
