import app from './app.config';
import database from './database.config';
import jwt from './jwt.config';
import swagger from './swagger.config';
import cors from './cors.config';
import cloudinary from './cloudinary.config';
import mail from './mail.config';
import otel from './otel.config';

export default [app, database, jwt, swagger, cors, cloudinary, mail, otel];
