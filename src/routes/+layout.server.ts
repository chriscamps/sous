import type { LayoutServerLoad } from './$types';
import { readImported } from '../lib/server/store.js';

export const load: LayoutServerLoad = () => {
	return { imported: readImported() };
};
