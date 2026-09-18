import http from 'node:http';
import { readFile } from 'node:fs/promises';
const port=Number(process.env.PORT || 4173);
const host=process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/physics.js':'physics.js','/style.css':'style.css'};
http.createServer(async (req,res) => {
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);return res.end('Not found');}
  try { const body=await readFile(new URL(file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body); }
  catch {res.writeHead(500);res.end('Unable to load app');}
}).listen(port,host,()=>console.log(`Intake Arcade: http://${host}:${port}`));
