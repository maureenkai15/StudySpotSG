import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../server";

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateResponse(message: string, spots: any[]): string {
  const msg = message.toLowerCase();
  const now = new Date();
  const hour = parseInt(new Date().toLocaleString("en-SG", { hour: "numeric", hour12: false, timeZone: "Asia/Singapore" }));

  const quiet = spots.filter(s => s.noiseLevel === "QUIET" || s.noiseLevel === "SILENT");
  const open24h = spots.filter(s => s.is24Hours);
  const free = spots.filter(s => s.isFree);
  const withPower = spots.filter(s => s.hasPowerSockets);
  const group = spots.filter(s => s.groupStudy);
  const nlb = spots.filter(s => s.category === "NLB_LIBRARY");

  if (msg.includes("24") || msg.includes("late") || msg.includes("midnight") || msg.includes("night")) {
    const spot = open24h[0];
    return `For late-night studying, ${spot?.name || "McDonald's Bugis"} is your best bet — open 24/7 with WiFi. ${open24h[1] ? `${open24h[1].name} near ${open24h[1].nearestMrt} MRT is another good option.` : ""} Hang in there — you've got this! 💪`;
  }

  if (msg.includes("quiet") || msg.includes("silent") || msg.includes("focus") || msg.includes("solo")) {
    const spot = quiet[0];
    return `For a quiet study session, ${spot?.name || "Central Public Library"} is perfect — library-quiet environment with WiFi and power sockets. ${spot?.nearestMrt ? `It's near ${spot.nearestMrt} MRT, just ${spot.mrtWalkMins} min walk.` : ""} ${spot?.requiresBooking ? "Note: booking required via NLB eServices." : "No booking needed, just head over!"}`;
  }

  if (msg.includes("group") || msg.includes("team") || msg.includes("project")) {
    const spot = group[0];
    return `For group study, ${spot?.name || "Jurong Regional Library"} has dedicated group study areas. ${group[1] ? `${group[1].name} near ${group[1].nearestMrt} is also great for teams.` : ""} Remember to book a room in advance if you need a private space!`;
  }

  if (msg.includes("free") || msg.includes("no cost") || msg.includes("budget")) {
    const spot = free[0];
    return `All NLB libraries are free to use! ${spot?.name} near ${spot?.nearestMrt} MRT is a great free option with WiFi and air-con. Community centres also have free study corners — check Bishan CC or Woodlands CC.`;
  }

  if (msg.includes("power") || msg.includes("charging") || msg.includes("socket") || msg.includes("plug")) {
    const spot = withPower[0];
    return `${spot?.name || "Central Public Library"} has power sockets throughout — great for long sessions. ${withPower[1] ? `${withPower[1].name} near ${withPower[1].nearestMrt} also has charging points.` : ""} Most NLB libraries and coworking spaces have sockets too!`;
  }

  if (msg.includes("nlb") || msg.includes("library") || msg.includes("librar")) {
    const spot = nlb[0];
    return `NLB libraries are the gold standard for studying in Singapore! ${spot?.name} is well-equipped with WiFi, air-con and study rooms. Book a study room via NLB eServices 2-3 days ahead, especially during exam season. They're free and open to all!`;
  }

  if (msg.includes("near") || msg.includes("close") || msg.includes("mrt") || msg.includes("nearby")) {
    const areas = ["tampines", "jurong", "woodlands", "yishun", "bishan", "clementi", "bugis", "orchard", "novena", "bedok", "serangoon", "ang mo kio", "amk"];
    const mentioned = areas.find(a => msg.includes(a));
    if (mentioned) {
      const nearby = spots.filter(s => s.nearestMrt?.toLowerCase().includes(mentioned) || s.address.toLowerCase().includes(mentioned));
      if (nearby.length > 0) {
        return `Near ${mentioned.toUpperCase()}, I'd recommend ${nearby[0].name} — ${nearby[0].address}. It's ${nearby[0].mrtWalkMins || "a few"} min walk from the MRT${nearby[0].hasWifi ? ", has WiFi" : ""}${nearby[0].hasPowerSockets ? " and power sockets" : ""}. ${nearby[1] ? `${nearby[1].name} is another nearby option!` : ""}`;
      }
    }
    const spot = spots[0];
    return `The closest well-equipped spot to you would be ${spot?.name} near ${spot?.nearestMrt} MRT. Enable "Near me" at the top for distance-sorted results!`;
  }

  if (hour >= 22 || hour < 6) {
    return `It's late — you're dedicated! 💪 For late-night studying, McDonald's Bugis, Tampines and Woodlands are open 24/7. Changi Airport T2 McDonald's is also a great late-night spot. Stay hydrated and take breaks!`;
  }

  // Default helpful response
  const spot = spots[Math.floor(Math.random() * Math.min(3, spots.length))];
  return `Based on your query, I'd suggest ${spot?.name || "Central Public Library"} — it has ${spot?.hasWifi ? "WiFi, " : ""}${spot?.hasPowerSockets ? "power sockets, " : ""}${spot?.isAirCon ? "air-con" : ""} and is near ${spot?.nearestMrt || "the city"} MRT. ${spot?.isFree ? "Best part — it's free!" : ""} Use the filters above to find the perfect spot for your needs!`;
}

router.post("/", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { message, lat, lng } = chatSchema.parse(req.body);

    let spots = await prisma.studySpot.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, category: true, address: true,
        lat: true, lng: true, hasWifi: true, hasPowerSockets: true,
        isAirCon: true, is24Hours: true, noiseLevel: true, nearestMrt: true,
        mrtWalkMins: true, requiresBooking: true, isFree: true,
        totalSeats: true, groupStudy: true,
      },
    });

    if (lat && lng) {
      spots = spots
        .map((s) => ({ ...s, _dist: haversineKm(lat, lng, s.lat, s.lng) }))
        .sort((a: any, b: any) => a._dist - b._dist) as typeof spots;
    }

    const response = generateResponse(message, spots);

    // Stream word by word for a typing effect
    const words = response.split(" ");
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + " " })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }

    res.write(`data: ${JSON.stringify({ type: "spots", spots: spots.slice(0, 3) })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ text: "Sorry, something went wrong. Please try again!" })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;