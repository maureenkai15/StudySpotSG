export type SpotCategory =
  | "NLB_LIBRARY"
  | "UNIVERSITY_LIBRARY"
  | "COMMUNITY_CENTER"
  | "CAFE"
  | "COWORKING"
  | "MAKERSPACE"
  | "SHOPPING_MALL"
  | "HAWKER_CENTER"
  | "MCDONALDS_24H"
  | "OTHER";

export type NoiseLevel = "SILENT" | "QUIET" | "MODERATE" | "LIVELY";
export type CrowdLevel = "EMPTY" | "QUIET" | "MODERATE" | "BUSY" | "FULL" | "UNKNOWN";

export interface OccupancyData {
  occupancyPct: number;
  crowdLevel: CrowdLevel;
  source: string;
  updatedAt: string;
}

export interface OpeningHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface StudySpot {
  id: string;
  name: string;
  slug: string;
  category: SpotCategory;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
  hasWifi: boolean;
  hasPowerSockets: boolean;
  isAirCon: boolean;
  noiseLevel: NoiseLevel;
  is24Hours: boolean;
  requiresBooking: boolean;
  bookingUrl?: string;
  isFree: boolean;
  pricePerHour?: number;
  totalSeats?: number;
  groupStudy: boolean;
  soloStudy: boolean;
  privateRooms: number;
  nearestMrt?: string;
  mrtWalkMins?: number;
  isVerified: boolean;
  imageUrls: string[];
  tags: string[];
  openingHours?: OpeningHours[];
  occupancy?: OccupancyData | null;
  _distance?: number;
  _count?: { reviews: number };
}

export interface FilterState {
  hasWifi: boolean;
  hasPowerSockets: boolean;
  is24Hours: boolean;
  isFree: boolean;
  groupStudy: boolean;
  radiusKm: number;
}