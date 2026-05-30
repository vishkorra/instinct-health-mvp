import { createServer } from './app';

const port = Number(process.env.PORT ?? 4177);
const host = process.env.HOST ?? '0.0.0.0';

const app = await createServer();

await app.listen({ port, host });
console.log(`Instinct API running on http://${host}:${port}`);
