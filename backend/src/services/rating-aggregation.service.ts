import { ItemType, Prisma } from "@prisma/client";

const toRoundedAverage = (rawAverage: number | null, totalReviews: number): Prisma.Decimal => {
  if (!rawAverage || totalReviews === 0) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(rawAverage).toDecimalPlaces(2);
};

const getRatingSnapshot = async (
  db: Prisma.TransactionClient,
  itemType: ItemType,
  itemId: string,
): Promise<{ avgRating: Prisma.Decimal; totalReviews: number }> => {
  const aggregates = await db.review.aggregate({
    where: {
      itemType,
      itemId,
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
    },
  });

  const totalReviews = aggregates._count._all;

  return {
    avgRating: toRoundedAverage(aggregates._avg.rating, totalReviews),
    totalReviews,
  };
};

export const recalculateListingRating = async (
  db: Prisma.TransactionClient,
  itemType: ItemType,
  itemId: string,
): Promise<void> => {
  if (itemType === ItemType.STAY) {
    const stays = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Stay"
      WHERE "id" = ${itemId}
      FOR UPDATE
    `;

    if (stays.length === 0) {
      return;
    }

    const nextRating = await getRatingSnapshot(db, itemType, itemId);

    await db.stay.update({
      where: { id: itemId },
      data: {
        avgRating: nextRating.avgRating,
        totalReviews: nextRating.totalReviews,
      },
    });

    return;
  }

  if (itemType === ItemType.VEHICLE) {
    const vehicles = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Vehicle"
      WHERE "id" = ${itemId}
      FOR UPDATE
    `;

    if (vehicles.length === 0) {
      return;
    }

    const nextRating = await getRatingSnapshot(db, itemType, itemId);

    await db.vehicle.update({
      where: { id: itemId },
      data: {
        avgRating: nextRating.avgRating,
        totalReviews: nextRating.totalReviews,
      },
    });

    return;
  }
};
