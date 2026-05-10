// src/config/tts.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('tts', () => ({
  enabled: process.env.TTS_ENABLED === 'true',
  provider: process.env.TTS_PROVIDER || 'google',
  google: {
    apiKey: process.env.GOOGLE_TTS_API_KEY,
    language: process.env.GOOGLE_TTS_LANGUAGE || 'en-US',
    voice: process.env.GOOGLE_TTS_VOICE || 'en-US-Standard-B',
    speed: parseFloat(process.env.GOOGLE_TTS_SPEED || '1.0'),
    timeout: parseInt(process.env.GOOGLE_TTS_TIMEOUT || '15000', 10),
  },
}));
