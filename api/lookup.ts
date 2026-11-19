// Fonction serverless Vercel : /api/lookup
import { handleLookup } from '../server/lookupHandler';

export async function GET(request: Request): Promise<Response> {
  return handleLookup(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleLookup(request);
}
