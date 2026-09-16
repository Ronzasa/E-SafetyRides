import express from 'express';
import cors from 'cors';
import reportsRoutes from './modules/reports/reports.route.js';
import { db } from './config/firebase.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'E-SafetyRides API is running' });
});

app.use('/api/reports', reportsRoutes);

export default app;