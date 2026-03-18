// src/app.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  getHome(): string {
    this.logger.debug('Test thử log DEBUG xem có hiện không?');
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spackie English | API Gateway</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #1c1917; 
            --primary-oklch: oklch(0.705 0.213 47.604);
            --primary-light: oklch(0.85 0.1 47.604);
            --text-main: #fafaf9; 
            --text-dim: #a8a29e;  
            --glass: rgba(255, 255, 255, 0.02);
            --border: rgba(255, 255, 255, 0.08);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            display: flex;
            justify-content: center;
            align-items: center; /* QUAN TRỌNG: Căn giữa theo trục dọc */
            min-height: 100vh;
            overflow-x: hidden;
            overflow-y: auto; /* QUAN TRỌNG: Cho phép cuộn khi màn hình nhỏ */
            position: relative;
            padding: 2rem 0; /* Khoảng cách an toàn cho mobile */
        }

        .glow {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, oklch(0.705 0.213 47.604 / 0.12) 0%, transparent 70%);
            z-index: -1;
            pointer-events: none;
        }
        .top-left { top: -150px; left: -100px; }
        .bottom-right { bottom: -150px; right: -100px; }

        .container {
            width: 100%;
            max-width: 900px;
            padding: 0 1.5rem; /* Padding cho mobile */
            text-align: center;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center; /* Căn giữa các item bên trong container */
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 1rem;
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 99px;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--primary-oklch);
            margin-bottom: 1.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        h1 {
            font-size: clamp(2.2rem, 8vw, 3.5rem); /* Tự co giãn font chữ */
            font-weight: 800;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
            line-height: 1.1;
        }

        .gradient-text {
            background: linear-gradient(to right, var(--primary-oklch), var(--primary-light));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p.hero-desc {
            color: var(--text-dim);
            font-size: clamp(1rem, 4vw, 1.125rem);
            max-width: 650px;
            margin-bottom: 2.5rem;
            line-height: 1.6;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive Grid */
            gap: 1.25rem;
            margin-bottom: 3rem;
            width: 100%;
        }

        .card {
            padding: 1.5rem;
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 1.25rem;
            backdrop-filter: blur(12px);
            transition: all 0.3s ease;
            text-align: left;
        }

        .card:hover {
            border: 1px solid oklch(0.705 0.213 47.604 / 0.3);
            transform: translateY(-4px);
        }

        .card h3 { margin-bottom: 0.5rem; font-size: 1.1rem; color: #e7e5e4; }
        .card p { font-size: 0.875rem; color: #78716c; margin: 0; line-height: 1.5; }

        .btn-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 4rem;
            width: 100%;
        }

        .btn {
            padding: 0.9rem 2rem;
            border-radius: 0.85rem;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-primary {
            background-color: var(--primary-oklch);
            color: #1c1917;
            box-shadow: 0 10px 20px -5px oklch(0.705 0.213 47.604 / 0.3);
        }

        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-main);
        }

        .btn-outline:hover { background: var(--glass); }

        footer {
            margin-top: auto; 
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            width: 100%;
            max-width: 600px; /* Footer không nên quá rộng */
            color: #57534e;
            font-size: 0.875rem;
        }

        footer p { margin-bottom: 0.5rem; }

        footer a {
            color: var(--text-dim);
            text-decoration: none;
            transition: color 0.2s;
            font-weight: 600;
        }

        footer a:hover { color: var(--primary-oklch); }

        /* FIX RESPONSIVE MOBILE */
        @media (max-width: 640px) {
            .container { padding-top: 2rem; }
            .btn-group { flex-direction: column; }
            .btn { width: 100%; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="glow top-left"></div>
    <div class="glow bottom-right"></div>

    <main class="container">
        <div class="badge">🚀 System Online</div>
        
        <h1>Spackie <span class="gradient-text">English</span></h1>
        
        <p class="hero-desc">The backend provides system administration for Spackie. It offers APIs for listening practice, vocabulary learning, and intelligent interactive tests.</p>

        <div class="grid">
            <div class="card">
                <h3>Listening</h3>
                <p>High-quality audio practice content with real-time feedback.</p>
            </div>
            <div class="card">
                <h3>Vocabulary</h3>
                <p>Smart flashcard system powered by spaced repetition.</p>
            </div>
        </div>

        <div class="btn-group">
            <a href="/docs" class="btn btn-primary">Explore API Docs</a>
            <a href="/docs-json" class="btn btn-outline">Explore API Json</a>
            <a href="https://github.com/phatnguyen03022001/spackie-english" target="_blank" class="btn btn-outline">GitHub</a>
        </div>

        <footer>
            <p>© 2026 Spackie Development Team</p>
            <p>Contact: <a href="mailto:phatnguyen03022001@gmail.com">phatnguyen03022001@gmail.com</a></p>
        </footer>
    </main>
</body>
</html>
    `;
  }
}
