import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPOTS = [
  {
    name: "Central Public Library",
    slug: "central-public-library",
    category: "NLB_LIBRARY" as const,
    address: "100 Victoria Street, Singapore 188064",
    postalCode: "188064",
    lat: 1.2964, lng: 103.8551,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: true,
    bookingUrl: "https://www.nlb.gov.sg/main/services/Room-Booking",
    isFree: true, totalSeats: 200,
    groupStudy: true, soloStudy: true, privateRooms: 8,
    nearestMrt: "Bugis", mrtWalkMins: 5,
    isVerified: true, tags: ["study-room", "quiet-zone"],
    externalId: "CPL",
  },
  {
    name: "Ang Mo Kio Public Library",
    slug: "ang-mo-kio-public-library",
    category: "NLB_LIBRARY" as const,
    address: "4300 Ang Mo Kio Avenue 6, Singapore 569841",
    postalCode: "569841",
    lat: 1.3691, lng: 103.8454,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: true,
    bookingUrl: "https://www.nlb.gov.sg/main/services/Room-Booking",
    isFree: true, totalSeats: 120,
    groupStudy: true, soloStudy: true, privateRooms: 4,
    nearestMrt: "Ang Mo Kio", mrtWalkMins: 3,
    isVerified: true, tags: ["study-room"],
    externalId: "AMKL",
  },
  {
    name: "Jurong Regional Library",
    slug: "jurong-regional-library",
    category: "NLB_LIBRARY" as const,
    address: "21 Jurong East Central 1, Singapore 609732",
    postalCode: "609732",
    lat: 1.3329, lng: 103.7427,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: true,
    bookingUrl: "https://www.nlb.gov.sg/main/services/Room-Booking",
    isFree: true, totalSeats: 180,
    groupStudy: true, soloStudy: true, privateRooms: 6,
    nearestMrt: "Jurong East", mrtWalkMins: 2,
    isVerified: true, tags: ["study-room", "western-singapore"],
    externalId: "JRL",
  },
  {
    name: "Tampines Regional Library",
    slug: "tampines-regional-library",
    category: "NLB_LIBRARY" as const,
    address: "1 Tampines Walk, Singapore 528523",
    postalCode: "528523",
    lat: 1.3536, lng: 103.9441,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: true,
    bookingUrl: "https://www.nlb.gov.sg/main/services/Room-Booking",
    isFree: true, totalSeats: 160,
    groupStudy: true, soloStudy: true, privateRooms: 5,
    nearestMrt: "Tampines", mrtWalkMins: 3,
    isVerified: true, tags: ["eastern-singapore"],
    externalId: "TRL",
  },
  {
    name: "Woodlands Regional Library",
    slug: "woodlands-regional-library",
    category: "NLB_LIBRARY" as const,
    address: "900 South Woodlands Drive, Singapore 730900",
    postalCode: "730900",
    lat: 1.4363, lng: 103.7862,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: true,
    bookingUrl: "https://www.nlb.gov.sg/main/services/Room-Booking",
    isFree: true, totalSeats: 150,
    groupStudy: true, soloStudy: true, privateRooms: 5,
    nearestMrt: "Woodlands", mrtWalkMins: 5,
    isVerified: true, tags: ["northern-singapore"],
    externalId: "WRL",
  },
  {
    name: "Yishun Public Library",
    slug: "yishun-public-library",
    category: "NLB_LIBRARY" as const,
    address: "930 Yishun Avenue 2, Singapore 769098",
    postalCode: "769098",
    lat: 1.4297, lng: 103.8354,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: false,
    isFree: true, totalSeats: 80,
    groupStudy: false, soloStudy: true, privateRooms: 2,
    nearestMrt: "Yishun", mrtWalkMins: 4,
    isVerified: true, tags: ["northern-singapore"],
    externalId: "YSL",
  },
  {
    name: "NUS Central Library",
    slug: "nus-central-library",
    category: "UNIVERSITY_LIBRARY" as const,
    address: "12 Kent Ridge Crescent, Singapore 119275",
    postalCode: "119275",
    lat: 1.2966, lng: 103.7764,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "SILENT" as const,
    is24Hours: false, requiresBooking: false,
    isFree: true, totalSeats: 400,
    groupStudy: true, soloStudy: true, privateRooms: 15,
    nearestMrt: "Kent Ridge", mrtWalkMins: 12,
    isVerified: true, tags: ["nus", "university", "silent-zone"],
  },
  {
    name: "SMU Li Ka Shing Library",
    slug: "smu-li-ka-shing-library",
    category: "UNIVERSITY_LIBRARY" as const,
    address: "70 Stamford Road, Singapore 178901",
    postalCode: "178901",
    lat: 1.2974, lng: 103.8494,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: false,
    isFree: true, totalSeats: 250,
    groupStudy: true, soloStudy: true, privateRooms: 10,
    nearestMrt: "City Hall", mrtWalkMins: 5,
    isVerified: true, tags: ["smu", "university", "city"],
  },
  {
    name: "McDonald's Bugis 24 Hours",
    slug: "mcdonalds-bugis-24h",
    category: "MCDONALDS_24H" as const,
    address: "200 Victoria Street, Bugis Junction, Singapore 188021",
    postalCode: "188021",
    lat: 1.2990, lng: 103.8553,
    hasWifi: true, hasPowerSockets: false, isAirCon: true,
    noiseLevel: "MODERATE" as const,
    is24Hours: true, requiresBooking: false,
    isFree: false, totalSeats: 120,
    groupStudy: true, soloStudy: true, privateRooms: 0,
    nearestMrt: "Bugis", mrtWalkMins: 2,
    isVerified: true, tags: ["24h", "late-night", "budget"],
  },
  {
    name: "Bishan Community Club Study Corner",
    slug: "bishan-cc-study-corner",
    category: "COMMUNITY_CENTER" as const,
    address: "51 Bishan Street 13, Singapore 579799",
    postalCode: "579799",
    lat: 1.3509, lng: 103.8487,
    hasWifi: true, hasPowerSockets: true, isAirCon: true,
    noiseLevel: "QUIET" as const,
    is24Hours: false, requiresBooking: false,
    isFree: true, totalSeats: 40,
    groupStudy: false, soloStudy: true, privateRooms: 0,
    nearestMrt: "Bishan", mrtWalkMins: 8,
    isVerified: true, tags: ["community", "free", "quiet"],
  },
];

async function main() {
  console.log("🌱 Seeding StudySpotSG database...");

  let created = 0;
  let skipped = 0;

  for (const spot of SPOTS) {
    const { externalId, ...spotData } = spot as any;

    try {
      const existing = await prisma.studySpot.findUnique({
        where: { slug: spotData.slug },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.studySpot.create({
        data: {
          ...spotData,
          dataSource: "manual",
          externalId: externalId || null,
          openingHours: {
            create: [
              { dayOfWeek: 0, openTime: "10:00", closeTime: "21:00" },
              { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00" },
              { dayOfWeek: 2, openTime: "09:00", closeTime: "21:00" },
              { dayOfWeek: 3, openTime: "09:00", closeTime: "21:00" },
              { dayOfWeek: 4, openTime: "09:00", closeTime: "21:00" },
              { dayOfWeek: 5, openTime: "09:00", closeTime: "21:00" },
              { dayOfWeek: 6, openTime: "10:00", closeTime: "21:00" },
            ],
          },
        },
      });

      console.log(`  ✅ Created: ${spotData.name}`);
      created++;
    } catch (err) {
      console.error(`  ❌ Failed: ${spotData.name}`, err);
    }
  }

  console.log(`\n✨ Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());