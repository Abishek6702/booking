import { Request, Response } from "express";

import {
  attractionIdParamSchema,
  createAttractionSlotSchema,
  CreateAttractionInput,
  CreateAttractionSlotInput,
  deleteAttractionSlotSchema,
  getAttractionSlotsSchema,
  GetAttractionSlotsQueryInput,
  searchAttractionsSchema,
  updateAttractionSlotSchema,
  UpdateAttractionInput,
  UpdateAttractionSlotInput,
  featuredAttractionsQuerySchema,
  attractionReviewsQuerySchema,
  toggleSlotStatusSchema,
  attractionAvailabilitySchema,
} from "../schemas/attractions.schema";
import * as attractionsService from "../services/attractions.service";
import * as reviewsService from "../services/reviews.service";
import { ApiError, asyncHandler, sendSuccess } from "../utils/error.util";
import { getLogger, serializeError } from "../utils/logger.util";
import * as xlsx from "xlsx";

const attractionsLogger = getLogger("controllers.attractions");

const getUserIdOrThrow = (req: Request): string => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  return req.user.id;
};

/**
 * @section Public Endpoints
 */

export const searchAttractions = asyncHandler(async (req: Request, res: Response) => {
  const query = searchAttractionsSchema.shape.query.parse(req.query);
  const data = await attractionsService.searchAttractions(query);

  sendSuccess(res, "Attractions fetched successfully", data);
});

export const getAttractionDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = attractionIdParamSchema.shape.params.parse(req.params);
  const data = await attractionsService.getAttractionById(id);

  sendSuccess(res, "Attraction details fetched successfully", data);
});

export const getAttractionSlots = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getAttractionSlotsSchema.shape.params.parse(req.params);
  const query = getAttractionSlotsSchema.shape.query.parse(req.query) as GetAttractionSlotsQueryInput;
  const data = await attractionsService.getAttractionSlots(id, query);

  sendSuccess(res, "Attraction slots fetched successfully", data);
});

/**
 * @section Admin Endpoints
 */

export const createAttraction = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const data = await attractionsService.createAttraction(adminId, req.body as CreateAttractionInput);

  sendSuccess(res, "Attraction created successfully", data, 201);
});

export const updateAttraction = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const { id } = attractionIdParamSchema.shape.params.parse(req.params);
  const data = await attractionsService.updateAttraction(adminId, id, req.body as UpdateAttractionInput);

  sendSuccess(res, "Attraction updated successfully", data);
});

export const deleteAttraction = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const { id } = attractionIdParamSchema.shape.params.parse(req.params);
  const data = await attractionsService.deleteAttraction(adminId, id);

  sendSuccess(res, "Attraction deleted successfully", data);
});

export const createAttractionSlot = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const { id } = createAttractionSlotSchema.shape.params.parse(req.params);
  const data = await attractionsService.createAttractionSlot(
    adminId,
    id,
    req.body as CreateAttractionSlotInput,
  );

  sendSuccess(res, "Attraction slot created successfully", data, 201);
});

export const updateAttractionSlot = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const { id, slotId } = updateAttractionSlotSchema.shape.params.parse(req.params);
  const data = await attractionsService.updateAttractionSlot(
    adminId,
    id,
    slotId,
    req.body as UpdateAttractionSlotInput,
  );

  sendSuccess(res, "Attraction slot updated successfully", data);
});

export const deleteAttractionSlot = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);
  const { id, slotId } = deleteAttractionSlotSchema.shape.params.parse(req.params);
  const data = await attractionsService.deleteAttractionSlot(adminId, id, slotId);

  sendSuccess(res, "Attraction slot deleted successfully", data);
});

export const bulkUploadAttractions = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserIdOrThrow(req);

  if (!req.file) {
    throw new ApiError(400, "Please upload an Excel or CSV file");
  }

  let rows: any[] = [];
  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new ApiError(400, "Uploaded file does not contain any worksheets");
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new ApiError(400, "Failed to read the first worksheet from the uploaded file");
    }

    rows = xlsx.utils.sheet_to_json(sheet) as any[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    attractionsLogger.warn(
      { adminId, err: serializeError(error) },
      "Excel/CSV parse failed",
    );
    throw new ApiError(400, "Failed to parse the Excel/CSV file. Ensure the format is correct.");
  }

  attractionsLogger.debug({ adminId, rowCount: rows.length }, "Bulk upload parsed");

  const attractions: CreateAttractionInput[] = rows.map((row, index) => {
    const getVal = (row: any, keys: string[]) => {
      const foundKey = Object.keys(row).find(k => 
        keys.some(key => k.trim().toLowerCase() === key.toLowerCase())
      );
      return foundKey ? row[foundKey] : undefined;
    };

    const rawPrice = getVal(row, ["price", "cost", "rate", "entry_fee", "fee"]);
    let price = 0;
    if (rawPrice !== undefined) {
      price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ""));
    }

    return {
      title: String(getVal(row, ["title", "name", "attraction title"]) || "").trim(),
      description: String(getVal(row, ["description", "desc", "about"]) || "").trim(),
      type: String(getVal(row, ["type", "category", "class"]) || "General").trim(),
      price: isNaN(price) ? 0 : price,
      images: getVal(row, ["images", "photos", "image", "image_url", "img"]) 
        ? String(getVal(row, ["images", "photos", "image", "image_url", "img"])).split(",").map(i => i.trim()).filter(i => i)
        : [],
      location: {
        city: String(getVal(row, ["city", "town", "district"]) || "").trim(),
        country: String(getVal(row, ["country", "nation"]) || "").trim(),
        address: String(getVal(row, ["address", "location", "state", "province"]) || "").trim(),
        lat: Number(getVal(row, ["lat", "latitude"]) || 0),
        lng: Number(getVal(row, ["lng", "longitude"]) || 0),
      },
    };
  });

  const validAttractions = attractions.filter(a => a.title && a.description && a.price >= 0);

  if (validAttractions.length === 0) {
    throw new ApiError(400, "No valid attractions found. Ensure 'name', 'description', and 'entry_fee' columns are present and filled.");
  }

  // Let service errors propagate to the central errorHandler.
  // ApiErrors (400/404/409 etc.) keep their semantic status code; anything
  // else surfaces as a generic 500 without leaking internal messages.
  const data = await attractionsService.bulkCreateAttractions(adminId, validAttractions);
  sendSuccess(res, `Successfully uploaded ${data.length} attractions`, data, 201);
});

export const getFeaturedAttractions = asyncHandler(async (req: Request, res: Response) => {
  const query = featuredAttractionsQuerySchema.shape.query.parse(req.query);
  const data = await attractionsService.getFeaturedAttractions(query.limit);

  sendSuccess(res, "Featured attractions fetched successfully", data);
});

export const getAttractionReviews = asyncHandler(async (req: Request, res: Response) => {
  const { id } = attractionReviewsQuerySchema.shape.params.parse(req.params);
  const query = attractionReviewsQuerySchema.shape.query.parse(req.query);
  
  const data = await reviewsService.getReviewsByItem({
    itemId: id,
    itemType: "attraction",
    page: query.page,
    limit: query.limit,
  });

  sendSuccess(res, "Attraction reviews fetched successfully", data);
});

export const getAttractionAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = attractionIdParamSchema.shape.params.parse(req.params);
  const query = attractionAvailabilitySchema.shape.query.parse(req.query);

  const checkIn = new Date(String(query.checkIn));
  const checkOut = new Date(String(query.checkOut));

  const data = await attractionsService.getAttractionAvailability(id, checkIn, checkOut);

  sendSuccess(res, "Attraction availability fetched successfully", data);
});

export const toggleSlotStatus = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = getUserIdOrThrow(req);
  const { id, slotId } = toggleSlotStatusSchema.shape.params.parse(req.params);
  const data = await attractionsService.toggleSlotStatus(ownerId, id, slotId);

  sendSuccess(res, "Attraction slot status toggled successfully", data);
});

