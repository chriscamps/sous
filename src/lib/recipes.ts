export interface StepRef {
	name: string;
	qty: string;
	ingredientId?: string;
	inline?: string; // text to show when {ingredientId} token appears in instructions
}

export interface StepAdaptation {
	whenMissing?: string[];  // fires when any of these ingredientIds are in missing (sub may exist)
	whenGap?: string[];      // fires when any of these ingredientIds are missing AND have no substitute
	removeRefs?: string[];   // ingredientIds to omit from this step
	adjustRefs?: Record<string, string>;  // ingredientId → new qty string
	overrideInstructions?: Record<number, string>;  // instruction index → replacement text
}

export interface Step {
	id: string;
	text?: string; // fallback for simple steps (supports {ingredientId} tokens)
	goal?: string; // headline: what this step achieves
	instructions?: string[]; // bullet points (each supports {ingredientId} tokens)
	note?: string; // tip or additional context
	action?: 'prep' | 'mix' | 'cook' | 'add' | 'boil' | 'rest' | 'serve';
	timer?: number; // seconds
	dirtyHands?: boolean;
	essential?: boolean; // false = skip in essentials-only mode (default: true)
	refs?: StepRef[];
	adaptations?: StepAdaptation[];
}

export interface LevelSteps {
	simple: Step[];
	standard: Step[];
	premium: Step[];
}

export interface LevelTimes {
	simple: number;
	standard: number;
	premium: number;
}

export interface Level {
	id: 'simple' | 'standard' | 'premium';
	label: string;
	blurb: string;
	adds: string[];
}

export interface Ingredient {
	id: string;
	name: string;
	qty: string;
	note?: string;
	essential: boolean;
	substitute?: string;
}

export interface LevelIngredients {
	simple: Ingredient[];
	standard: Ingredient[];
	premium: Ingredient[];
}

export interface Recipe {
	id: string;
	title: string;
	subtitle: string;
	serves: number;
	activeMins: number;
	tags: string[];
	difficulty: 'easy' | 'medium' | 'involved';
	levelTimes?: LevelTimes;
	totalMins?: number;
	levels?: Level[];
	ingredients?: LevelIngredients;
	steps?: LevelSteps;
}

export const RECIPES: Recipe[] = [
	{
		id: 'spaghetti-meatballs',
		title: 'Spaghetti & Meatballs',
		subtitle: 'Pork and beef meatballs in a slow-cooked tomato sauce',
		serves: 4,
		activeMins: 40,
		tags: ['pasta', 'italian', 'comfort'],
		difficulty: 'medium',
		levelTimes: { simple: 45, standard: 90, premium: 135 },
		levels: [
			{
				id: 'simple',
				label: 'Simple',
				blurb: 'Store-bought meatballs, jarred sauce. Dinner on the table fast.',
				adds: []
			},
			{
				id: 'standard',
				label: 'Standard',
				blurb: 'Homemade meatballs, sauce from scratch. The real thing.',
				adds: ['Hand-rolled meatballs', 'Fresh tomato sauce']
			},
			{
				id: 'premium',
				label: 'Premium',
				blurb: 'Long-simmered sauce, fresh pasta, proper technique.',
				adds: ['Fresh pasta', 'Extended sauce simmer', 'Toasted breadcrumbs']
			}
		],
		ingredients: {
			simple: [
				{ id: 'meatballs-frozen', name: 'Frozen meatballs', qty: '500g', essential: true, substitute: 'Fresh meatballs from a butcher' },
				{ id: 'sauce-jar', name: 'Jarred tomato sauce', qty: '1 jar (680g)', essential: true, substitute: '2 tins chopped tomatoes + 1 tsp dried oregano' },
				{ id: 'spaghetti', name: 'Dried spaghetti', qty: '400g', essential: true },
				{ id: 'parmesan', name: 'Parmesan', qty: 'To serve', essential: false, substitute: 'Pecorino or any hard Italian cheese' },
				{ id: 'olive-oil', name: 'Olive oil', qty: '2 tbsp', essential: false, substitute: 'Any neutral oil' },
			],
			standard: [
				{ id: 'pork-mince', name: 'Pork mince', qty: '250g', essential: true, substitute: 'All beef, or a mix with veal' },
				{ id: 'beef-mince', name: 'Beef mince', qty: '250g', essential: true, substitute: 'All pork' },
				{ id: 'breadcrumbs', name: 'Fresh breadcrumbs', qty: '50g', essential: true, substitute: 'Dried breadcrumbs (use half the quantity)' },
				{ id: 'egg', name: 'Egg', qty: '1', essential: true },
				{ id: 'garlic', name: 'Garlic', qty: '4 cloves', essential: true, substitute: '½ tsp garlic powder' },
				{ id: 'canned-tomatoes', name: 'Canned whole tomatoes', qty: '2 × 400g tins', essential: true, substitute: '800g fresh plum tomatoes, blanched and peeled' },
				{ id: 'tomato-paste', name: 'Tomato paste', qty: '2 tbsp', essential: true },
				{ id: 'onion', name: 'Onion', qty: '1 large', essential: true },
				{ id: 'spaghetti', name: 'Dried spaghetti', qty: '400g', essential: true },
				{ id: 'parmesan', name: 'Parmesan', qty: 'To serve', essential: false, substitute: 'Pecorino' },
				{ id: 'olive-oil', name: 'Olive oil', qty: '3 tbsp', essential: true },
				{ id: 'fresh-basil', name: 'Fresh basil', qty: 'Small bunch', essential: false, substitute: 'Dried basil (1 tsp, added earlier)' },
			],
			premium: [
				{ id: 'pork-mince', name: 'Pork mince', qty: '250g', essential: true, substitute: 'All beef' },
				{ id: 'beef-mince', name: 'Beef mince', qty: '250g', essential: true },
				{ id: 'breadcrumbs', name: 'Fresh breadcrumbs', qty: '50g', essential: true },
				{ id: 'egg', name: 'Egg', qty: '3 (1 for meatballs, 2 for pasta)', essential: true },
				{ id: 'pasta-flour', name: 'Tipo 00 flour', qty: '200g', essential: true, substitute: 'Plain flour (pasta will be slightly less silky)' },
				{ id: 'garlic', name: 'Garlic', qty: '6 cloves', essential: true },
				{ id: 'canned-tomatoes', name: 'Canned whole tomatoes', qty: '2 × 400g tins', essential: true },
				{ id: 'tomato-paste', name: 'Tomato paste', qty: '3 tbsp', essential: true },
				{ id: 'onion', name: 'Onion', qty: '1 large', essential: true },
				{ id: 'white-wine', name: 'Dry white wine', qty: '100ml', essential: false, substitute: 'Extra stock or just omit' },
				{ id: 'parmesan-rind', name: 'Parmesan rind', qty: '1 piece', essential: false, note: 'Adds depth to the sauce — worth it if you have one' },
				{ id: 'parmesan', name: 'Parmesan', qty: 'To serve', essential: false },
				{ id: 'olive-oil', name: 'Extra virgin olive oil', qty: '4 tbsp', essential: true },
				{ id: 'fresh-basil', name: 'Fresh basil', qty: 'Large bunch', essential: true, substitute: 'Half quantity dried basil' },
				{ id: 'toasted-breadcrumbs', name: 'Stale bread (for breadcrumbs)', qty: '2 slices', essential: false, note: 'Toast, blitz and fry in olive oil — the finishing touch' },
			]
		},
		steps: {
			simple: [
				{ id: 's-1', action: 'prep', text: 'Get out a wide pan and a large pot for the pasta water.' },
				{ id: 's-2', action: 'cook', text: 'Heat 2 tbsp olive oil in the pan over medium heat.', refs: [{ name: 'Olive oil', qty: '2 tbsp', ingredientId: 'olive-oil' }] },
				{ id: 's-3', action: 'cook', text: 'Add the frozen meatballs. Cook for 8–10 minutes, turning occasionally, until browned all over.', timer: 600, refs: [{ name: 'Frozen meatballs', qty: '500g', ingredientId: 'meatballs-frozen' }] },
				{ id: 's-4', action: 'add', text: 'Pour in the jarred tomato sauce. Stir to coat the meatballs.', refs: [{ name: 'Jarred tomato sauce', qty: '1 jar (680g)', ingredientId: 'sauce-jar' }] },
				{ id: 's-5', action: 'rest', text: 'Bring to a simmer, then reduce heat to low. Cook for 10 minutes while you sort the pasta.', timer: 600 },
				{ id: 's-6', action: 'boil', text: 'Fill the large pot with water and bring to a boil. Add a generous pinch of salt.' },
				{ id: 's-7', action: 'cook', text: 'Add the spaghetti and cook for 1 minute less than the packet says.', timer: 480, refs: [{ name: 'Dried spaghetti', qty: '400g', ingredientId: 'spaghetti' }] },
				{ id: 's-8', action: 'prep', text: 'Scoop out a mug of pasta water before you drain. Drain the pasta.' },
				{ id: 's-9', action: 'add', text: 'Add the pasta to the sauce and toss to combine. Add a splash of pasta water if it looks dry.' },
				{ id: 's-10', action: 'serve', text: 'Serve immediately. Finish with grated parmesan.', refs: [{ name: 'Parmesan', qty: 'To serve', ingredientId: 'parmesan' }] },
			],
			standard: [
				{
					id: 'p-1', action: 'prep',
					goal: 'Make the breadcrumbs',
					instructions: [
						'Tear stale bread into chunks',
						'Blitz in a food processor, or grate on a box grater',
						'You need {breadcrumbs} total — set aside in a small bowl',
					],
					refs: [{ name: 'Fresh breadcrumbs', qty: '50g', ingredientId: 'breadcrumbs', inline: '50g' }]
				},
				{
					id: 'p-2', action: 'prep',
					instructions: ['Peel and finely chop {onion}'],
					refs: [{ name: 'Onion', qty: '1 large', ingredientId: 'onion', inline: '1 large onion' }]
				},
				{
					id: 'p-3', action: 'prep',
					goal: 'Prep the garlic',
					instructions: [
						'Peel and mince all {garlic}',
						'Divide in half — one for the meatballs, one for the sauce',
					],
					refs: [{ name: 'Garlic', qty: '4 cloves', ingredientId: 'garlic', inline: '4 cloves of garlic' }]
				},
				{
					id: 'p-4', action: 'mix', dirtyHands: true,
					goal: 'Make the meatball mix',
					instructions: [
						'Put {pork-mince} and {beef-mince} into a large bowl',
						'Add {breadcrumbs}, {egg}, and the meatball half of {garlic}',
						'Season well with salt and pepper',
					],
					refs: [
						{ name: 'Pork mince', qty: '250g', ingredientId: 'pork-mince', inline: '250g pork mince' },
						{ name: 'Beef mince', qty: '250g', ingredientId: 'beef-mince', inline: '250g beef mince' },
						{ name: 'Breadcrumbs', qty: '50g', ingredientId: 'breadcrumbs', inline: '50g breadcrumbs' },
						{ name: 'Egg', qty: '1', ingredientId: 'egg', inline: '1 egg' },
						{ name: 'Garlic', qty: '2 cloves', ingredientId: 'garlic', inline: '2 cloves of garlic' },
					],
					adaptations: [
						// Using pork mince only — double the quantity, rewrite first bullet
						{
							whenMissing: ['beef-mince'],
							removeRefs: ['beef-mince'],
							adjustRefs: { 'pork-mince': '500g' },
							overrideInstructions: { 0: 'Put {pork-mince} into a large bowl' },
						},
						// No breadcrumbs and no sub — rewrite second bullet without it
						{
							whenGap: ['breadcrumbs'],
							removeRefs: ['breadcrumbs'],
							overrideInstructions: { 1: 'Add {egg} and the meatball half of {garlic}' },
						},
					],
				},
				{
					id: 'p-5', action: 'mix', dirtyHands: true,
					instructions: ['Mix with your hands until just combined'],
					note: 'Don\'t overwork it — the meatballs will be tough if you do',
				},
				{
					id: 'p-6', action: 'prep', dirtyHands: true,
					instructions: ['Roll into golf-ball-sized balls (aim for 12–14) and set aside on a plate'],
				},
				{
					id: 'p-7', action: 'cook',
					instructions: ['Heat {olive-oil} in a wide pan or Dutch oven over medium heat'],
					refs: [{ name: 'Olive oil', qty: '2 tbsp', ingredientId: 'olive-oil', inline: '2 tbsp of olive oil' }]
				},
				{
					id: 'p-8', action: 'cook', timer: 540,
					instructions: ['Add {onion} and cook for 8–10 minutes, stirring occasionally, until soft and golden'],
					refs: [{ name: 'Onion', qty: '1 large', ingredientId: 'onion', inline: '1 large onion' }]
				},
				{
					id: 'p-9', action: 'add', timer: 60,
					instructions: ['Add {garlic} and cook for 1 minute until fragrant'],
					refs: [{ name: 'Garlic', qty: '2 cloves', ingredientId: 'garlic', inline: '2 cloves of garlic' }]
				},
				{
					id: 'p-10', action: 'add', timer: 120,
					instructions: ['Add {tomato-paste}, stir and cook for 2 minutes to deepen the flavour'],
					refs: [{ name: 'Tomato paste', qty: '2 tbsp', ingredientId: 'tomato-paste', inline: '2 tbsp of tomato paste' }]
				},
				{
					id: 'p-11', action: 'add',
					goal: 'Build the sauce',
					instructions: [
						'Add {canned-tomatoes} and crush them against the pan with a spoon',
						'Season well with salt',
					],
					refs: [{ name: 'Canned tomatoes', qty: '2 × 400g tins', ingredientId: 'canned-tomatoes', inline: '2 × 400g tins of canned tomatoes' }]
				},
				{
					id: 'p-12', action: 'rest', timer: 1200,
					instructions: ['Bring to a simmer, then reduce to low heat'],
					note: 'Leave to cook for 20 minutes, stirring occasionally',
				},
				{
					id: 'p-13', action: 'cook',
					instructions: ['While the sauce simmers, heat {olive-oil} in a separate frying pan over medium-high heat'],
					refs: [{ name: 'Olive oil', qty: '1 tbsp', ingredientId: 'olive-oil', inline: '1 tbsp of olive oil' }]
				},
				{
					id: 'p-14', action: 'cook', timer: 420,
					goal: 'Brown the meatballs',
					instructions: [
						'Add the meatballs in a single layer — don\'t crowd them',
						'Brown on all sides, about 6–8 minutes total',
					],
					note: 'Leave them alone until they release naturally from the pan',
				},
				{
					id: 'p-15', action: 'add', timer: 750,
					instructions: ['Transfer the browned meatballs into the sauce and simmer together for 10–15 minutes'],
				},
				{
					id: 'p-16', action: 'boil',
					instructions: ['Bring a large pot of water to the boil and salt it generously — use more than you think'],
				},
				{
					id: 'p-17', action: 'cook', timer: 480,
					instructions: ['Add {spaghetti} and cook for 1 minute less than the packet says'],
					refs: [{ name: 'Dried spaghetti', qty: '400g', ingredientId: 'spaghetti', inline: '400g of spaghetti' }]
				},
				{
					id: 'p-18', action: 'prep',
					instructions: ['Scoop out a full mug of pasta water before draining'],
				},
				{
					id: 'p-19', action: 'add',
					goal: 'Combine pasta and sauce',
					instructions: [
						'Drain the pasta and add it straight into the sauce',
						'Toss well, adding pasta water a splash at a time',
						'Stop when the sauce coats the pasta',
					],
				},
				{
					id: 'p-20', action: 'serve',
					goal: 'Serve',
					instructions: [
						'Plate and serve immediately',
						'Top with {parmesan} and a few torn leaves of {fresh-basil}',
					],
					refs: [
						{ name: 'Parmesan', qty: 'To serve', ingredientId: 'parmesan', inline: 'grated parmesan' },
						{ name: 'Fresh basil', qty: 'Small bunch', ingredientId: 'fresh-basil', inline: 'fresh basil' },
					]
				},
			],
			premium: [
				{ id: 'pr-1', action: 'prep', text: 'Start the sauce first — it needs the most time. Peel and finely chop the onion.', refs: [{ name: 'Onion', qty: '1 large', ingredientId: 'onion' }] },
				{ id: 'pr-2', action: 'prep', text: 'Peel and mince all 6 cloves of garlic. Keep two-thirds for the sauce.', refs: [{ name: 'Garlic', qty: '6 cloves', ingredientId: 'garlic' }] },
				{ id: 'pr-3', action: 'cook', text: 'Heat 2 tbsp extra virgin olive oil in a Dutch oven or heavy pan over medium-low heat.', refs: [{ name: 'Extra virgin olive oil', qty: '2 tbsp', ingredientId: 'olive-oil' }] },
				{ id: 'pr-4', action: 'cook', text: 'Add the onion. Cook on low for 15 minutes until very soft and just starting to caramelise.', timer: 900 },
				{ id: 'pr-5', action: 'add', text: 'Add the sauce garlic. Cook for 2 minutes.', timer: 120 },
				{ id: 'pr-6', action: 'add', text: 'Add the tomato paste. Stir and cook for 3 minutes until it darkens slightly.', timer: 180, refs: [{ name: 'Tomato paste', qty: '3 tbsp', ingredientId: 'tomato-paste' }] },
				{ id: 'pr-7', action: 'add', essential: false, text: 'Pour in the white wine. Let it bubble and reduce for 2 minutes.', timer: 120, refs: [{ name: 'Dry white wine', qty: '100ml', ingredientId: 'white-wine' }] },
				{ id: 'pr-8', action: 'add', text: 'Add the canned tomatoes and parmesan rind if using. Crush the tomatoes. Season well.', refs: [{ name: 'Canned tomatoes', qty: '2 × 400g tins', ingredientId: 'canned-tomatoes' }, { name: 'Parmesan rind', qty: '1 piece', ingredientId: 'parmesan-rind' }] },
				{ id: 'pr-9', action: 'rest', text: 'Bring to a simmer then reduce to the lowest heat. Cook uncovered for 45 minutes, stirring every 10.', timer: 2700 },
				{ id: 'pr-10', action: 'prep', text: 'While the sauce cooks: make the pasta dough. Mound 200g of flour on a clean surface. Make a well in the centre.', refs: [{ name: 'Tipo 00 flour', qty: '200g', ingredientId: 'pasta-flour' }] },
				{ id: 'pr-11', action: 'mix', dirtyHands: true, text: 'Crack 2 eggs into the well. Beat with a fork, gradually drawing in flour from the edges.', refs: [{ name: 'Eggs', qty: '2', ingredientId: 'egg' }] },
				{ id: 'pr-12', action: 'mix', dirtyHands: true, text: 'Once it comes together, knead for 8–10 minutes until smooth and elastic. Wrap in cling film and rest for 30 minutes.', timer: 1800 },
				{ id: 'pr-13', action: 'mix', dirtyHands: true, text: 'Make the meatball mix: combine both minces, breadcrumbs, 1 egg, the meatball garlic, salt and pepper.', refs: [{ name: 'Pork mince', qty: '250g', ingredientId: 'pork-mince' }, { name: 'Beef mince', qty: '250g', ingredientId: 'beef-mince' }, { name: 'Fresh breadcrumbs', qty: '50g', ingredientId: 'breadcrumbs' }] },
				{ id: 'pr-14', action: 'prep', dirtyHands: true, text: 'Mix gently with your hands. Roll into 14–16 small, tight balls.' },
				{ id: 'pr-15', action: 'cook', text: 'Heat 2 tbsp oil in a frying pan over medium-high heat. Brown the meatballs on all sides — 6–8 minutes.', timer: 420 },
				{ id: 'pr-16', action: 'add', text: 'Add browned meatballs to the sauce. Continue simmering together.' },
				{ id: 'pr-17', action: 'prep', text: 'Roll the pasta dough thin (setting 5–6 on a machine, or about 2mm by hand). Cut into rough spaghetti strips.' },
				{ id: 'pr-18', action: 'boil', text: 'Bring a large pot of heavily salted water to a rolling boil.' },
				{ id: 'pr-19', action: 'cook', text: 'Cook the fresh pasta for 2–3 minutes only — it\'s done when it floats and tastes just tender.', timer: 180 },
				{ id: 'pr-20', action: 'add', text: 'Reserve a mug of pasta water. Drain and add pasta immediately to the sauce. Toss with a splash of pasta water.' },
				{ id: 'pr-21', action: 'cook', essential: false, text: 'Make the toasted breadcrumbs: blitz the stale bread, fry in olive oil over medium heat until golden and crisp.', timer: 300, refs: [{ name: 'Stale bread', qty: '2 slices', ingredientId: 'toasted-breadcrumbs' }] },
				{ id: 'pr-22', action: 'serve', text: 'Serve in warmed bowls. Finish with parmesan, torn basil, a drizzle of extra virgin olive oil, and scattered toasted breadcrumbs.', refs: [{ name: 'Parmesan', qty: 'To serve', ingredientId: 'parmesan' }, { name: 'Fresh basil', qty: 'Large bunch', ingredientId: 'fresh-basil' }] },
			]
		}
	},
	{
		id: 'roast-chicken',
		title: 'Roast Chicken',
		subtitle: 'Crispy-skinned whole chicken with roasting juices',
		serves: 4,
		activeMins: 20,
		tags: ['roast', 'classic', 'sunday'],
		difficulty: 'easy',
		totalMins: 100
	}
];
