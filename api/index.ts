import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../src/index.js';

export default async function (req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
