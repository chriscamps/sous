import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { Recipe } from '../recipes.js';

const FILE = resolve(process.cwd(), 'data/imported-recipes.json');
const DIR = resolve(process.cwd(), 'data');

export function readImported(): Recipe[] {
	try {
		return JSON.parse(readFileSync(FILE, 'utf8'));
	} catch { return []; }
}

export function writeImported(recipes: Recipe[]): void {
	mkdirSync(DIR, { recursive: true });
	writeFileSync(FILE, JSON.stringify(recipes, null, 2));
}

export function upsertImported(recipe: Recipe): Recipe[] {
	const existing = readImported();
	const updated = [...existing.filter(r => r.id !== recipe.id), recipe];
	writeImported(updated);
	return updated;
}
