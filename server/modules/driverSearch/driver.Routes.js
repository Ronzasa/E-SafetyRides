import express from "express";
import { searchDriver } from "./driverSearch.controller.js";

const router = express.Router();

router.get("/:plateNumber", searchDriver);

export default router;
