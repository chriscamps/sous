<script lang="ts">
	import { page } from '$app/state';
	import { RECIPES, type Recipe } from '../../../../lib/recipes.js';
	import type { StepRef, Step } from '../../../../lib/recipes.js';

	const recipe = $derived([...RECIPES, ...((page.data.imported as Recipe[]) ?? [])].find(r => r.id === page.params.id));
	const level = $derived(
		(page.url.searchParams.get('level') ?? 'standard') as 'simple' | 'standard' | 'premium'
	);
	const steps = $derived(recipe?.steps?.[level] ?? (recipe as any)?.steps?.standard ?? []);

	const missingIds = $derived(new Set((page.url.searchParams.get('missing') ?? '').split(',').filter(Boolean)));
	const missingSubIds = $derived(new Set((page.url.searchParams.get('missingSub') ?? '').split(',').filter(Boolean)));
	const essentialsOnly = $derived(page.url.searchParams.get('essentials') === '1');

	const servesParam = $derived(parseInt(page.url.searchParams.get('serves') ?? '0', 10));
	const multiplier = $derived(recipe && servesParam > 0 ? servesParam / recipe.serves : 1);

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
		return String(Math.round(n * 2) / 2);
	}

	function scaleQty(qty: string): string {
		if (multiplier === 1) return qty;
		if (/^(to\b|pinch|a\s|small\b|large\s+bunch)/i.test(qty.trim())) return qty;
		const times = qty.match(/^(\d+(?:\.\d+)?)\s*[×x]\s*(.+)$/i);
		if (times) return `${fmt(parseFloat(times[1]) * multiplier)} × ${times[2]}`;
		const range = qty.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)(.*)/);
		if (range) return `${fmt(parseFloat(range[1]) * multiplier)}–${fmt(parseFloat(range[2]) * multiplier)}${range[3]}`;
		const num = qty.match(/^(\d+(?:\.\d+)?)([ ]?)(.*)/);
		if (num) return `${fmt(parseFloat(num[1]) * multiplier)}${num[2]}${num[3]}`;
		return qty;
	}

	let currentIndex = $state(0);  // scroll-driven, for progress bar
	let pendingTarget = $state(-1); // tap-driven target; -1 = follow scroll
	let done = $state(false);

	interface ActiveTimer {
		stepId: string;
		label: string;
		endsAt: number;
		total: number;
	}
	let activeTimers = $state<ActiveTimer[]>([]);
	let now = $state(Date.now());

	$effect(() => {
		const interval = setInterval(() => { now = Date.now(); }, 1000);
		return () => clearInterval(interval);
	});

	let containerEl: HTMLElement | null = $state(null);
	let cardEls = $state<(HTMLElement | null)[]>([]);

	// Visual effect: opacity + scale driven by scroll position
	$effect(() => {
		if (!containerEl) return;

		function updateVisuals() {
			const containerH = containerEl!.clientHeight;
			const containerRect = containerEl!.getBoundingClientRect();
			cardEls.forEach((card) => {
				if (!card) return;
				const rect = card.getBoundingClientRect();
				const cardCenterY = rect.top - containerRect.top + rect.height / 2;
				const normalizedOffset = (cardCenterY - containerH / 2) / rect.height;
				const absOffset = Math.min(1.2, Math.abs(normalizedOffset));
				card.style.opacity = `${Math.max(0.1, 1 - absOffset * 0.82)}`;
				card.style.transform = `scale(${Math.max(0.9, 1 - absOffset * 0.08)})`;
			});
		}

		containerEl.addEventListener('scroll', updateVisuals, { passive: true });
		requestAnimationFrame(updateVisuals);
		return () => containerEl?.removeEventListener('scroll', updateVisuals);
	});

	// Track currentIndex from scroll; clear pendingTarget when scroll settles
	$effect(() => {
		if (!containerEl) return;
		function onScroll() {
			const cardH = containerEl!.clientHeight - 300;
			if (cardH <= 0) return;
			const idx = Math.min(Math.round(containerEl!.scrollTop / cardH), displayItems.length - 1);
			currentIndex = idx;
			if (pendingTarget >= 0 && idx === pendingTarget) pendingTarget = -1;
		}
		containerEl.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => containerEl?.removeEventListener('scroll', onScroll);
	});

	// Scroll to a card using deterministic math (avoids mid-animation rects).
	// scrollPos[i] = i * cardH where cardH = containerH - 300 (spacers are 150px each).
	function scrollToCard(index: number) {
		if (!containerEl) return;
		const cardH = containerEl.clientHeight - 300;
		containerEl.scrollTo({ top: index * cardH, behavior: 'smooth' });
	}

	function advance() {
		const base = pendingTarget >= 0 ? pendingTarget : currentIndex;
		if (base >= displayItems.length - 1) { done = true; return; }
		pendingTarget = base + 1;
		scrollToCard(pendingTarget);
	}

	function goBack() {
		const base = pendingTarget >= 0 ? pendingTarget : currentIndex;
		if (base <= 0) return;
		pendingTarget = base - 1;
		scrollToCard(pendingTarget);
	}

	function handleTap(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('button, a')) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const relY = (e.clientY - rect.top) / rect.height;
		if (relY > 0.5) advance();
		else goBack();
	}

	function startTimer(stepId: string, label: string, duration: number) {
		if (activeTimers.find(t => t.stepId === stepId)) return;
		activeTimers = [...activeTimers, { stepId, label, endsAt: Date.now() + duration * 1000, total: duration }];
	}

	function dismissTimer(stepId: string) {
		activeTimers = activeTimers.filter(t => t.stepId !== stepId);
	}

	function fmtDuration(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')}`;
	}

	function fmtCountdown(timer: ActiveTimer): string {
		const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
		const m = Math.floor(remaining / 60);
		const s = remaining % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const visibleSteps = $derived(
		(steps as Step[]).filter(step => {
			if (essentialsOnly && step.essential === false) return false;
			if (!step.refs?.length) return true;
			return !step.refs.every((ref: StepRef) =>
				ref.ingredientId &&
				missingIds.has(ref.ingredientId) &&
				missingSubIds.has(ref.ingredientId)
			);
		})
	);

	type DisplayItem = { type: 'single'; step: Step } | { type: 'merged'; steps: Step[] };

	const displayItems = $derived((() => {
		const result: DisplayItem[] = [];
		let i = 0;
		while (i < visibleSteps.length) {
			const step = visibleSteps[i];
			if (step.dirtyHands) {
				const group: Step[] = [step];
				while (i + 1 < visibleSteps.length && visibleSteps[i + 1].dirtyHands) {
					i++;
					group.push(visibleSteps[i]);
				}
				result.push(group.length > 1 ? { type: 'merged', steps: group } : { type: 'single', step: group[0] });
			} else {
				result.push({ type: 'single', step });
			}
			i++;
		}
		return result;
	})());

	const currentItem = $derived(displayItems[currentIndex]);

	function resolveStepAdaptations(step: Step) {
		let refs = [...(step.refs ?? [])];
		const removedIds = new Set<string>();
		let instructions = step.instructions ? [...step.instructions] : undefined;
		for (const adaptation of (step.adaptations ?? [])) {
			const fires =
				(adaptation.whenMissing?.some(id => missingIds.has(id)) ?? false) ||
				(adaptation.whenGap?.some(id => missingIds.has(id) && missingSubIds.has(id)) ?? false);
			if (!fires) continue;
			for (const id of (adaptation.removeRefs ?? [])) removedIds.add(id);
			if (adaptation.adjustRefs) {
				refs = refs.map(r => {
					const newQty = r.ingredientId ? adaptation.adjustRefs![r.ingredientId] : undefined;
					if (!newQty) return r;
					return { ...r, qty: newQty, inline: `${newQty} ${r.name.toLowerCase()}` };
				});
			}
			if (adaptation.overrideInstructions && instructions) {
				instructions = instructions.map((instr, j) =>
					adaptation.overrideInstructions![j] ?? instr
				);
			}
		}
		return { refs, removedIds, instructions };
	}

	type InstrLine = { text: string; refs: StepRef[]; removedIds: Set<string> };

	function getCardContent(item: DisplayItem) {
		const stepId = item.type === 'single' ? item.step.id : item.steps[0].id;
		if (item.type === 'single') {
			const r = resolveStepAdaptations(item.step);
			const instructions: InstrLine[] = (r.instructions ?? []).map(text => ({ text, refs: r.refs, removedIds: r.removedIds }));
			const goal = item.step.goal ?? null;
			return {
				stepId,
				action: item.step.action ?? 'prep',
				goal,
				instructions,
				notes: item.step.note ? [item.step.note] : [],
				timer: item.step.timer ?? null,
				timerLabel: goal ?? (instructions[0]?.text.replace(/\{[^}]+\}/g, '…').slice(0, 50) ?? ''),
			};
		}
		const instructions: InstrLine[] = [];
		const notes: string[] = [];
		let timer: number | null = null;
		item.steps.forEach((step, si) => {
			const r = resolveStepAdaptations(step);
			if (si > 0 && step.goal) instructions.push({ text: step.goal, refs: r.refs, removedIds: r.removedIds });
			for (const text of (r.instructions ?? [])) instructions.push({ text, refs: r.refs, removedIds: r.removedIds });
			if (step.note) notes.push(step.note);
			if (!timer && step.timer) timer = step.timer;
		});
		const goal = item.steps[0].goal ?? null;
		return {
			stepId,
			action: item.steps[0].action ?? 'prep',
			goal,
			instructions,
			notes,
			timer,
			timerLabel: goal ?? (instructions[0]?.text.replace(/\{[^}]+\}/g, '…').slice(0, 50) ?? ''),
		};
	}

	type Token = { type: 'text'; value: string } | { type: 'ref'; ref: StepRef; status: 'ok' | 'missing-sub' | 'missing-gap'; removed: boolean };

	function tokenize(text: string, refs: StepRef[] | undefined, removedIds: Set<string> | undefined): Token[] {
		if (!refs?.length) return [{ type: 'text', value: text }];
		const removed = removedIds ?? new Set<string>();
		const tokens: Token[] = [];
		const pattern = /\{([^}]+)\}/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		pattern.lastIndex = 0;
		while ((match = pattern.exec(text)) !== null) {
			if (match.index > lastIndex) tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
			const id = match[1];
			const ref = refs.find(r => r.ingredientId === id);
			if (ref) {
				tokens.push({ type: 'ref', ref, status: refStatus(id), removed: removed.has(id) });
			} else {
				tokens.push({ type: 'text', value: match[0] });
			}
			lastIndex = pattern.lastIndex;
		}
		if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) });
		return tokens;
	}

	function refStatus(ingredientId?: string): 'missing-gap' | 'missing-sub' | 'ok' {
		if (!ingredientId) return 'ok';
		if (!missingIds.has(ingredientId)) return 'ok';
		if (missingSubIds.has(ingredientId)) return 'missing-gap';
		return 'missing-sub';
	}

	function pillStyle(status: 'ok' | 'missing-sub' | 'missing-gap') {
		if (status === 'missing-gap') return 'background-color: color-mix(in srgb, var(--color-red) 12%, transparent); color: var(--color-red)';
		if (status === 'missing-sub') return 'background-color: color-mix(in srgb, var(--color-amber) 12%, transparent); color: var(--color-amber)';
		return 'background-color: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent)';
	}

	const actionIcons: Record<string, string> = {
		prep: `<g>
<path d="M5.5 20L19.5 5"/>
<path d="M19.5 5c.8-1.2 2.3-.8 2.8.6-.3 1.4-1.6 2-2.5 1.4"/>
<path d="M5.5 20L4 21.5" stroke-width="2" stroke-linecap="round"/>
<animateTransform attributeName="transform" type="rotate" values="0 6 20;-6 6 20;0 6 20;6 6 20;0 6 20" keyTimes="0;0.2;0.5;0.7;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="3s" repeatCount="indefinite"/>
</g>`,
		mix: `<g>
<path d="M9.5 4.5Q8 8 10 11Q11 12 12 12.5"/>
<path d="M14.5 4.5Q16 8 14 11Q13 12 12 12.5"/>
<path d="M7 6.5Q5 10 7.5 12Q9.5 13 12 12.5"/>
<path d="M17 6.5Q19 10 16.5 12Q14.5 13 12 12.5"/>
<path d="M12 12.5V21"/>
<animateTransform attributeName="transform" type="rotate" from="0 12 16" to="360 12 16" dur="2.5s" repeatCount="indefinite"/>
</g>`,
		cook: `<g>
<path d="M12 21a7 7 0 01-7-7c0-4 2.5-6 2.5-9.5C9 6 10 8 12 8c-1-2.5 0-5 0-5 3 3 7 5.5 7 9a7 7 0 01-7 9z" fill="currentColor" fill-opacity="0.12"/>
<animate attributeName="opacity" values="1;0.7;1;0.85;1" dur="2s" repeatCount="indefinite"/>
</g>`,
		add: `<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>`,
		boil: `<path d="M7 12h10l-1.5 8h-7L7 12z"/>
<path d="M5 12h14"/>
<path d="M9 12V10h6v2"/>
<path d="M5 12H3.5M18.5 12H21"/>
<path d="M9.5 10C9 8.5 10 7 9.5 5.5"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0s"/></path>
<path d="M12 10C11.5 8.5 12.5 7 12 5.5"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.65s"/></path>
<path d="M14.5 10C14 8.5 15 7 14.5 5.5"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1.3s"/></path>`,
		rest: `<circle cx="12" cy="13" r="8"/>
<path d="M12 9v4l2.5 2" stroke-linecap="round"/>
<path d="M9 3h6M12 3v2"/>
<line x1="12" y1="13" x2="12" y2="8" stroke-opacity="0.4" stroke-width="1"><animateTransform attributeName="transform" type="rotate" from="0 12 13" to="360 12 13" dur="6s" repeatCount="indefinite"/></line>`,
		serve: `<ellipse cx="12" cy="17.5" rx="9" ry="2"/>
<path d="M3 17.5Q3 8 12 8Q21 8 21 17.5"/>
<circle cx="12" cy="6" r="1.5" fill="currentColor" fill-opacity="0.2"/>
<path d="M12 7.5V12.5"/>`,
	};
</script>

<svelte:head>
	<title>{recipe?.title ?? 'Cook'} — Sous</title>
</svelte:head>

{#if !recipe || displayItems.length === 0}
<div class="flex h-svh flex-col items-center justify-center gap-4 px-6 text-center">
	<p class="text-[16px]" style="color: var(--color-muted)">No steps for this recipe yet.</p>
	<a href="/recipe/{recipe?.id}" class="text-[14px] font-semibold" style="color: var(--color-accent)">← Back</a>
</div>

{:else if done}
<div class="flex h-svh flex-col items-center justify-center gap-6 px-8 text-center">
	<div class="text-[64px] leading-none">🍝</div>
	<div>
		<h1 class="mb-2 text-[32px] font-bold tracking-[-0.03em]" style="color: var(--color-ink)">That's it.</h1>
		<p class="text-[16px]" style="color: var(--color-muted)">{recipe.title} — {displayItems.length} steps done.</p>
	</div>
	<a href="/" class="mt-4 rounded-[12px] px-8 py-4 text-[17px] font-semibold text-white" style="background-color: var(--color-accent)">
		Cook again
	</a>
</div>

{:else}
<div class="flex h-svh flex-col overflow-hidden" style="background-color: var(--color-bg)">

	<!-- Header: progress + back + floating timers -->
	<div class="flex-shrink-0 px-5 pb-2" style="padding-top: max(20px, env(safe-area-inset-top, 0px))">
		<div class="flex items-center gap-2.5">
			<a
				href="/recipe/{recipe.id}/ingredients?level={level}"
				class="flex-shrink-0 rounded-full p-1"
				style="color: var(--color-muted)"
				aria-label="Back"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none">
					<path d="M12 5l-5 5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</a>
			<div class="flex flex-1 items-center gap-[3px]">
				{#each displayItems as _, i}
				<div
					class="h-[3px] flex-1 rounded-full transition-all duration-300"
					style="background-color: {i < currentIndex ? 'var(--color-accent)' : i === currentIndex ? 'var(--color-ink)' : 'var(--color-line)'}"
				></div>
				{/each}
			</div>
			<span class="flex-shrink-0 text-[12px] font-semibold tabular-nums" style="color: var(--color-muted)">
				{currentIndex + 1}<span style="opacity:.4">/{displayItems.length}</span>
			</span>
		</div>

		<!-- Active timers — floating, tap to dismiss -->
		{#if activeTimers.length > 0}
		<div class="mt-2 flex flex-wrap gap-2">
			{#each activeTimers as timer}
			{@const expired = now >= timer.endsAt}
			<button
				onclick={() => dismissTimer(timer.stepId)}
				class="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
				style="background-color: {expired ? 'var(--color-red)' : 'var(--color-soft)'}; color: {expired ? 'white' : 'var(--color-ink)'}; border: 1px solid {expired ? 'transparent' : 'var(--color-line)'}"
			>
				{#if expired}
				<span class="timer-pulse">⏱</span>
				<span class="max-w-[140px] truncate">{timer.label} — done!</span>
				{:else}
				<svg class="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12" fill="none">
					<circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/>
					<path d="M6 3.5V6l1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
				</svg>
				<span class="tabular-nums">{fmtCountdown(timer)}</span>
				<span class="max-w-[110px] truncate" style="opacity: 0.6">— {timer.label}</span>
				{/if}
			</button>
			{/each}
		</div>
		{/if}
	</div>

	<!-- Step carousel — vertical scroll snap -->
	<div
		bind:this={containerEl}
		onclick={handleTap}
		class="relative flex-1 overflow-y-scroll overflow-x-hidden"
		style="scroll-snap-type: y mandatory; scroll-padding-top: 80px; -webkit-overflow-scrolling: touch; overscroll-behavior: none"
	>
		<!-- Leading spacer so card 0 can scroll to show prev-card peek area above -->
		<div style="height: 80px; flex-shrink: 0"></div>

		{#each displayItems as item, i}
		{@const content = getCardContent(item)}
		{@const isActive = activeTimers.some(t => t.stepId === content.stepId)}
		<div
			bind:this={cardEls[i]}
			class="card-snap"
			style="scroll-snap-align: start; scroll-snap-stop: always"
		>
			<div class="mx-auto w-full max-w-[420px] px-6">

				<!-- Step label — always at top (visible in next card's peek) -->
				<div class="mb-5 flex items-center gap-2 pt-5">
					<svg class="h-[13px] w-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent); opacity: 0.65">
						{@html actionIcons[content.action]}
					</svg>
					<span class="text-[10px] font-bold tracking-[.12em] uppercase" style="color: var(--color-accent)">Step {i + 1}</span>
				</div>

				<!-- Goal — de-emphasised context -->
				{#if content.goal}
				<p class="mb-3 text-[13px] font-semibold tracking-[.01em]" style="color: var(--color-muted)">{content.goal}</p>
				{/if}

				<!-- First instruction: BIG — the immediate action -->
				{#if content.instructions.length > 0}
				{@const first = content.instructions[0]}
				{@const rest = content.instructions.slice(1)}
				{@const bigSize = !content.goal && rest.length === 0 ? '28px' : '22px'}
				<p class="mb-4 font-semibold leading-[1.25]" style="font-size: {bigSize}; color: var(--color-ink); overflow-wrap: break-word">
					{#each tokenize(first.text, first.refs, first.removedIds) as token}
						{#if token.type === 'text'}{token.value}{:else if token.removed}{:else}<span class="pill" style={pillStyle(token.status)}>{scaleQty(token.ref.inline ?? `${token.ref.qty} ${token.ref.name.toLowerCase()}`)}</span>{/if}
					{/each}
				</p>

				<!-- Remaining instructions — smaller bullet list -->
				{#if rest.length > 0}
				<ul class="mb-4 space-y-2.5">
					{#each rest as instr}
					<li class="flex items-start gap-2.5 leading-[1.5]" style="font-size: 15px; color: var(--color-ink)">
						<span class="mt-[8px] h-[4px] w-[4px] flex-shrink-0 rounded-full" style="background-color: var(--color-accent); opacity: 0.4"></span>
						<span>
							{#each tokenize(instr.text, instr.refs, instr.removedIds) as token}
								{#if token.type === 'text'}{token.value}{:else if token.removed}{:else}<span class="pill" style={pillStyle(token.status)}>{scaleQty(token.ref.inline ?? `${token.ref.qty} ${token.ref.name.toLowerCase()}`)}</span>{/if}
							{/each}
						</span>
					</li>
					{/each}
				</ul>
				{/if}
				{/if}

				<!-- Notes — italic annotation -->
				{#each content.notes as note}
				<p class="mb-2 text-[13px] italic leading-snug" style="color: var(--color-muted)">— {note}</p>
				{/each}

				<!-- Timer: tap to start -->
				{#if content.timer}
				<div class="mt-4">
					{#if isActive}
					<p class="text-[12px]" style="color: var(--color-muted)">Timer running — see above.</p>
					{:else}
					<button
						onclick={(e) => { e.stopPropagation(); startTimer(content.stepId, content.timerLabel, content.timer!); }}
						class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
						style="background-color: var(--color-soft); color: var(--color-ink); border: 1px solid var(--color-line)"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
							<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
							<path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
						</svg>
						Start {fmtDuration(content.timer)} timer
					</button>
					{/if}
				</div>
				{/if}

			</div>
		</div>
		{/each}

		<!-- Trailing spacer -->
		<div style="height: 220px; flex-shrink: 0"></div>
	</div>

</div>
{/if}

<style>
	.card-snap {
		/* Height leaves 300px for peek (150px above, 150px below) */
		height: calc(100% - 300px);
		min-height: calc(100% - 300px);
		display: flex;
		flex-direction: column;
		will-change: opacity, transform;
	}

	.pill {
		display: inline;
		border-radius: 5px;
		padding: 1px 5px;
		font-weight: 600;
		font-size: 0.95em;
	}

	.timer-pulse {
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
