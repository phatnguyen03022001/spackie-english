import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: 'brevo',
  apiKey: process.env.BREVO_API_KEY,
  from: process.env.EMAIL_FROM,
  fromName: process.env.EMAIL_FROM_NAME,
}));
