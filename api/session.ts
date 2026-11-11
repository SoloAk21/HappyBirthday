import { handleSession } from '../server/handlers.js';

export const GET = (req: Request) => handleSession(req);
export const POST = (req: Request) => handleSession(req);
export const DELETE = (req: Request) => handleSession(req);
