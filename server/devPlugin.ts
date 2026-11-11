import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Connect, Plugin } from 'vite';
import { handleContent, handleMedia, handleSession } from './handlers.js';

/** Serves the same /api handlers inside `vite dev` and `vite preview`. */
export function apiDevPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/')) return next();
    void route(req, res).catch((err: unknown) => {
      console.error(err);
      res.statusCode = 500;
      res.end('error');
    });
  };
  return {
    name: 'birthday-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const request = toRequest(req);
  const path = new URL(request.url).pathname;
  let response: Response;
  if (path === '/api/session') response = await handleSession(request);
  else if (path === '/api/content') response = await handleContent(request);
  else if (path.startsWith('/api/media/'))
    response = await handleMedia(request, decodeURIComponent(path.slice(11)));
  else response = new Response('{"error":"not_found"}', { status: 404 });

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key === 'set-cookie') return;
    res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  if (!response.body) return res.end();
  Readable.fromWeb(response.body as import('node:stream/web').ReadableStream).pipe(res);
}

function toRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? 'localhost';
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  if (!headers.has('x-forwarded-for'))
    headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'local');
  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(`http://${host}${req.url}`, {
    method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
    // @ts-expect-error Node's fetch requires duplex for streamed bodies
    duplex: hasBody ? 'half' : undefined,
  });
}
