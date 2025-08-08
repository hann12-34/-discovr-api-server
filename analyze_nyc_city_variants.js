/**
 * NYC City Variants Analysis Script
 * Analyzes venue addresses/locations to find New York events that don't explicitly say "New York"
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('./models/Event');

async function analyzeNYCCityVariants() {
  try {
    console.log('🔍 ANALYZING NYC CITY VARIANTS IN VENUE DATA...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all events from the database
    const allEvents = await Event.find({}).lean();
    console.log(`📊 Total events in database: ${allEvents.length}\n`);

    // NYC-related keywords to search for
    const nycVariants = [
      'nyc', 'new york', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island',
      'harlem', 'williamsburg', 'soho', 'tribeca', 'chelsea', 'midtown', 'downtown',
      'upper east side', 'upper west side', 'lower east side', 'east village', 'west village',
      'greenwich village', 'financial district', 'chinatown', 'little italy',
      'times square', 'broadway', 'central park', 'wall street', 'fifth avenue',
      'madison avenue', 'park avenue', 'lexington avenue'
    ];

    // Track events by variant
    const variantCounts = {};
    const exactNYEvents = [];
    const variantNYEvents = [];
    const potentialNYEvents = [];

    allEvents.forEach(event => {
      const location = (event.location || '').toLowerCase();
      const venueName = (event.venue?.name || '').toLowerCase();
      const venueAddress = (event.venue?.address || '').toLowerCase();
      const eventTitle = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      
      // Combine all text fields for searching
      const allText = `${location} ${venueName} ${venueAddress} ${eventTitle} ${description}`;
      
      // Check for exact "New York" match (what the app currently finds)
      if (location.includes('new york') || venueName.includes('new york') || venueAddress.includes('new york')) {
        exactNYEvents.push({
          title: event.title,
          location: event.location,
          venue: event.venue,
          id: event._id
        });
      }
      
      // Check for NYC variants
      const foundVariants = [];
      nycVariants.forEach(variant => {
        if (allText.includes(variant)) {
          foundVariants.push(variant);
          variantCounts[variant] = (variantCounts[variant] || 0) + 1;
        }
      });
      
      if (foundVariants.length > 0) {
        if (!exactNYEvents.some(exact => exact.id.toString() === event._id.toString())) {
          variantNYEvents.push({
            title: event.title,
            location: event.location,
            venue: event.venue,
            foundVariants: foundVariants,
            id: event._id
          });
        }
      }
    });

    console.log('🗽 NEW YORK EVENTS ANALYSIS:');
    console.log('=' .repeat(60));
    console.log(`✅ Events with explicit "New York": ${exactNYEvents.length}`);
    console.log(`🔍 Events with NYC variants (hidden from app): ${variantNYEvents.length}`);
    console.log(`📊 Total potential NYC events: ${exactNYEvents.length + variantNYEvents.length}\n`);

    console.log('🏷️ NYC VARIANT FREQUENCY:');
    console.log('=' .repeat(40));
    Object.entries(variantCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([variant, count]) => {
        console.log(`${variant.padEnd(20)}: ${count} events`);
      });

    console.log('\n📍 SAMPLE EVENTS WITH VARIANTS (HIDDEN FROM APP):');
    console.log('=' .repeat(60));
    variantNYEvents.slice(0, 10).forEach((event, index) => {
      console.log(`${index + 1}. "${event.title}"`);
      console.log(`   Location: ${event.location || 'N/A'}`);
      console.log(`   Venue: ${event.venue?.name || 'N/A'} | ${event.venue?.address || 'N/A'}`);
      console.log(`   Variants found: ${event.foundVariants.join(', ')}`);
      console.log('');
    });

    console.log('\n✅ SAMPLE EVENTS WITH "NEW YORK" (VISIBLE IN APP):');
    console.log('=' .repeat(60));
    exactNYEvents.slice(0, 5).forEach((event, index) => {
      console.log(`${index + 1}. "${event.title}"`);
      console.log(`   Location: ${event.location || 'N/A'}`);
      console.log(`   Venue: ${event.venue?.name || 'N/A'} | ${event.venue?.address || 'N/A'}`);
      console.log('');
    });

    // Generate summary for fix strategy
    console.log('\n🎯 FIX STRATEGY RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    console.log(`❌ Currently app shows: ${exactNYEvents.length} New York events`);
    console.log(`✅ Should show after fix: ${exactNYEvents.length + variantNYEvents.length} New York events`);
    console.log(`📈 Improvement: +${variantNYEvents.length} events (+${Math.round((variantNYEvents.length / (exactNYEvents.length || 1)) * 100)}%)`);
    
    if (variantNYEvents.length > 0) {
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Add "New York" to venue.city field for all NYC variant events');
      console.log('2. Normalize venue addresses to include "New York, NY"');
      console.log('3. Enhance app city filtering to recognize NYC variants');
    }

    console.log('\n🏆 SUCCESS! Analysis complete.');
    
  } catch (error) {
    console.error('❌ Error analyzing NYC variants:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run the analysis
analyzeNYCCityVariants().catch(console.error);
