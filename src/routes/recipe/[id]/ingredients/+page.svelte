<script lang="ts">
	import { page } from '$app/state';
	import { RECIPES, type Recipe } from '../../../../lib/recipes.js';

	const recipe = $derived([...RECIPES, ...((page.data.imported as Recipe[]) ?? [])].find(r => r.id === page.params.id));
	const level = $derived(
		(page.url.searchParams.get('level') ?? 'standard') as 'simple' | 'standard' | 'premium'
	);
	const levelLabel = $derived(level.charAt(0).toUpperCase() + level.slice(1));
	const ingredients = $derived(recipe?.ingredients?.[level] ?? []);

	// Serving size scaling
	let serves = $state(0); // 0 = unset, will be initialised from recipe
	$effect(() => { if (recipe && serves === 0) serves = recipe.serves; });
	const multiplier = $derived(recipe ? serves / recipe.serves : 1);

	function adjustServes(delta: number) {
		const next = serves + delta;
		if (next >= 2) serves = next;
	}

	// Quantity scaling utility
	function fmt(n: number): string {
		const fracs: [number, string][] = [
			[0.25,'¼'],[0.33,'⅓'],[0.5,'½'],[0.67,'⅔'],[0.75,'¾'],
			[1.25,'1¼'],[1.33,'1⅓'],[1.5,'1½'],[1.75,'1¾'],
			[2.5,'2½'],[3.5,'3½'],[4.5,'4½'],
		];
		for (const [v, s] of fracs) if (Math.abs(n - v) < 0.09) return s;
		if (n >= 100) return String(Math.round(n / 5) * 5);
		if (n >= 10)  return String(Math.round(n));
		if (n === Math.round(n)) return String(n);
		return String(Math.round(n * 2) / 2); // nearest 0.5
	}

	function scaleQty(qty: string): string {
		if (multiplier === 1) return qty;
		// qualitative pass-through
		if (/^(to\b|pinch|a\s|small\b|large\s+bunch)/i.test(qty.trim())) return qty;
		// "2 × 400g cans"
		const times = qty.match(/^(\d+(?:\.\d+)?)\s*[×x]\s*(.+)$/i);
		if (times) return `${fmt(parseFloat(times[1]) * multiplier)} × ${times[2]}`;
		// "2-3 tbsp" range
		const range = qty.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)(.*)/);
		if (range) return `${fmt(parseFloat(range[1]) * multiplier)}–${fmt(parseFloat(range[2]) * multiplier)}${range[3]}`;
		// leading number, preserve spacing: "250g" vs "4 cloves"
		const num = qty.match(/^(\d+(?:\.\d+)?)([ ]?)(.*)/);
		if (num) return `${fmt(parseFloat(num[1]) * multiplier)}${num[2]}${num[3]}`;
		return qty;
	}

	let simplified = $state(false);
	// explicit user toggles: true = manually excluded, false = manually re-included (overrides simplify)
	let userMissing = $state<Record<string, boolean | undefined>>({});
	let missingSub = $state<Record<string, boolean>>({});

	// Effective state for each ingredient
	function isMissing(ing: { id: string; essential: boolean }): boolean {
		const u = userMissing[ing.id];
		if (u === true) return true;              // user explicitly excluded
		if (u === false) return false;             // user explicitly re-included
		return simplified && !ing.essential;       // auto-excluded by simplify
	}

	function isAutoExcluded(ing: { id: string; essential: boolean }): boolean {
		return simplified && !ing.essential && userMissing[ing.id] === undefined;
	}

	function toggleSimplify() {
		simplified = !simplified;
		// When turning simplify off, clear any "re-include" overrides on non-essentials
		// (they were only meaningful while in simplified mode)
		if (!simplified) {
			for (const ing of ingredients) {
				if (!ing.essential && userMissing[ing.id] === false) {
					userMissing[ing.id] = undefined;
				}
			}
		}
	}

	function toggleItem(id: string, essential: boolean) {
		const currently = isMissing({ id, essential });
		if (currently) {
			// Bring it back in
			userMissing[id] = simplified && !essential ? false : undefined;
			missingSub[id] = false;
		} else {
			// Exclude it
			userMissing[id] = true;
		}
	}

	function toggleSub(id: string) {
		missingSub[id] = !missingSub[id];
	}

	// Derived counts for CTA
	const essentialGaps = $derived(
		ingredients.filter(ing => {
			if (!isMissing(ing)) return false;
			if (ing.substitute && !missingSub[ing.id]) return false;
			return ing.essential;
		}).length
	);

	const adjustments = $derived(ingredients.filter(ing => isMissing(ing)));

	const ctaLabel = $derived(
		adjustments.length === 0 ? "Let's cook →" :
		essentialGaps > 0 ? `Cook with ${essentialGaps} gap${essentialGaps > 1 ? 's' : ''} →` :
		'Cook with subs →'
	);

	const cookHref = $derived((() => {
		if (!recipe) return '#';
		const missingIds = ingredients.filter(ing => isMissing(ing)).map(ing => ing.id);
		const missingSubIds = Object.keys(missingSub).filter(k => missingSub[k]);
		const params = new URLSearchParams({ level });
		if (missingIds.length) params.set('missing', missingIds.join(','));
		if (missingSubIds.length) params.set('missingSub', missingSubIds.join(','));
		if (serves !== recipe.serves) params.set('serves', String(serves));
		if (simplified) params.set('essentials', '1');
		return `/recipe/${recipe.id}/cook?${params}`;
	})());

	const hasNonEssential = $derived(ingredients.some(ing => !ing.essential));
</script>

<svelte:head>
	<title>{recipe?.title ?? 'Ingredients'} — Sous</title>
</svelte:head>

{#if !recipe}
	<div class="flex h-svh items-center justify-center text-[var(--color-muted)]">Recipe not found</div>
{:else}
<div class="flex min-h-svh flex-col px-6 py-10 md:px-10">
	<div class="mx-auto w-full max-w-xl flex-1 flex flex-col">

		<!-- Header -->
		<div class="mb-8">
			<a href="/recipe/{recipe.id}" class="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
				<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
					<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Back
			</a>
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-baseline gap-3 min-w-0">
					<h1 class="text-[26px] font-bold tracking-[-0.025em] truncate">{recipe.title}</h1>
					<span class="flex-shrink-0 rounded-full bg-[var(--color-soft)] px-2.5 py-0.5 text-[12px] font-semibold tracking-[.04em] text-[var(--color-muted)]">{levelLabel}</span>
				</div>
				<!-- Serves control -->
				<div class="flex-shrink-0 flex items-center gap-1 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-soft)] p-1">
					<button
						onclick={() => adjustServes(-2)}
						disabled={serves <= 2}
						class="flex h-7 w-7 items-center justify-center rounded-[7px] text-[18px] font-light leading-none transition-all disabled:opacity-25"
						style="color: var(--color-ink);"
					>−</button>
					<div class="min-w-[3.5rem] text-center">
						<span class="text-[15px] font-bold tabular-nums" style="color: var(--color-ink)">{serves}</span>
						<span class="ml-0.5 text-[11px]" style="color: var(--color-muted)">serves</span>
					</div>
					<button
						onclick={() => adjustServes(2)}
						class="flex h-7 w-7 items-center justify-center rounded-[7px] text-[18px] font-light leading-none transition-all"
						style="color: var(--color-ink);"
					>+</button>
				</div>
			</div>
		</div>

		{#if ingredients.length > 0}

		<!-- Controls row -->
		<div class="mb-3 flex items-center justify-between">
			<div class="text-[11px] font-bold tracking-[.08em] uppercase text-[var(--color-muted)]">
				Tick what you have
			</div>
			{#if hasNonEssential}
			<button
				onclick={toggleSimplify}
				class="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all"
				style="{simplified
					? 'background-color: var(--color-accent); color: white;'
					: 'background-color: var(--color-soft); color: var(--color-muted); border: 1px solid var(--color-line);'}"
			>
				<svg class="h-3 w-3" viewBox="0 0 12 12" fill="none">
					<path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
				Essentials only
			</button>
			{/if}
		</div>

		<!-- Ingredient list -->
		<div class="mb-6 flex-1">
			{#each ingredients as ing}
			{@const itemMissing = isMissing(ing)}
			{@const autoExcluded = isAutoExcluded(ing)}
			{@const subMissing = !!missingSub[ing.id]}
			{@const hasGap = itemMissing && (!ing.substitute || subMissing) && ing.essential}

			<div class="relative border-b border-[var(--color-line)] last:border-b-0 transition-opacity"
				style="{hasGap ? 'padding-left: 10px;' : ''}{autoExcluded ? 'opacity: 0.4;' : ''}"
			>
				<!-- Red left-edge bar for essential gaps -->
				{#if hasGap}
				<div class="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
					style="background-color: var(--color-red); opacity: 0.6"></div>
				{/if}

				<!-- Original item row -->
				<button
					onclick={() => toggleItem(ing.id, ing.essential)}
					class="flex w-full items-center gap-3 py-2.5 text-left"
				>
					<div class="h-[18px] w-[18px] flex-shrink-0 rounded-[5px] border-2 transition-all"
						style="border-color: {itemMissing ? 'var(--color-line)' : 'var(--color-green)'}; background-color: {itemMissing ? 'transparent' : 'var(--color-green)'}">
						{#if !itemMissing}
						<svg class="h-full w-full p-0.5 text-white" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						{/if}
					</div>

					<span class="flex-1 text-[15px] font-medium transition-all"
						style="color: {itemMissing && !autoExcluded ? 'var(--color-muted)' : 'var(--color-ink)'}; {itemMissing && !autoExcluded ? 'text-decoration: line-through; text-decoration-color: var(--color-line)' : ''}">
						{ing.name}
						{#if !ing.essential}
							<span class="ml-1.5 text-[11px] font-semibold uppercase tracking-[.06em] opacity-50">opt</span>
						{/if}
					</span>

					<span class="text-[13px] transition-opacity"
						style="color: var(--color-muted); opacity: {itemMissing && !autoExcluded ? 0.35 : 1}">
						{scaleQty(ing.qty)}
					</span>

					<!-- Essential gap warning dot -->
					{#if hasGap}
					<div class="h-2 w-2 flex-shrink-0 rounded-full" style="background-color: var(--color-red)"></div>
					{/if}
				</button>

				<!-- Substitute row — appears inline when original is unticked (not auto-excluded) -->
				{#if itemMissing && !autoExcluded && ing.substitute}
				<button
					onclick={() => toggleSub(ing.id)}
					class="flex w-full items-center gap-2.5 pb-2.5 pl-7 text-left"
				>
					<div class="text-[13px] leading-none" style="color: var(--color-muted); opacity: 0.4">↳</div>

					<div class="h-[16px] w-[16px] flex-shrink-0 rounded-[4px] border-2 transition-all"
						style="border-color: {subMissing ? 'var(--color-line)' : 'var(--color-green)'}; background-color: {subMissing ? 'transparent' : 'var(--color-green)'}">
						{#if !subMissing}
						<svg class="h-full w-full p-[2px] text-white" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						{/if}
					</div>

					<span class="flex-1 text-[13px] transition-opacity"
						style="color: {subMissing ? 'var(--color-muted)' : 'var(--color-ink)'}; opacity: {subMissing ? 0.5 : 1}; {subMissing ? 'text-decoration: line-through; text-decoration-color: var(--color-line)' : ''}">
						{ing.substitute}
					</span>
				</button>
				{/if}

			</div>
			{/each}
		</div>

		<!-- CTA -->
		<a
			href={cookHref}
			class="block w-full rounded-[12px] py-4 text-center text-[17px] font-semibold text-white transition-colors"
			style="background-color: {essentialGaps > 0 ? 'var(--color-amber)' : 'var(--color-accent)'}"
		>
			{ctaLabel}
		</a>

		{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
			<p class="text-[15px] text-[var(--color-muted)]">Ingredient list coming soon.</p>
			<a href="/recipe/{recipe.id}/cook?level={level}"
				class="rounded-[12px] bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white">
				Go to cook view →
			</a>
		</div>
		{/if}

	</div>
</div>
{/if}
