import express from "express";
import {
  searchDriver,
  verifyDriver,
  checkIdentity,
  searchDriverByNameHandler,
} from "./driverController.js";

const router = express.Router();

router.get("/search/by-name", searchDriverByNameHandler);
router.get("/:plateNumber", searchDriver);
router.post("/verify", verifyDriver);
router.post("/check-identity", checkIdentity);

export default router;
