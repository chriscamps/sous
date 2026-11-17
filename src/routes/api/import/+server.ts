import { json, error } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { RequestHandler } from './$types';
import { upsertImported } from '../../../lib/server/store.js';

function getApiKey(): string {
	// Try process.env first (production / injected env)
	if (process.env.ANTHROPIC_API_KEY?.startsWith('sk-')) return process.env.ANTHROPIC_API_KEY.trim();
	// Fall back to reading .env directly (local dev)
	try {
		const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
		return content.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim() ?? '';
	} catch { return ''; }
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { url, text: pastedText } = body as { url?: string; text?: string };

	if (!url && !pastedText) throw error(400, 'url or text required');

	let recipeText: string;

	if (pastedText) {
		// Use pasted text directly
		recipeText = pastedText.trim();
	} else {
		// Fetch the URL
		let html: string;
		try {
			const res = await fetch(url!, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept': 'text/html,application/xhtml+xml',
					'Accept-Language': 'en-GB,en;q=0.9'
				}
			});
			if (!res.ok) throw error(422, `Could not fetch page: HTTP ${res.status}`);
			html = await res.text();
		} catch (e: unknown) {
			if (e && typeof e === 'object' && 'status' in e) throw e;
			throw error(422, `Could not fetch page: ${e}`);
		}

		// Extract Recipe JSON-LD
		const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
			.map(m => { try { return JSON.parse(m[1]); } catch { return null; } })
			.filter(Boolean);

		function findRecipe(obj: unknown): Record<string, unknown> | null {
			if (!obj) return null;
			if (Array.isArray(obj)) {
				for (const item of obj) { const r = findRecipe(item); if (r) return r; }
				return null;
			}
			if (typeof obj === 'object' && obj !== null) {
				const o = obj as Record<string, unknown>;
				if (o['@type'] === 'Recipe') return o;
				if (o['@graph']) return findRecipe(o['@graph']);
			}
			return null;
		}

		const recipe = findRecipe(jsonLdBlocks);
		if (!recipe) throw error(422, 'No recipe data found on this page. Try pasting the recipe text instead.');

		const servings = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
		const instructions = (recipe.recipeInstructions as unknown[] ?? [])
			.map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : (s as Record<string, string>).text}`)
			.join('\n');

		recipeText = [
			`Name: ${recipe.name}`,
			`Description: ${recipe.description ?? ''}`,
			`Servings: ${servings}`,
			`Prep: ${recipe.prepTime ?? ''}  Cook: ${recipe.cookTime ?? ''}`,
			`\nIngredients:\n${(recipe.recipeIngredient as string[] ?? []).map(i => `- ${i}`).join('\n')}`,
			`\nInstructions:\n${instructions}`,
		].join('\n');
	}

	// Call Claude
	const prompt = `Convert this recipe into a structured JSON object matching this TypeScript interface:

interface Ingredient {
  id: string;           // kebab-case unique id, e.g. "spaghetti"
  name: string;         // ingredient name only, no quantity
  qty: string;          // quantity and unit, e.g. "200g", "2 tbsp", "1 large"
  essential: boolean;   // false for garnishes, optional extras
  substitute?: string;  // one plain-English substitution if commonly swapped
}

interface StepRef {
  ingredientId: string; // matches an ingredient's id field
  name: string;         // ingredient display name
  qty: string;          // quantity used in this step specifically
}

interface Step {
  id: string;           // kebab-case unique id, e.g. "boil-pasta"
  goal?: string;        // 3-6 word headline for what this step achieves
  instructions?: string[]; // 1-3 clear action sentences; use {ingredientId} tokens inline where ingredients are added, e.g. "Add the {pancetta} and stir until golden."
  note?: string;        // optional tip or context
  action?: 'prep' | 'mix' | 'cook' | 'add' | 'boil' | 'rest' | 'serve';
  timer?: number;       // seconds, only if the step has a specific wait time
  refs?: StepRef[];     // all ingredients used in this step — one entry per {ingredientId} token used
  essential?: boolean;  // false for finishing/garnish/optional plating steps; omit or true for all core cooking steps
}

interface Recipe {
  id: string;           // kebab-case from the title
  title: string;
  subtitle: string;     // one-sentence description, plain and factual
  serves: number;
  totalMins: number;    // prep + cook combined
  difficulty: 'easy' | 'medium' | 'involved';
  tags: string[];
  ingredients: Ingredient[];
  steps: {
    standard: Step[];
  };
}

Rules:
- Each step should represent ONE clear action
- Keep instructions concise and direct — no flowery language
- goal should be short: "Boil the pasta", "Make the sauce"
- Set timer only when there is an explicit time (e.g. "cook for 10 minutes" → 600)
- action should reflect the dominant action in the step
- Ingredient id should be the base ingredient only, e.g. "parmesan" not "grated-parmesan"
- Mark ingredient essential: false only for genuine optionals (garnishes, "to taste" extras)
- Mark step essential: false only for finishing touches — plating, garnishing, optional resting. Core cooking, prep, sauce, and assembly steps are always essential: true (or omit the field)
- For refs: include every ingredient actively used in a step; the qty in refs is the amount used in THAT step specifically
- For {ingredientId} tokens: use them when naming an ingredient in an instruction sentence, e.g. "Cook the {pancetta} until crisp" — not every mention, just where an ingredient is introduced or first used in that step
- Every {ingredientId} used in instructions MUST have a matching entry in refs
- Return ONLY the raw JSON object — no markdown code fences, no explanation

Recipe to convert:
${recipeText}`;

	const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': getApiKey(),
			'anthropic-version': '2023-06-01',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			model: 'claude-haiku-4-5',
			max_tokens: 4096,
			messages: [{ role: 'user', content: prompt }]
		})
	});

	if (!claudeRes.ok) {
		const err = await claudeRes.text();
		throw error(500, `Claude API error: ${err}`);
	}

	const claudeData = await claudeRes.json() as { content: { text: string }[] };
	let output = claudeData.content[0].text.trim();

	// Strip markdown fences if present
	output = output.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(output);
	} catch {
		throw error(500, 'Claude returned invalid JSON. Try again.');
	}

	// Wrap flat ingredients array into level structure so existing UI works
	if (Array.isArray(parsed.ingredients)) {
		parsed.ingredients = {
			simple: parsed.ingredients,
			standard: parsed.ingredients,
			premium: parsed.ingredients
		};
	}

	// Persist to server-side file store
	upsertImported(parsed as unknown as import('../../../lib/recipes.js').Recipe);

	return json({ recipe: parsed });
};
