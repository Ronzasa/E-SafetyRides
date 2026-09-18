import express from "express";
import cors from "cors";
import { db } from "./config/firebase.js";
import authRoutes from "./modules/auth/auth.route.js";
import reportsRoutes from "./modules/reports/reports.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import driverSearchRoutes from "./modules/driverSearch/driverRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "E-SafetyRides API is running" });
});

app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/driver-search", driverSearchRoutes);

export default app;
