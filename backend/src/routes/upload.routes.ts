import { Router } from "express";

import * as uploadController from "../controllers/upload.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", uploadController.uploadSingle);
router.post("/multiple", uploadController.uploadMultiple);

export default router;
