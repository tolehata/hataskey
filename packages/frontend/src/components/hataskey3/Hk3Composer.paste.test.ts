/* SPDX-License-Identifier: AGPL-3.0-only */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, shallowRef } from 'vue';
import type * as Misskey from 'cherrypick-js';
import type { PostFormProps } from '@/types/post-form.js';
import Hk3Composer from './Hk3Composer.vue';
import { postSendDelayEnabled } from '@/utility/post-send-delay.js';
import { formatTimeString } from '@/utility/format-time-string.js';
import { prefer } from '@/preferences.js';

const mocks = vi.hoisted(() => ({
	upload: vi.fn(), pc: vi.fn(), drive: vi.fn(), url: vi.fn(), menu: vi.fn(),
	api: vi.fn(), alert: vi.fn(), actions: vi.fn(), postDirect: vi.fn(),
	interruptors: [] as { handler: (data: unknown) => Promise<unknown> }[],
	attachmentModels: [] as Misskey.entities.DriveFile[][],
	storage: new Map<string, string>(),
}));
vi.mock('@/os.js', () => ({
	launchUploader: mocks.upload, popupMenu: mocks.menu, alert: mocks.alert,
	actions: mocks.actions, postDirect: mocks.postDirect,
}));
vi.mock('@/utility/drive.js', () => ({
	chooseFileFromPcAndUpload: mocks.pc, chooseDriveFile: mocks.drive, chooseFileFromUrl: mocks.url,
}));
vi.mock('@/utility/misskey-api.js', () => ({ misskeyApi: mocks.api }));
vi.mock('@/local-storage.js', () => ({ miLocalStorage: {
	getItem: (key: string) => mocks.storage.get(key) ?? null,
	setItem: (key: string, value: string) => mocks.storage.set(key, value),
	getItemAsJson: (key: string) => JSON.parse(mocks.storage.get(key) ?? 'null'),
	setItemAsJson: (key: string, value: unknown) => mocks.storage.set(key, JSON.stringify(value)),
} }));
vi.mock('@/i.js', () => ({ $i: { id: 'me' }, incNotesCount: vi.fn(), notesCount: 10 }));
vi.mock('@/i18n.js', () => ({ i18n: { ts: {
	upload: 'Upload', fromDrive: 'Drive', fromUrl: 'URL', cancel: 'Cancel',
	_visibility: { public: 'Public', home: 'Home', followers: 'Followers', specified: 'Specified' },
	_hata: {
		_drawingTool: { attachmentLimit: 'Limit 16' },
		_postDelay: { countdown: 'Waiting', cancel: 'Cancel', sendNow: 'Send now' },
		_hataskeyUi3: { attach: 'Attach', post: 'Post', postTools: 'Tools', expandForm: 'Full', noAltText: 'Missing alt', preview: 'Preview' },
	},
} } }));
vi.mock('@/preferences.js', async () => {
	const { ref } = await import('vue');
	return { prefer: {
		s: { animation: false, defaultNoteVisibility: 'public', defaultNoteLocalOnly: false, showNoAltTextWarning: true },
		r: {
			animation: ref(false), 'postFormVisibilityBorder.enabled': ref(false),
			hataskeyUi3ComposerEmojiPosition: ref('afterShortcuts'),
			hataskeyUi3ComposerShortcut1: ref('full'), hataskeyUi3ComposerShortcut2: ref('none'),
		},
	} };
});
vi.mock('@/store.js', () => ({ store: { s: {}, set: vi.fn() } }));
vi.mock('@/instance.js', () => ({ instance: { maxNoteTextLength: 3000 } }));
vi.mock('@/utility/intl-const.js', () => ({ versatileLang: 'en-US' }));
vi.mock('@/utility/autocomplete.js', () => ({ Autocomplete: class { detach() {} } }));
vi.mock('@/utility/emoji-picker.js', () => ({ emojiPicker: { show: vi.fn() } }));
vi.mock('@/utility/mfm-function-picker.js', () => ({ mfmFunctionPicker: vi.fn() }));
vi.mock('@/plugin.js', () => ({ getPluginHandlers: () => mocks.interruptors }));
vi.mock('@/events.js', () => ({ globalEvents: { emit: vi.fn() } }));
vi.mock('@/utility/achievements.js', () => ({ claimAchievement: vi.fn() }));
vi.mock('@/components/MkPostFormAttaches.vue', () => ({ default: {
	props: ['modelValue'],
	setup(props: { modelValue: Misskey.entities.DriveFile[] }) { mocks.attachmentModels.push(props.modelValue); },
	template: '<div data-attaches><span v-for="file in modelValue" :key="file.id" :data-file-id="file.id">{{ file.name }}</span></div>',
} }));
vi.mock('@/components/MkEventEditor.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/MkHataPostDelayStatus.vue', () => ({ default: {
	emits: ['sendNow', 'cancel'],
	template: '<button data-send-now @click="$emit(\'sendNow\')">Send now</button>',
} }));
vi.mock('./Hk3ShortcutGuide.vue', () => ({ default: { render: () => null } }));

const cleanups: (() => void)[] = [];
type Composer = { adopt: (request: PostFormProps) => boolean };

function mount(draftId = 'uiS:composer:main') {
	const composer = shallowRef<Composer>();
	const target = window.document.createElement('div');
	window.document.body.append(target);
	const app = createApp({ render: () => h(Hk3Composer, { ref: composer, compact: true, draftId }) });
	for (const name of ['MkAvatar', 'MkUserName']) app.component(name, { render: () => null });
	app.component('Mfm', {
		props: ['text'],
		setup: (props: { text: string }) => () => h('span', { 'data-mfm': '' }, props.text),
	});
	app.mount(target);
	let mounted = true;
	const unmount = () => { if (mounted) app.unmount(); mounted = false; target.remove(); };
	cleanups.push(unmount);
	return {
		target, unmount,
		adopt: (request: PostFormProps) => composer.value!.adopt(request),
		input: () => target.querySelector<HTMLTextAreaElement>('textarea')!,
		send: () => target.querySelector<HTMLButtonElement>('button[data-state]')!,
		ids: () => [...target.querySelectorAll('[data-file-id]')].map(el => el.getAttribute('data-file-id')),
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
}

function driveFile(id: string): Misskey.entities.DriveFile {
	return { id, name: `${id}.png`, type: 'image/png', url: `https://example.com/${id}.png`, thumbnailUrl: null, isSensitive: false, comment: 'Alt text' } as Misskey.entities.DriveFile;
}

function clipboardFile(name = 'image.png', type = 'image/png') {
	return new File(['clipboard content'], name, { type, lastModified: new Date(2026, 8, 26, 12, 34, 56).getTime() });
}

function paste(view: ReturnType<typeof mount>, items: { kind: string; getAsFile?: () => File | null }[], files: File[] = []) {
	const ev = new Event('paste', { bubbles: true, cancelable: true });
	Object.defineProperty(ev, 'clipboardData', { value: { items, files, getData: () => 'ordinary text' } });
	view.input().dispatchEvent(ev);
	return ev;
}

function pasteFile(view: ReturnType<typeof mount>) {
	return paste(view, [{ kind: 'file', getAsFile: () => clipboardFile() }]);
}

function setText(view: ReturnType<typeof mount>, text = 'draft') {
	view.input().value = text;
	view.input().dispatchEvent(new Event('input', { bubbles: true }));
}

function keyboardSubmit(view: ReturnType<typeof mount>) {
	view.input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
}

async function settle() {
	for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); }
}

function attachmentAction(view: ReturnType<typeof mount>, index: number) {
	view.target.querySelector<HTMLButtonElement>('button[title="Attach"]')!.click();
	return mocks.menu.mock.calls.at(-1)![0][index].action as () => Promise<void>;
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	mocks.storage.clear();
	mocks.interruptors.length = 0;
	mocks.attachmentModels.length = 0;
	mocks.upload.mockReset().mockResolvedValue([]);
	mocks.pc.mockReset().mockResolvedValue([]);
	mocks.drive.mockReset().mockResolvedValue([]);
	mocks.url.mockReset().mockResolvedValue(driveFile('url'));
	mocks.api.mockReset().mockResolvedValue({ createdNote: null });
	mocks.actions.mockReset().mockResolvedValue({ canceled: false, result: 'post' });
	mocks.postDirect.mockReset().mockResolvedValue(undefined);
	postSendDelayEnabled.value = false;
	prefer.r.animation.value = false;
});
afterEach(() => {
	cleanups.splice(0).forEach(cleanup => cleanup());
	vi.clearAllTimers();
	vi.useRealTimers();
});

describe('UI S compact composer preview', () => {
	it('retains outgoing text and cancels closing when input resumes', async () => {
		prefer.r.animation.value = true;
		const view = mount();
		const preview = () => view.target.querySelector('[data-composer-preview]');
		setText(view, 'first line\nsecond line');
		await settle();
		await vi.advanceTimersByTimeAsync(1000);
		setText(view, '');
		await settle();
		expect(preview()?.querySelector('[data-mfm]')?.textContent).toBe('first line\nsecond line');
		setText(view, 'resumed input');
		await settle();
		await vi.advanceTimersByTimeAsync(1000);
		expect(view.target.querySelectorAll('[data-composer-preview]')).toHaveLength(1);
		expect(preview()?.querySelector('[data-mfm]')?.textContent).toBe('resumed input');
		setText(view, '');
		await settle();
		await vi.advanceTimersByTimeAsync(1000);
		expect((preview() as HTMLElement).style.display).toBe('none');
		expect(preview()?.querySelector('[data-mfm]')?.textContent).toBe('');
	});

	it('renders and updates the input text, hiding the preview for empty or whitespace-only input', async () => {
		const view = mount();
		const preview = () => view.target.querySelector('[data-composer-preview]');
		expect(preview()).toBeNull();
		setText(view, 'first preview');
		await settle();
		expect(preview()).not.toBeNull();
		expect(preview()!.querySelector('[data-mfm]')!.textContent).toBe('first preview');
		setText(view, 'updated preview\nsecond line');
		await settle();
		expect(preview()!.querySelector('[data-mfm]')!.textContent).toBe('updated preview\nsecond line');
		setText(view, '');
		await settle();
		expect(preview()).toBeNull();
		setText(view, ' \n\t ');
		await settle();
		expect(preview()).toBeNull();
	});
});

describe('UI S composer clipboard attachment integration', () => {
	it('leaves text and null file items to native paste', () => {
		const view = mount();
		setText(view, 'existing text');
		expect(paste(view, [{ kind: 'string' }, { kind: 'file', getAsFile: () => null }]).defaultPrevented).toBe(false);
		const empty = new Event('paste', { bubbles: true, cancelable: true });
		view.input().dispatchEvent(empty);
		expect(empty.defaultPrevented).toBe(false);
		expect(view.input().value).toBe('existing text');
		expect(mocks.upload).not.toHaveBeenCalled();
	});
	it('uploads items once, preserving content/MIME and standard timestamp filenames', async () => {
		const view = mount();
		const file = clipboardFile();
		const extensionless = clipboardFile('screenshot', 'image/webp');
		mocks.upload.mockResolvedValue([driveFile('uploaded')]);
		expect(paste(view, [{ kind: 'string' }, { kind: 'file', getAsFile: () => file }, { kind: 'file', getAsFile: () => extensionless }], [file]).defaultPrevented).toBe(true);
		expect(mocks.upload).toHaveBeenCalledTimes(1);
		const uploaded = mocks.upload.mock.calls[0][0] as File[];
		expect(uploaded.map(item => item.name)).toEqual([
			`${formatTimeString(new Date(file.lastModified), 'yyyy-MM-dd HH-mm-ss [{{number}}]').replace('{{number}}', '2')}.png`,
			formatTimeString(new Date(extensionless.lastModified), 'yyyy-MM-dd HH-mm-ss [{{number}}]').replace('{{number}}', '3'),
		]);
		expect(uploaded.map(item => item.type)).toEqual(['image/png', 'image/webp']);
		expect(await uploaded[0].text()).toBe('clipboard content');
		await settle();
		expect(view.ids()).toEqual(['uploaded']);
	});
	it.each([{ items: [] }, { items: [{ kind: 'file', getAsFile: () => null }] }])('falls back to files when items yield no files (%j)', async ({ items }) => {
		const view = mount();
		mocks.upload.mockResolvedValue([driveFile('fallback')]);
		expect(paste(view, items, [clipboardFile()]).defaultPrevented).toBe(true);
		await settle();
		expect(mocks.upload).toHaveBeenCalledTimes(1);
		expect(view.ids()).toEqual(['fallback']);
	});
	it('blocks button and keyboard submit until every concurrent upload settles', async () => {
		const first = deferred<Misskey.entities.DriveFile[]>();
		const second = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const view = mount();
		setText(view);
		pasteFile(view);
		pasteFile(view);
		await settle();
		expect(view.send().disabled).toBe(true);
		keyboardSubmit(view);
		expect(mocks.api).not.toHaveBeenCalled();
		first.resolve([driveFile('one')]);
		await settle();
		expect(view.send().disabled).toBe(true);
		second.resolve([driveFile('two')]);
		await settle();
		expect(view.send().disabled).toBe(false);
		keyboardSubmit(view);
		await settle();
		expect(mocks.api).toHaveBeenCalledWith('notes/create', expect.objectContaining({ fileIds: ['one', 'two'] }));
	});
	it.each(['cancel', 'reject', 'throw'])('releases pending state on uploader %s', async outcome => {
		const upload = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockImplementation(() => { if (outcome === 'throw') throw new Error('load failed'); return upload.promise; });
		const view = mount();
		setText(view);
		pasteFile(view);
		if (outcome === 'reject') upload.reject(new Error('load failed'));
		else if (outcome === 'cancel') upload.resolve([]);
		await settle();
		expect(view.send().disabled).toBe(false);
		expect(view.ids()).toEqual([]);
	});
	it('deduplicates IDs within/between upload results and caps concurrent results at 16', async () => {
		const first = deferred<Misskey.entities.DriveFile[]>();
		const second = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const view = mount();
		pasteFile(view);
		pasteFile(view);
		first.resolve([driveFile('same'), driveFile('same'), ...Array.from({ length: 13 }, (_, i) => driveFile(`a${i}`))]);
		second.resolve([driveFile('same'), driveFile('b'), driveFile('b'), driveFile('c'), driveFile('overflow')]);
		await settle();
		expect(view.ids()).toEqual(['same', ...Array.from({ length: 13 }, (_, i) => `a${i}`), 'b', 'c']);
		expect(mocks.alert).toHaveBeenCalledWith({ type: 'warning', text: 'Limit 16' });
		pasteFile(view);
		expect(mocks.upload).toHaveBeenCalledTimes(2);
	});
	it('ignores an old upload after adopt without decrementing the new draft pending count', async () => {
		const old = deferred<Misskey.entities.DriveFile[]>();
		const current = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
		const view = mount();
		pasteFile(view);
		view.adopt({ channel: null, initialText: 'new draft' });
		pasteFile(view);
		old.resolve([driveFile('stale')]);
		await settle();
		expect(view.ids()).toEqual([]);
		expect(view.send().disabled).toBe(true);
		current.resolve([driveFile('current')]);
		await settle();
		expect(view.ids()).toEqual(['current']);
		expect(view.send().disabled).toBe(false);
	});
	it('ignores a late result after clear via cancel editing', async () => {
		const upload = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockReturnValue(upload.promise);
		const view = mount();
		view.adopt({ initialNote: { id: 'edit', text: 'edit', visibility: 'public', files: [] } as unknown as Misskey.entities.Note, updateMode: true });
		pasteFile(view);
		await settle();
		view.target.querySelector<HTMLButtonElement>('button[title="Cancel"]')!.click();
		setText(view, 'after clear');
		upload.resolve([driveFile('stale')]);
		await settle();
		expect(view.ids()).toEqual([]);
		expect(view.send().disabled).toBe(false);
	});
	it('ignores late results after unmount and cannot start saved menu actions', async () => {
		const upload = deferred<Misskey.entities.DriveFile[]>();
		mocks.upload.mockReturnValue(upload.promise);
		const view = mount();
		const action = attachmentAction(view, 1);
		pasteFile(view);
		const detachedModel = mocks.attachmentModels.at(-1)!;
		view.unmount();
		upload.resolve([driveFile('stale')]);
		await action();
		await settle();
		expect(mocks.drive).not.toHaveBeenCalled();
		expect(mocks.api).not.toHaveBeenCalled();
		expect(detachedModel).toEqual([]);
		expect(view.ids()).toEqual([]);
	});
	it.each([0, 1, 2])('ignores stale menu entry %s results without blocking submit', async index => {
		const upload = deferred<Misskey.entities.DriveFile[]>();
		mocks.pc.mockReturnValue(upload.promise);
		mocks.drive.mockReturnValue(upload.promise);
		mocks.url.mockImplementation(async () => (await upload.promise)[0]);
		const view = mount();
		setText(view);
		void attachmentAction(view, index)();
		await settle();
		expect(view.send().disabled).toBe(false);
		view.adopt({ channel: null });
		upload.resolve([driveFile('old-menu')]);
		await settle();
		expect(view.ids()).toEqual([]);
		expect(view.send().disabled).toBe(false);
	});
	it.each([0, 1, 2])('can submit when cancelled menu entry %s never settles', async index => {
		const neverSettles = new Promise<never>(() => {});
		mocks.pc.mockReturnValue(neverSettles);
		mocks.drive.mockReturnValue(neverSettles);
		mocks.url.mockReturnValue(neverSettles);
		const view = mount();
		setText(view);
		void attachmentAction(view, index)();
		await settle();
		expect(view.send().disabled).toBe(false);
		keyboardSubmit(view);
		await settle();
		expect(mocks.api).toHaveBeenCalledWith('notes/create', expect.objectContaining({ text: 'draft' }));
	});
	it('rejects a menu action saved before adopting another draft', async () => {
		const view = mount();
		const action = attachmentAction(view, 0);
		view.adopt({ channel: null });
		await action();
		expect(mocks.pc).not.toHaveBeenCalled();
	});
	it('blocks file paste during submit preflight and API sending while preserving text paste', async () => {
		const warning = deferred<{ canceled: boolean; result: string }>();
		const sending = deferred<{ createdNote: null }>();
		mocks.actions.mockReturnValue(warning.promise);
		mocks.api.mockReturnValue(sending.promise);
		const view = mount();
		view.adopt({ channel: null, initialFiles: [{ ...driveFile('no-alt'), comment: null }], initialText: 'body' });
		keyboardSubmit(view);
		await settle();
		expect(pasteFile(view).defaultPrevented).toBe(true);
		expect(paste(view, [{ kind: 'string' }]).defaultPrevented).toBe(false);
		keyboardSubmit(view);
		warning.resolve({ canceled: false, result: 'post' });
		await settle();
		pasteFile(view);
		expect(mocks.upload).not.toHaveBeenCalled();
		expect(mocks.api).toHaveBeenCalledTimes(1);
		sending.resolve({ createdNote: null });
		await settle();
	});
	it('blocks upload during plugin processing and countdown, then sends captured attachments', async () => {
		const plugin = deferred<unknown>();
		mocks.interruptors.push({ handler: () => plugin.promise });
		postSendDelayEnabled.value = true;
		const view = mount();
		setText(view);
		keyboardSubmit(view);
		await settle();
		pasteFile(view);
		expect(mocks.upload).not.toHaveBeenCalled();
		plugin.resolve({ text: 'draft', fileIds: ['captured'] });
		await settle();
		expect(view.send().dataset.state).toBe('countdown');
		pasteFile(view);
		expect(mocks.upload).not.toHaveBeenCalled();
		expect(mocks.api).not.toHaveBeenCalled();
		view.target.querySelector<HTMLButtonElement>('[data-send-now]')!.click();
		await settle();
		expect(mocks.api).toHaveBeenCalledWith('notes/create', expect.objectContaining({ fileIds: ['captured'] }));
	});
});

describe('UI S full composer handoff', () => {
	async function expand(view: ReturnType<typeof mount>) {
		await settle();
		const button = view.target.querySelector<HTMLButtonElement>('button[title="Full"]');
		expect(button).not.toBeNull();
		button!.click();
		await settle();
		return mocks.postDirect.mock.calls.at(-1)! as [PostFormProps, () => void];
	}

	it('retains the UI S draft when the full dialog closes without a successful posted event', async () => {
		const view = mount();
		view.adopt({ initialText: 'keep me', initialFiles: [driveFile('original')] });
		const [props] = await expand(view);
		expect(props.restoreDraft).toBe(false);
		expect(props.initialPoll).toBeNull();
		expect(props.initialReactionAcceptance).toBeNull();
		expect(view.input().value).toBe('keep me');
		expect(view.ids()).toEqual(['original']);
		// Mutations inside the full form operate on its copied input values.
		props.initialFiles![0].id = 'changed-inside-full';
		props.initialFiles!.push(driveFile('extra'));
		await settle();
		expect(view.ids()).toEqual(['original']);
	});

	it('clears the unchanged draft only after the full form reports success', async () => {
		const view = mount();
		view.adopt({ initialText: 'posted text', initialFiles: [driveFile('image')] });
		const [, posted] = await expand(view);
		expect(view.input().value).toBe('posted text');
		posted();
		await settle();
		expect(view.input().value).toBe('');
		expect(view.ids()).toEqual([]);
	});

	it('preserves newer input or a different context after an earlier full form succeeds', async () => {
		const view = mount();
		view.adopt({ initialText: 'first draft' });
		const [, firstPosted] = await expand(view);
		setText(view, 'new input');
		firstPosted();
		await settle();
		expect(view.input().value).toBe('new input');
		const [, secondPosted] = await expand(view);
		view.adopt({ initialText: 'different draft', reply: { id: 'reply', user: { username: 'author' } } as Misskey.entities.Note });
		secondPosted();
		await settle();
		expect(view.input().value).toContain('different draft');
	});
});

describe('automatic composer drafts', () => {
	it('restores text and attachments and separates deck columns', async () => {
		const first = mount('uiS:composer:deck:a');
		first.adopt({ initialText: 'saved input', initialFiles: [driveFile('saved')] });
		await settle();
		first.unmount();
		expect(mount('uiS:composer:deck:b').input().value).toBe('');
		const restored = mount('uiS:composer:deck:a');
		await settle();
		expect(restored.input().value).toBe('saved input');
		expect(restored.ids()).toEqual(['saved']);
	});
	it('clears a successful post and resumes saving the next draft', async () => {
		const first = mount();
		first.adopt({ initialText: 'first draft' });
		await settle();
		first.send().click();
		await settle();
		expect(JSON.parse(mocks.storage.get('hataFormDrafts:me')!)).toEqual({});
		first.adopt({ initialText: 'next draft' });
		await settle();
		first.unmount();
		expect(mount().input().value).toBe('next draft');
	});
});
