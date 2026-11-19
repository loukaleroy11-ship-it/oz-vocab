// Fonction Netlify : servie à l'adresse /api/lookup
import { handleLookup } from '../../server/lookupHandler';

export default async (request: Request): Promise<Response> => handleLookup(request);

export const config = { path: '/api/lookup' };
