<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { RECIPES, type Recipe } from '../lib/recipes.js';

	function formatTime(mins: number): string {
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
	}

	const difficultyLabel: Record<Recipe['difficulty'], string> = {
		easy: 'Easy',
		medium: 'Medium',
		involved: 'Involved'
	};

	const levelLabels = ['Simple', 'Standard', 'Premium'] as const;

	const allRecipes = $derived([...RECIPES, ...((page.data.imported as Recipe[]) ?? [])]);

	// Sheet state
	let sheetOpen = $state(false);
	let importMode = $state<'url' | 'paste'>('url');
	let importUrl = $state('');
	let importText = $state('');
	let importState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let importError = $state('');

	async function handleImport() {
		const payload = importMode === 'url'
			? { url: importUrl.trim() }
			: { text: importText.trim() };
		if (!Object.values(payload)[0]) return;
		importState = 'loading';
		importError = '';
		try {
			const res = await fetch('/api/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(err.message ?? 'Import failed');
			}
			importState = 'success';
			await invalidateAll();
			setTimeout(() => {
				sheetOpen = false;
				importUrl = '';
				importText = '';
				importState = 'idle';
			}, 1200);
		} catch (e: unknown) {
			importError = e instanceof Error ? e.message : 'Something went wrong';
			importState = 'error';
		}
	}

	function openSheet() {
		sheetOpen = true;
		importMode = 'url';
		importUrl = '';
		importText = '';
		importState = 'idle';
		importError = '';
	}

	function closeSheet() {
		sheetOpen = false;
	}

	const steps = [
		{
			n: '01',
			title: 'Pick a recipe',
			body: 'Choose from the collection or paste any recipe — Claude converts it to the right format automatically.'
		},
		{
			n: '02',
			title: 'Set your level',
			body: 'Simple, standard or full difficulty. Same dish, same end result — just a different amount of effort and technique.'
		},
		{
			n: '03',
			title: 'Check your ingredients',
			body: 'Tick what you\'ve got. The recipe adapts around substitutions and missing ingredients without you having to think about it.'
		},
		{
			n: '04',
			title: 'Cook step by step',
			body: 'One task at a time. Timers run in the background while you move on — nothing gets forgotten, nothing burns.'
		}
	];
</script>

<svelte:head>
	<title>Sous</title>
</svelte:head>

<!-- Screen 1: Recipe selection -->
<section class="relative flex h-svh flex-col px-6 py-16 md:px-12">
	<div class="mx-auto w-full max-w-2xl flex-1">

		<!-- Header -->
		<header class="mb-14">
			<div class="mb-3 text-[13px] font-semibold tracking-[.08em] uppercase text-[var(--color-muted)]">
				Sous
			</div>
			<h1 class="text-[42px] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--color-ink)]">
				What are we<br>cooking tonight?
			</h1>
		</header>

		<!-- Recipe cards -->
		<div class="mb-4 flex flex-col gap-3">
			{#each allRecipes as recipe}
				<a
					href="/recipe/{recipe.id}"
					class="group flex items-center gap-4 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-card)] p-4 transition-all duration-150 hover:border-[var(--color-accent)] hover:shadow-[0_4px_24px_rgba(255,107,0,0.08)]"
				>
					<div class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-soft)] text-2xl">
						{recipe.id === 'spaghetti-meatballs' ? '🍝' : recipe.id === 'chicken-tikka-masala' ? '🍛' : recipe.tags?.includes('pasta') ? '🍝' : recipe.tags?.includes('chicken') ? '🍗' : recipe.tags?.includes('fish') || recipe.tags?.includes('seafood') ? '🐟' : recipe.tags?.includes('soup') ? '🍲' : recipe.tags?.includes('salad') ? '🥗' : recipe.tags?.includes('baking') || recipe.tags?.includes('bread') ? '🍞' : recipe.tags?.includes('dessert') || recipe.tags?.includes('cake') ? '🍰' : '🍴'}
					</div>
					<div class="min-w-0 flex-1">
						<div class="mb-0.5 flex items-baseline gap-1.5">
							<h2 class="truncate text-[16px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
								{recipe.title}
							</h2>
							<span class="flex-shrink-0 text-[12px] text-[var(--color-muted)]">
								{difficultyLabel[recipe.difficulty]}
							</span>
						</div>
						<p class="mb-2 truncate text-[13px] text-[var(--color-muted)]">
							{recipe.subtitle}
						</p>
						<div class="flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
							{#if recipe.levelTimes}
								{@const times = Object.values(recipe.levelTimes) as number[]}
								<span class="whitespace-nowrap">{formatTime(times[0])}–{formatTime(times[times.length - 1])}</span>
							{:else}
								<span class="whitespace-nowrap">{formatTime(recipe.totalMins ?? 0)}</span>
							{/if}
							<span class="opacity-30">·</span>
							<span class="whitespace-nowrap">Serves {recipe.serves}</span>
						</div>
					</div>
					<svg class="h-4 w-4 flex-shrink-0 text-[var(--color-line)] transition-colors group-hover:text-[var(--color-accent)]" viewBox="0 0 20 20" fill="none">
						<path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</a>
			{/each}
		</div>

		<!-- Import -->
		<button onclick={openSheet} class="flex w-full items-center gap-4 rounded-[16px] border border-dashed border-[var(--color-line)] bg-transparent px-5 py-4 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-soft)]">
			<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-line)] bg-[var(--color-soft)]">
				<svg class="h-4 w-4 text-[var(--color-muted)]" viewBox="0 0 16 16" fill="none">
					<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</div>
			<div>
				<div class="text-[15px] font-semibold text-[var(--color-ink)]">Import a recipe</div>
				<div class="text-[13px] text-[var(--color-muted)]">Paste a URL — Claude converts it automatically</div>
			</div>
		</button>
	</div>


	<!-- Import sheet overlay -->
	{#if sheetOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
			onclick={closeSheet}
		></div>
		<div class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[24px] bg-[var(--color-card)] px-6 pb-10 pt-6 shadow-[0_-8px_40px_rgba(0,0,0,0.2)]" style="max-height: 90dvh;">
			<!-- Handle -->
			<div class="mx-auto mb-6 h-1 w-10 rounded-full bg-[var(--color-line)]"></div>

			<h2 class="mb-1 text-[22px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">Import a recipe</h2>
			<p class="mb-5 text-[14px] text-[var(--color-muted)]">Claude converts it into Sous format automatically.</p>

			<!-- Mode toggle -->
			<div class="mb-4 flex rounded-[10px] border border-[var(--color-line)] bg-[var(--color-soft)] p-1">
				<button
					onclick={() => { importMode = 'url'; importError = ''; }}
					class="flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition-all {importMode === 'url' ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}"
				>Paste URL</button>
				<button
					onclick={() => { importMode = 'paste'; importError = ''; }}
					class="flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition-all {importMode === 'paste' ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}"
				>Paste text</button>
			</div>

			<div class="flex flex-col gap-3">
				{#if importMode === 'url'}
				<input
					type="url"
					placeholder="https://www.bbcgoodfood.com/recipes/…"
					bind:value={importUrl}
					disabled={importState === 'loading'}
					onkeydown={(e) => e.key === 'Enter' && handleImport()}
					class="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
				/>
				{:else}
				<textarea
					placeholder="Paste the full recipe text here — ingredients, quantities, method…"
					bind:value={importText}
					disabled={importState === 'loading'}
					rows={7}
					class="w-full resize-none rounded-[12px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
				></textarea>
				{/if}

				{#if importState === 'error'}
					<p class="text-[13px] text-red-500">{importError}</p>
				{/if}

				<button
					onclick={handleImport}
					disabled={(importMode === 'url' ? !importUrl.trim() : !importText.trim()) || importState === 'loading'}
					class="flex items-center justify-center gap-2 rounded-[12px] bg-[var(--color-accent)] px-5 py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
				>
					{#if importState === 'loading'}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
							<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						</svg>
						Converting…
					{:else if importState === 'success'}
						<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Added!
					{:else}
						Import
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
		<span class="text-[11px] font-semibold tracking-[.08em] uppercase text-[var(--color-muted)]">How it works</span>
		<svg class="arrow-bounce h-5 w-5 text-[var(--color-muted)]" viewBox="0 0 20 20" fill="none">
			<path d="M5 7l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</div>
</section>

<!-- Screen 2: How it works -->
<section class="border-t border-[var(--color-line)] px-6 py-20 md:px-12">
	<div class="mx-auto max-w-2xl">

		<h2 class="mb-12 text-[32px] font-bold tracking-[-0.025em] text-[var(--color-ink)]">
			How it works
		</h2>

		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
			{#each steps as step}
				<div class="flex flex-col gap-3">
					<span class="text-[13px] font-bold tracking-[.06em] text-[var(--color-accent)]">
						{step.n}
					</span>
					<h3 class="text-[18px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
						{step.title}
					</h3>
					<p class="text-[15px] leading-relaxed text-[var(--color-muted)]">
						{step.body}
					</p>
				</div>
			{/each}
		</div>

	</div>
</section>

<style>
	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(5px); }
	}
	.arrow-bounce {
		animation: bounce 2s ease-in-out infinite;
	}
</style>
