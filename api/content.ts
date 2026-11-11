import { handleContent } from '../server/handlers.js';

export const GET = (req: Request) => handleContent(req);
