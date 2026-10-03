/* SPDX-License-Identifier: AGPL-3.0-only */
import { describe, expect, test, vi } from 'vitest';

const api = vi.hoisted(() => vi.fn());
vi.mock('./misskey-api.js', () => ({ misskeyApi: api }));
import { normalizeHatagoesCards, normalizeHatagoesCardsV3, useHatagoesPreferences } from './hatagoes-preferences.js';
import { getHatagoesAppPinCandidates, HATAGOES_APP_PIN_LIMIT, normalizeHatagoesAppPins } from './hatagoes-app-pins.js';
import { DEFAULT_HATAGOES_HATASK_PINS } from './hatagoes-hatask-pins.js';

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => { resolve = done; });
	return { promise, resolve };
}

describe('HataGoes account preferences', () => {
	test('adds two new home cards after the saved seven without changing their order or hidden state', () => {
		const saved = [
			{ id: 'issues', hidden: true }, { id: 'reading', hidden: false }, { id: 'meal', hidden: true },
			{ id: 'mood', hidden: false }, { id: 'flower', hidden: false }, { id: 'todo', hidden: true }, { id: 'schedule', hidden: false },
		];
		const normalized = normalizeHatagoesCards(saved);
		expect(normalized.slice(0, 7)).toEqual(saved);
		expect(normalized.slice(7)).toEqual([{ id: 'community', hidden: false }, { id: 'roadmap', hidden: false }]);
	});
	test('starts v3 cards in design order, migrates only matching hidden choices, and fixes feed last', () => {
		const legacy = [{ id: 'issues', hidden: true }, { id: 'reading', hidden: false }, { id: 'meal', hidden: true }, { id: 'community', hidden: true }];
		expect(normalizeHatagoesCardsV3(undefined, legacy)).toEqual([
			{ id: 'daily', hidden: false }, { id: 'schedule', hidden: false }, { id: 'flower', hidden: false }, { id: 'todo', hidden: false },
			{ id: 'mood', hidden: false }, { id: 'meal', hidden: true }, { id: 'reading', hidden: false }, { id: 'issues', hidden: true },
			{ id: 'history', hidden: false }, { id: 'feed', hidden: false },
		]);
		const saved = normalizeHatagoesCardsV3([{ id: 'feed', hidden: true }, { id: 'mood', hidden: false }, { id: 'daily', hidden: true }], legacy);
		expect(saved.map(card => card.id)).toEqual(['mood', 'daily', 'schedule', 'flower', 'todo', 'meal', 'reading', 'issues', 'history', 'feed']);
		expect(saved.find(card => card.id === 'feed')?.hidden).toBe(true);
		expect(saved.find(card => card.id === 'issues')?.hidden).toBe(false);
	});

	test('loads v3 cards independently and saves only cardsV3', async () => {
		api.mockReset().mockImplementation(async (endpoint: string) => endpoint === 'i/registry/get-all' ? { theme: { theme: 'akatsuki' }, cards: [{ id: 'meal', hidden: true }] } : null);
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.cardsV3.value.find(card => card.id === 'meal')?.hidden).toBe(true);
		await prefs.save('cardsV3', [{ id: 'daily', hidden: true }, { id: 'feed', hidden: true }]);
		expect(api.mock.calls.at(-1)?.[1]).toMatchObject({ key: 'cardsV3' });
		expect(prefs.cardsV3.value.find(card => card.id === 'daily')?.hidden).toBe(true);
		expect(prefs.cards.value.find(card => card.id === 'meal')?.hidden).toBe(true);
	});
	test('K22 app pins start empty and normalize only explicit candidates up to eight', () => {
		expect(normalizeHatagoesAppPins(undefined)).toEqual([]);
		expect(normalizeHatagoesAppPins([])).toEqual([]);
		expect(normalizeHatagoesAppPins(['hatask.hata-docs', 'hatask.recipe', 'hatask.intro'])).toEqual(['hatask.intro', 'hatask.recipe']);
		expect(HATAGOES_APP_PIN_LIMIT).toBe(8);
		expect(normalizeHatagoesAppPins([
			'hatask.recipe', 'hatask.recipe', 'hatask.cal', 'hatask.appearance', 'hatask.card-maker',
			'hatask.earthquake', 'hatask.games', 'hatask.qr', 'hatask.scratchpad', 'hatask.intro', 'hatask.gallery',
		])).toEqual([
			'hatask.recipe', 'hatask.appearance', 'hatask.card-maker', 'hatask.earthquake',
			'hatask.games', 'hatask.qr', 'hatask.scratchpad', 'hatask.intro',
		]);
		const candidates = getHatagoesAppPinCandidates();
		expect(candidates.find(item => item.id === 'hatask.recipe')?.group).toBe('hatask');
		expect(candidates.find(item => item.id === 'hatask.card-maker')?.group).toBe('hataskey');
		expect(candidates.some(item => item.id === 'hatask.hata-docs')).toBe(false);
		for (const id of ['hatask.cal', 'hatask.todo', 'hatask.mood', 'hatask.meal', 'hatask.today', 'hatask.apps', 'hatask.tools', 'hatask.review', 'hatask.support-admin']) {
			expect(candidates.some(item => item.id === id)).toBe(false);
		}
	});

	test('loads and saves app pins independently under the HataGoes registry scope', async () => {
		api.mockReset().mockImplementation(async (endpoint: string, params: { scope: string[]; key?: string }) => {
			if (endpoint === 'i/registry/get-all' && params.scope.join('/') === 'client/hatagoes') return { theme: { theme: 'akatsuki' }, appPins: ['hatask.recipe', 'unknown', 'hatask.recipe'] };
			if (endpoint === 'i/registry/set') return null;
			throw new Error(endpoint);
		});
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.appPins.value).toEqual(['hatask.recipe']);
		await prefs.save('appPins', ['hatask.card-maker', 'hatask.card-maker', 'hatask.cal']);
		expect(api.mock.calls.at(-1)?.[1]).toEqual({ scope: ['client', 'hatagoes'], key: 'appPins', value: ['hatask.card-maker'] });
		expect(prefs.appPins.value).toEqual(['hatask.card-maker']);
	});

	test('saves Hatask capsule pins under a separate account key', async () => {
		api.mockReset().mockResolvedValue({ theme: { theme: 'akatsuki' }, pins: ['hatady.records'], appPins: ['hatask.recipe'] });
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.hataskPins.value).toEqual(DEFAULT_HATAGOES_HATASK_PINS);
		await prefs.save('hataskPins', ['hatask.today', 'hatask.recipe', 'hatask.garden']);
		expect(api.mock.calls.at(-1)?.[1]).toEqual({ scope: ['client', 'hatagoes'], key: 'hataskPins', value: ['hatask.today', 'hatask.recipe', 'hatask.garden'] });
		expect(prefs.pins.value).toEqual(['hatady.records']);
		expect(prefs.appPins.value).toEqual(['hatask.recipe']);
	});

	test('desktop Hatask pins read mobile fallback and save a sixth choice independently', async () => {
		const mobile = ['hatask.today', 'hatask.recipe', 'hatask.garden', 'hatask.todo', 'hatask.meal'];
		api.mockReset().mockResolvedValue({ theme: { theme: 'akatsuki' }, hataskPins: mobile });
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.hataskPinsDesktop.value).toEqual(mobile);
		expect(api.mock.calls.filter(call => call[0] === 'i/registry/set')).toHaveLength(0);
		await prefs.save('hataskPins', ['hatask.today', 'hatask.cal']);
		expect(prefs.hataskPinsDesktop.value).toEqual(['hatask.today', 'hatask.cal']);
		await prefs.save('hataskPinsDesktop', [...mobile, 'hatask.cal']);
		expect(api.mock.calls.at(-1)?.[1]).toEqual({ scope: ['client', 'hatagoes'], key: 'hataskPinsDesktop', value: [...mobile, 'hatask.cal'] });
		expect(prefs.hataskPins.value).toEqual(['hatask.today', 'hatask.cal']);
		expect(prefs.hataskPinsDesktop.value).toEqual([...mobile, 'hatask.cal']);
		await prefs.save('hataskPins', mobile);
		expect(prefs.hataskPinsDesktop.value).toEqual([...mobile, 'hatask.cal']);
	});

	test('failed app pin save keeps the last persisted selection', async () => {
		api.mockReset().mockResolvedValueOnce({ theme: { theme: 'akatsuki' }, appPins: ['hatask.recipe'] }).mockRejectedValueOnce(new Error('offline'));
		const prefs = useHatagoesPreferences();
		await prefs.load();
		await expect(prefs.save('appPins', ['hatask.gallery'])).rejects.toThrow('offline');
		expect(prefs.appPins.value).toEqual(['hatask.recipe']);
		expect(prefs.error.value).toBe(true);
	});
	test('a failed read leaves preferences locked and never writes defaults', async () => {
		api.mockReset().mockRejectedValue(new Error('offline'));
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.ready.value).toBe(false);
		expect(prefs.error.value).toBe(true);
		await expect(prefs.save('cards', [])).rejects.toThrow('not loaded');
		expect(api.mock.calls.map(call => call[0])).toEqual(['i/registry/get-all']);
	});

	test('failed Hatask theme read does not write a guessed HataGoes theme', async () => {
		api.mockReset().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.ready.value).toBe(false);
		expect(prefs.error.value).toBe(true);
		expect(api.mock.calls.map(call => call[0])).toEqual(['i/registry/get-all', 'i/registry/get-all']);
	});

	test('copies Hatask theme only to the independent HataGoes key', async () => {
		api.mockReset().mockImplementation(async (endpoint: string, params: { scope: string[]; key?: string }) => {
			if (endpoint === 'i/registry/get-all' && params.scope.join('/') === 'client/hatagoes') return {};
			if (endpoint === 'i/registry/get-all' && params.scope.join('/') === 'client/hatask') return { settings: { theme: 'koke', darkMode: true, autoTheme: false } };
			if (endpoint === 'i/registry/set') return null;
			throw new Error(endpoint);
		});
		const prefs = useHatagoesPreferences();
		await prefs.load();
		expect(prefs.theme.value).toEqual({ theme: 'koke', darkMode: true, autoTheme: false });
		expect(api.mock.calls.filter(call => call[0] === 'i/registry/set').map(call => call[1])).toEqual([
			{ scope: ['client', 'hatagoes'], key: 'theme', value: { theme: 'koke', darkMode: true, autoTheme: false } },
		]);
		await prefs.save('cards', [{ id: 'mood', hidden: true }]);
		expect(api.mock.calls.at(-1)?.[1]).toMatchObject({ scope: ['client', 'hatagoes'], key: 'cards' });
		expect(prefs.cards.value.find(card => card.id === 'mood')?.hidden).toBe(true);
	});

	test('late load cannot overwrite the newer response', async () => {
		const first = deferred<Record<string, unknown>>();
		api.mockReset().mockImplementationOnce(() => first.promise).mockResolvedValue({ theme: { theme: 'kashin', darkMode: false, autoTheme: false } });
		const prefs = useHatagoesPreferences();
		const oldLoad = prefs.load();
		await prefs.load();
		first.resolve({ theme: { theme: 'koke', darkMode: true, autoTheme: false } });
		await oldLoad;
		expect(prefs.theme.value.theme).toBe('kashin');
		expect(api.mock.calls.filter(call => call[0] === 'i/registry/set')).toHaveLength(0);
	});
});
