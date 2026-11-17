<script lang="ts">
	import { page } from '$app/state';
	import { RECIPES, type Recipe } from '../../../lib/recipes.js';

	const allRecipes = $derived([...RECIPES, ...((page.data.imported as Recipe[]) ?? [])]);
	const recipe = $derived(allRecipes.find(r => r.id === page.params.id));

	let selected = $state<'simple' | 'standard' | 'premium' | null>(null);

	function formatTime(mins: number): string {
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
	}
</script>

<svelte:head>
	<title>{recipe?.title ?? 'Recipe'} — Sous</title>
</svelte:head>

{#if !recipe}
	<div class="flex h-svh items-center justify-center text-[var(--color-muted)]">Recipe not found</div>
{:else}
<div class="min-h-svh px-6 py-12 md:px-12">
	<div class="mx-auto max-w-2xl">

		<!-- Back -->
		<a href="/" class="mb-10 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
			<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none">
				<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Back
		</a>

		<!-- Header -->
		<header class="mb-10">
			<h1 class="mb-1 text-[36px] font-bold leading-[1.05] tracking-[-0.03em]">
				{recipe.title}
			</h1>
			<p class="text-[16px] text-[var(--color-muted)]">{recipe.subtitle}</p>
		</header>

		{#if recipe.levels}
		<!-- Level selection -->
		<div class="mb-3 text-[11px] font-bold tracking-[.08em] uppercase text-[var(--color-muted)]">
			Choose your level
		</div>

		<div class="mb-8 flex flex-col gap-2.5">
			{#each recipe.levels as level, i}
			{@const time = recipe.levelTimes ? Object.values(recipe.levelTimes)[i] : null}
			<button
				onclick={() => selected = level.id}
				class="group relative w-full rounded-[16px] border p-5 text-left transition-all duration-150
					{selected === level.id
						? 'border-[var(--color-accent)] bg-white shadow-[0_4px_24px_rgba(255,107,0,0.08)]'
						: 'border-[var(--color-line)] bg-[var(--color-card)] hover:border-[var(--color-ink)]'}"
			>
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1 min-w-0">
						<div class="mb-1 flex items-center gap-2.5">
							<span class="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
								{level.label}
							</span>
							{#if time}
							<span class="text-[13px] text-[var(--color-muted)]">{formatTime(time)}</span>
							{/if}
						</div>
						<p class="text-[14px] leading-snug text-[var(--color-muted)]">
							{level.blurb}
						</p>

						{#if level.adds.length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each level.adds as add}
							<span class="rounded-full border border-[var(--color-line)] px-2.5 py-0.5 text-[12px] text-[var(--color-muted)]">
								+ {add}
							</span>
							{/each}
						</div>
						{/if}
					</div>

					<!-- Radio indicator -->
					<div class="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 transition-all
						{selected === level.id
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
							: 'border-[var(--color-line)] bg-transparent group-hover:border-[var(--color-muted)]'}">
						{#if selected === level.id}
						<svg class="h-full w-full p-0.5 text-white" viewBox="0 0 16 16" fill="none">
							<path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						{/if}
					</div>
				</div>
			</button>
			{/each}
		</div>

		{#if selected}
		<a
			href="/recipe/{recipe.id}/ingredients?level={selected}"
			class="block w-full rounded-[12px] bg-[var(--color-accent)] py-4 text-center text-[17px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
		>
			Start with {recipe.levels.find(l => l.id === selected)?.label} →
		</a>
		{:else}
		<button
			disabled
			class="w-full rounded-[12px] bg-[var(--color-soft)] py-4 text-[17px] font-semibold text-[var(--color-muted)] cursor-not-allowed"
		>
			Choose a level
		</button>
		{/if}

		{:else}
		<!-- No levels — imported recipe -->
		{#if recipe.ingredients}
		<a
			href="/recipe/{recipe.id}/ingredients?level=standard"
			class="block w-full rounded-[12px] bg-[var(--color-accent)] py-4 text-center text-[17px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
		>
			Check ingredients →
		</a>
		{:else}
		<a
			href="/recipe/{recipe.id}/cook?level=standard"
			class="block w-full rounded-[12px] bg-[var(--color-accent)] py-4 text-center text-[17px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
		>
			Start cooking →
		</a>
		{/if}
		{/if}

	</div>
</div>
{/if}
