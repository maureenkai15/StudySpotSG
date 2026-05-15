import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma, redis } from "../server";

const router = Router();

const listSpotsSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().default(5),
  hasWifi: z.coerce.boolean().optional(),
  hasPowerSockets: z.coerce.boolean().optional(),
  is24Hours: z.coerce.boolean().optional(),
  isFree: z.coerce.boolean().optional(),
  groupStudy: z.coerce.boolean().optional(),
  limit: z.coerce.number().default(30),
  offset: z.coerce.number().default(0),
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const params = listSpotsSchema.parse(req.query);
    const cacheKey = `spots:list:${JSON.stringify(params)}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const where: Record<string, unknown> = { isActive: true };
    if (params.hasWifi !== undefined) where.hasWifi = params.hasWifi;
    if (params.hasPowerSockets !== undefined) where.hasPowerSockets = params.hasPowerSockets;
    if (params.is24Hours !== undefined) where.is24Hours = params.is24Hours;
    if (params.isFree !== undefined) where.isFree = params.isFree;
    if (params.groupStudy !== undefined) where.groupStudy = params.groupStudy;

    let spots = await prisma.studySpot.findMany({
      where,
      include: {
        openingHours: true,
        nlbBranch: true,
        _count: { select: { reviews: true } },
      },
      take: params.limit,
      skip: params.offset,
    });

    if (params.lat && params.lng) {
      spots = spots
        .map((s) => ({ ...s, _distance: haversineKm(params.lat!, params.lng!, s.lat, s.lng) }))
        .filter((s) => s._distance <= params.radiusKm)
        .sort((a, b) => a._distance - b._distance) as typeof spots;
    }

    const response = { spots, total: spots.length };
    await redis.setex(cacheKey, 120, JSON.stringify(response));

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid parameters", details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to fetch spots" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `spot:detail:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const spot = await prisma.studySpot.findUnique({
      where: { id },
      include: {
        openingHours: { orderBy: { dayOfWeek: "asc" } },
        nlbBranch: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rating: true,
            quietness: true,
            wifiRating: true,
            cleanliness: true,
            comment: true,
            createdAt: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!spot) return res.status(404).json({ error: "Spot not found" });

    await redis.setex(cacheKey, 60, JSON.stringify(spot));
    res.json(spot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch spot" });
  }
});

export default router;