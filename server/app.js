import express from 'express';
import cors from 'cors';
import { db } from './config/firebase.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'E-SafetyRides API is running' });
});


// Module routes will be mounted here as they're built, e.g.:
// import searchRoutes from './modules/search/search.route.js';
// app.use('/api/search', searchRoutes);

export default app;