#!/usr/bin/env python3
"""
MongoDB Integration Utility for Fortune Sound Club Event Scraper
---------------------------------------------------------------
This script takes the output from fortune_scraper.py and prepares it 
for insertion into the MongoDB database used by the Discovr app.
"""

import json
import sys
import os
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import argparse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('mongodb_integration')

# Default paths
DEFAULT_INPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fortune_events.json")
DEFAULT_OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fortune_events_mongodb.json")


def convert_to_mongodb_format(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a single event to the MongoDB API format used by Discovr app
    """
    # Extract coordinates correctly based on the Fox Cabaret format
    coordinates = None
    venue = event.get("venue", {})
    if venue:
        if "coordinates" in venue:
            lat = venue["coordinates"].get("lat")
            lng = venue["coordinates"].get("lng")
            if lat and lng:
                coordinates = [lng, lat]  # GeoJSON uses [longitude, latitude]
    
    # Create location object
    location = {
        "type": "Point",
        "coordinates": coordinates
    } if coordinates else None
    
    # Extract dates correctly - they might be already in ISO format strings
    start_date = event.get("startDate") if isinstance(event.get("startDate"), str) else event.get("date")
    end_date = event.get("endDate") if isinstance(event.get("endDate"), str) else None
    
    # Build the MongoDB event object
    mongodb_event = {
        "name": event.get("name", event.get("title", "Unknown Event")),
        "description": event.get("description", ""),
        "venue": {
            "name": venue.get("name", "Fortune Sound Club"),
            "address": venue.get("address", "147 East Pender Street, Vancouver, BC"),
            "location": location
        },
        "start_date": start_date,
        "end_date": end_date,
        "ticket_url": event.get("ticketURL"),
        "image_url": event.get("image"),
        "source_url": event.get("officialWebsite", event.get("sourceURL")),
        "source": "FortuneSound",
        "tags": event.get("categories", ["music", "concert", "nightlife", "vancouver"]),
        "active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    return mongodb_event


def convert_events_file(input_file: str, output_file: str) -> None:
    """
    Convert the entire events JSON file to MongoDB format
    """
    try:
        # Read input file
        with open(input_file, 'r', encoding='utf-8') as f:
            events = json.load(f)  # Direct array format now
            
        logger.info(f"Found {len(events)} events in {input_file}")
        
        # Convert each event
        mongodb_events = []
        for event in events:
            mongodb_event = convert_to_mongodb_format(event)
            mongodb_events.append(mongodb_event)
        
        # Create final output structure
        output_data = {
            "events": mongodb_events,
            "count": len(mongodb_events),
            "source": "FortuneSound",
            "processed_at": datetime.now().isoformat()
        }
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Successfully converted {len(mongodb_events)} events to MongoDB format")
        logger.info(f"Output saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Error converting events: {e}")
        raise


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Convert Fortune Sound Club events to MongoDB format')
    parser.add_argument('-i', '--input', default=DEFAULT_INPUT, help='Input JSON file from fortune_scraper.py')
    parser.add_argument('-o', '--output', default=DEFAULT_OUTPUT, help='Output JSON file in MongoDB format')
    
    args = parser.parse_args()
    
    logger.info(f"Converting {args.input} to MongoDB format")
    convert_events_file(args.input, args.output)


if __name__ == "__main__":
    main()
