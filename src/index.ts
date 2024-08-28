import 'reflect-metadata';
import express from 'express';
import cors from 'cors'
import { AppDataSource } from './config/database';
import measureRoutes from './routes/index';
import { errorHandler } from './middlewares/errorHandler';


const app = express();

app.use(cors())

app.use(express.json());

app.use(measureRoutes);


AppDataSource.initialize()
  .then(() => {
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch((error) => console.log(error));
