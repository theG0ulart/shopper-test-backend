import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Server ON!!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
