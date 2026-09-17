import express from "express";
import { searchDriver } from "./driverController.js";

const router = express.Router();

router.get("/:plateNumber", searchDriver);

export default router;
