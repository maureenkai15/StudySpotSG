import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const FIXES = [
  { slug: "central-public-library", lat: 1.2972, lng: 103.8548 },
  { slug: "ang-mo-kio-public-library", lat: 1.3700, lng: 103.8487 },
  { slug: "jurong-regional-library", lat: 1.3332, lng: 103.7436 },
  { slug: "tampines-regional-library", lat: 1.3530, lng: 103.9446 },
  { slug: "woodlands-regional-library", lat: 1.4368, lng: 103.7862 },
  { slug: "yishun-public-library", lat: 1.4292, lng: 103.8350 },
  { slug: "nus-central-library", lat: 1.2966, lng: 103.7764 },
  { slug: "smu-li-ka-shing-library", lat: 1.2974, lng: 103.8494 },
  { slug: "mcdonalds-bugis-24h", lat: 1.2990, lng: 103.8553 },
  { slug: "bedok-public-library", lat: 1.3240, lng: 103.9300 },
  { slug: "clementi-public-library", lat: 1.3150, lng: 103.7650 },
  { slug: "library-harbourfront", lat: 1.2645, lng: 103.8220 },
  { slug: "library-orchard", lat: 1.3008, lng: 103.8392 },
  { slug: "sengkang-public-library", lat: 1.3917, lng: 103.8953 },
  { slug: "mcdonalds-tampines-24h", lat: 1.3530, lng: 103.9440 },
  { slug: "mcdonalds-woodlands-24h", lat: 1.4368, lng: 103.7860 },
  { slug: "mcdonalds-clementi-24h", lat: 1.3155, lng: 103.7651 },
];

async function main() {
  console.log("Fixing coordinates...");
  for (const fix of FIXES) {
    await prisma.studySpot.update({
      where: { slug: fix.slug },
      data: { lat: fix.lat, lng: fix.lng },
    });
    console.log(`✅ ${fix.slug}`);
  }
  console.log("✨ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());