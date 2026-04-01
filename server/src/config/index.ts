import app from './app.config';
import cloudinary from './cloudinary.config';
import cors from './cors.config';
import database from './database.config';
import logger from './logger.config';
import jwt from './jwt.config';
import mail from './mail.config';
import otel from './otel.config';
import swagger from './swagger.config';
import upstash from './upstash.config';

export default [
  app,
  cloudinary,
  cors,
  database,
  logger,
  jwt,
  mail,
  otel,
  swagger,
  upstash,
];
