// main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { createServer } from 'http';
import * as dotenv from 'dotenv';

dotenv.config()

async function bootstrap() {
  const server = express();

  const httpServer = createServer(server);
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  app.init();
  app.enableCors(); // Enable CORS if needed

  // Attach WebSocket server to the HTTP server
  //@ts-ignore
  app.useWebSocketAdapter(httpServer);

  await httpServer.listen(3000);
}

bootstrap();
