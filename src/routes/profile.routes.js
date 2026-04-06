import { Router } from "express";
import authenticate from "../middlewares/auth.middleware.js";
import { getMyProfile, updateMyProfile, changePassword } from "../controllers/profile.controller.js";

const router = Router();
router.use(authenticate);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.put("/change-password", changePassword);

export default router;
