import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHome(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spackie English</title>
<style>
body{
  font-family:system-ui,Arial;
  margin:0;
  background:#0f172a;
  color:white;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
}
.container{text-align:center;max-width:600px}
h1{font-size:42px;margin-bottom:12px}
p{color:#cbd5f5;margin-bottom:24px}
a{
  padding:12px 20px;
  background:#2563eb;
  color:white;
  border-radius:8px;
  text-decoration:none;
  font-weight:600
}
</style>
</head>
<body>
<div class="container">
<h1>Spackie English</h1>
<p>Learn English with listening practice, vocabulary training and interactive tests.</p>
<a href="/docs">API Docs</a>
</div>
</body>
</html>
`;
  }
}
