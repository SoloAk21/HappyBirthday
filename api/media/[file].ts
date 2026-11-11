import { handleMedia } from '../../server/handlers.js';

function fileFrom(req: Request): string {
  const last = new URL(req.url).pathname.split('/').pop() ?? '';
  try {
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

export const GET = (req: Request) => handleMedia(req, fileFrom(req));
export const HEAD = (req: Request) => handleMedia(req, fileFrom(req));
