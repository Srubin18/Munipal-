import * as fs from "fs";

// Clean the scraped property data to remove non-property listings

const inputPath = "/Users/simon/Desktop/munipal/data/soweto-properties.json";
const outputPath = "/Users/simon/Desktop/munipal/data/soweto-properties-cleaned.json";
const csvOutputPath = "/Users/simon/Desktop/munipal/data/soweto-properties-cleaned.csv";

// Township areas we're interested in
const TOWNSHIP_AREAS = [
  "soweto", "diepkloof", "meadowlands", "dobsonville", "protea", "pimville",
  "orlando", "kliptown", "eldorado", "lenasia", "ennerdale", "orange farm",
  "evaton", "sebokeng", "tembisa", "alexandra", "katlehong", "thokoza",
  "vosloorus", "daveyton", "tsakane", "duduza", "kwathema", "springs",
  "brakpan", "benoni", "germiston", "boksburg", "kempton", "ivory",
  "ebony park", "cosmo city", "zandspruit", "diepsloot"
];

// Words that indicate it's NOT a property listing
const EXCLUDE_KEYWORDS = [
  "car", "vehicle", "toyota", "volkswagen", "bmw", "mercedes", "audi", "ford",
  "hyundai", "kia", "nissan", "mazda", "honda", "opel", "renault", "suzuki",
  "mitsubishi", "land rover", "range rover", "jeep", "isuzu", "chevrolet",
  "tyres", "wheels", "rims", "engine", "gearbox", "spare parts",
  "phone", "laptop", "computer", "tv", "television", "furniture"
];

// Property types to keep
const PROPERTY_TYPES = [
  "house", "apartment", "flat", "townhouse", "duplex", "simplex",
  "room", "backroom", "cottage", "granny flat", "studio", "land",
  "plot", "residential", "property"
];

function cleanData() {
  console.log("Loading property data...");
  const rawData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  console.log(`Total raw listings: ${rawData.listings.length}`);

  const cleanedListings = rawData.listings.filter((listing: any) => {
    const title = (listing.title || "").toLowerCase();
    const type = (listing.propertyType || "").toLowerCase();
    const suburb = (listing.suburb || listing.address || "").toLowerCase();
    const description = (listing.description || "").toLowerCase();
    const combined = `${title} ${type} ${description}`;

    // Exclude if it contains car/non-property keywords
    for (const keyword of EXCLUDE_KEYWORDS) {
      if (combined.includes(keyword)) {
        return false;
      }
    }

    // Must have a price that looks like property price (R xxx xxx or R x xxx)
    const price = listing.price || "";
    const priceMatch = price.match(/R\s*[\d,\s]+/);
    if (!priceMatch) return false;

    // Extract numeric value
    const numericPrice = parseInt(price.replace(/[^\d]/g, ""));

    // Filter out prices that are too low (probably not properties) or missing
    // Rentals can be R2000+, sales typically R100,000+
    if (numericPrice < 1500) return false;

    // Check if it looks like a property type
    const hasPropertyType = PROPERTY_TYPES.some(pt =>
      type.includes(pt) || title.includes(pt)
    );

    // Check if it's in a township area (bonus but not required)
    const isInTownship = TOWNSHIP_AREAS.some(area =>
      suburb.includes(area) || title.includes(area)
    );

    // Keep if it has a property type OR reasonable price
    return hasPropertyType || numericPrice >= 50000;
  });

  console.log(`Cleaned listings: ${cleanedListings.length}`);
  console.log(`Removed: ${rawData.listings.length - cleanedListings.length} non-property listings`);

  // Group by listing type (sale vs rent)
  const forSale = cleanedListings.filter((l: any) => {
    const price = parseInt((l.price || "").replace(/[^\d]/g, ""));
    return price >= 100000; // Likely for sale
  });

  const forRent = cleanedListings.filter((l: any) => {
    const price = parseInt((l.price || "").replace(/[^\d]/g, ""));
    return price < 100000 && price >= 1500; // Likely rental
  });

  console.log(`\nFor Sale: ${forSale.length}`);
  console.log(`For Rent: ${forRent.length}`);

  // Price analysis
  const salePrices = forSale.map((l: any) => parseInt((l.price || "").replace(/[^\d]/g, "")));
  const rentPrices = forRent.map((l: any) => parseInt((l.price || "").replace(/[^\d]/g, "")));

  if (salePrices.length > 0) {
    const avgSale = salePrices.reduce((a: number, b: number) => a + b, 0) / salePrices.length;
    const minSale = Math.min(...salePrices);
    const maxSale = Math.max(...salePrices);
    console.log(`\nSale Prices:`);
    console.log(`  Min: R ${minSale.toLocaleString()}`);
    console.log(`  Max: R ${maxSale.toLocaleString()}`);
    console.log(`  Avg: R ${Math.round(avgSale).toLocaleString()}`);
  }

  if (rentPrices.length > 0) {
    const avgRent = rentPrices.reduce((a: number, b: number) => a + b, 0) / rentPrices.length;
    const minRent = Math.min(...rentPrices);
    const maxRent = Math.max(...rentPrices);
    console.log(`\nRental Prices:`);
    console.log(`  Min: R ${minRent.toLocaleString()}`);
    console.log(`  Max: R ${maxRent.toLocaleString()}`);
    console.log(`  Avg: R ${Math.round(avgRent).toLocaleString()}`);
  }

  // Save cleaned data
  const output = {
    ...rawData,
    totalListings: cleanedListings.length,
    listings: cleanedListings,
    summary: {
      forSale: forSale.length,
      forRent: forRent.length,
      removed: rawData.listings.length - cleanedListings.length
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Cleaned JSON saved to: ${outputPath}`);

  // CSV export
  const csvHeader = "Title,Price,Suburb,Bedrooms,Bathrooms,Type,Source,Contact,URL\n";
  const csvRows = cleanedListings.map((l: any) =>
    `"${(l.title || '').replace(/"/g, '""')}","${l.price || ''}","${l.suburb || l.address || ''}","${l.bedrooms || ''}","${l.bathrooms || ''}","${l.propertyType || ''}","${l.sourceSite || ''}","${l.contactNumber || ''}","${l.url || l.sourceUrl || ''}"`
  ).join("\n");
  fs.writeFileSync(csvOutputPath, csvHeader + csvRows);
  console.log(`✓ Cleaned CSV saved to: ${csvOutputPath}`);

  // Show sample cleaned listings
  console.log("\n" + "=".repeat(60));
  console.log("SAMPLE CLEANED LISTINGS:");
  console.log("=".repeat(60));

  for (const listing of cleanedListings.slice(0, 10)) {
    console.log(`\n${listing.title || "No title"}`);
    console.log(`  Price: ${listing.price || "N/A"}`);
    console.log(`  Location: ${listing.suburb || listing.address || "N/A"}`);
    console.log(`  Type: ${listing.propertyType || "N/A"}`);
    console.log(`  Source: ${listing.sourceSite || "N/A"}`);
  }
}

cleanData();
