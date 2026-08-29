/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import type { Component } from 'vue';
import HatacordingLoaderIcon from '@/components/hatacording-icons/HatacordingLoaderIcon.vue';
import { withInteractiveParentMotion } from '@/components/hatacording-icons/with-interactive-parent-motion.js';

const { mockPrefer } = vi.hoisted(() => ({ mockPrefer: { s: { animation: true } } }));
vi.mock('@/preferences.js', () => ({ prefer: mockPrefer }));

const animatedIconModules = import.meta.glob<{ default: Component }>([
	'../components/hatacording-icons/*Icon.vue',
	'!../components/hatacording-icons/HatacordingLoaderIcon.vue',
	'!../components/hatacording-icons/HatacordingMascotIcon.vue',
], { eager: true });

const frontendRoot = resolve(process.cwd());
const repositoryRoot = resolve(frontendRoot, '../..');
const iconAssetsRoot = resolve(frontendRoot, 'assets/hatacording/icons');
const assetNotice = readFileSync(resolve(frontendRoot, 'assets/hatacording/NOTICE.md'), 'utf8');
const lucideLicense = readFileSync(resolve(frontendRoot, 'assets/licenses/LUCIDE.txt'), 'utf8');
const animatedLucideLicense = readFileSync(resolve(frontendRoot, 'assets/licenses/LUCIDE_ANIMATED.txt'), 'utf8');
const motionLicense = readFileSync(resolve(frontendRoot, 'assets/licenses/MOTION_V.txt'), 'utf8');
const animatedIconsRoot = resolve(frontendRoot, 'src/components/hatacording-icons');
const animatedIconIndex = readFileSync(resolve(animatedIconsRoot, 'index.ts'), 'utf8');
const animatedIconStyles = readFileSync(resolve(animatedIconsRoot, 'hatacording-icons.css'), 'utf8');
const pageSource = readFileSync(resolve(frontendRoot, 'src/pages/hatacording-ui.vue'), 'utf8');
const settingsSource = readFileSync(resolve(frontendRoot, 'src/components/HatacordingUiSettings.vue'), 'utf8');
const visibilitySource = readFileSync(resolve(frontendRoot, 'src/components/HatacordingVisibilityPicker.vue'), 'utf8');
const frontendPackage = readFileSync(resolve(frontendRoot, 'package.json'), 'utf8');
const fontNotice = readFileSync(resolve(frontendRoot, 'assets/fonts/NOTICE.md'), 'utf8');
const topLevelLicense = readFileSync(resolve(repositoryRoot, 'LICENSE'), 'utf8');

function webpCanvasSize(buffer: Buffer): { width: number; height: number } {
	const chunkOffset = buffer.indexOf(Buffer.from('VP8X'));
	expect(chunkOffset).toBeGreaterThanOrEqual(0);
	return {
		width: 1 + buffer.readUIntLE(chunkOffset + 12, 3),
		height: 1 + buffer.readUIntLE(chunkOffset + 15, 3),
	};
}

describe('HataSNSCordUIの保管アイコンとLucide Animatedライセンス', () => {
	test('生成済みWebPは67枚を保管し、実行UIからは参照しない', () => {
		const files = readdirSync(iconAssetsRoot).filter(file => file.endsWith('.webp')).sort();
		expect(files).toHaveLength(67);
		for (const file of files) {
			const buffer = readFileSync(resolve(iconAssetsRoot, file));
			expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
			expect(buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
			expect(buffer.includes(Buffer.from('ALPH'))).toBe(true);
			expect(webpCanvasSize(buffer)).toEqual({ width: 256, height: 256 });
		}
		for (const source of [pageSource, settingsSource, visibilitySource]) {
			expect(source).not.toContain('/client-assets/hatacording/icons/');
			expect(source).not.toContain('HatacordingNavigationIcon');
			expect(source).not.toContain('hatacordingNavigationIcon');
		}
	});

	test('保管アセットNOTICEはライセンスだけを記載する', () => {
		expect(assetNotice).toContain('License: AGPL-3.0-only.');
		expect(assetNotice).not.toMatch(/ImageGen|generated source|SHA-256|prompt|generation/i);
		expect(topLevelLicense).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
	});

	test('LucideとFeatherのライセンス本文を配布用ファイルへ収録する', () => {
		expect(frontendPackage).toContain('"@lucide/vue"');
		expect(frontendPackage).toContain('"motion-v": "2.3.0"');
		expect(lucideLicense).toContain('ISC License');
		expect(lucideLicense).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
		expect(lucideLicense).toContain('provided that the above\ncopyright notice and this permission notice appear in all copies');
		expect(lucideLicense).toContain('The MIT License (MIT) (for the icons listed above)');
		expect(lucideLicense).toContain('Copyright (c) 2013-present Cole Bemis');
		expect(animatedLucideLicense).toContain('https://github.com/pqoqubbw/icons');
		expect(animatedLucideLicense).toContain('072c38b1b04ea738d90a084485ccaad4b890ddca');
		expect(animatedLucideLicense).toContain('Copyright (c) 2024-2026 pqoqubbw');
		expect(animatedLucideLicense).toContain('MIT License');
		expect(motionLicense).toContain('Copyright (c) 2024 Rick Huang');
		expect(motionLicense).toContain('Copyright (c) 2018 Framer B.V.');
		expect(motionLicense).toContain('Copyright (c) 2024 Motion B.V.');
		expect(motionLicense).toContain('Copyright (c) 2019-PRESENT Anthony Fu');
		expect(motionLicense).toContain('Copyright (c) 2018 Popmotion');
		expect(fontNotice).toContain('../licenses/LUCIDE_ANIMATED.txt');
		expect(fontNotice).toContain('../licenses/LUCIDE.txt');
		expect(fontNotice).toContain('../licenses/MOTION_V.txt');
	});

	test('HataSNSCordUIはVue移植コンポーネントと低減モーション境界を使う', () => {
		const iconComponents = readdirSync(animatedIconsRoot)
			.filter(file => file.endsWith('Icon.vue') && !['HatacordingLoaderIcon.vue', 'HatacordingMascotIcon.vue'].includes(file));
		expect(iconComponents).toHaveLength(51);
		for (const file of iconComponents) {
			const source = readFileSync(resolve(animatedIconsRoot, file), 'utf8');
			expect(source).toContain('SPDX-FileCopyrightText: 2024-2026 pqoqubbw');
			expect(source).toContain('SPDX-License-Identifier: MIT');
			expect(source).toContain('<span data-hatacording-animated-icon');
			expect(source).not.toContain('<div data-hatacording-animated-icon');
			expect(source).toMatch(/from ['"]motion-v['"]/);
		}
		expect(animatedIconIndex).toContain("import './hatacording-icons.css'");
		expect(animatedIconStyles).toContain('[data-animation=\'false\'] :is([data-hatacording-animated-icon-host], [data-hatacording-animated-icon])');
		expect(animatedIconStyles).toContain('@media (prefers-reduced-motion: reduce)');
		expect(animatedIconStyles).toContain('pointer-events: none');
		expect(animatedIconIndex).toContain('export const Star = animated(SparklesIcon)');
		expect(animatedIconIndex).toContain('withInteractiveParentMotion');
		expect(pageSource).toContain("from '@/components/hatacording-icons/index.js'");
		expect(pageSource).toContain('data-hatacording-animation\', animationEnabled.value ? \'true\' : \'false\'');
		expect(pageSource).not.toContain("from '@/utility/hata-icon-motion.js'");
		const fallbackBlock = animatedIconIndex.match(/export \{([\s\S]*?)\} from '@lucide\/vue';/)?.[1];
		expect(fallbackBlock).toBeDefined();
		expect(fallbackBlock!.split('\n').filter(line => /^\t[A-Z]/.test(line))).toHaveLength(23);
		expect(fallbackBlock).not.toContain('\tStar,');
	});

	test('操作面全体のhover・focusから上流アイコンAPIを呼び、低減モーションでは呼ばない', async () => {
		const startAnimation = vi.fn();
		const stopAnimation = vi.fn();
		const FakeAnimatedIcon = defineComponent({
			setup(_, { expose }) {
				expose({ startAnimation, stopAnimation });
				return () => h('span', { 'data-hatacording-animated-icon': '', 'aria-hidden': 'true' }, [h('svg')]);
			},
		});
		const WrappedIcon = withInteractiveParentMotion(FakeAnimatedIcon);
		const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
		let reducedMotion = false;
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: vi.fn(() => ({
				matches: reducedMotion,
				media: '(prefers-reduced-motion: reduce)',
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			} satisfies MediaQueryList)),
		});
		const container = window.document.createElement('div');
		const app = createApp(defineComponent({
			setup() {
				return () => h('button', { type: 'button' }, [h(WrappedIcon, { size: 18 })]);
			},
		}));
		window.document.body.appendChild(container);

		try {
			app.mount(container);
			await nextTick();
			const button = container.querySelector('button');
			const host = container.querySelector('[data-hatacording-animated-icon-host]');
			expect(button).not.toBeNull();
			expect(host).not.toBeNull();
			button!.dispatchEvent(new MouseEvent('mouseenter'));
			expect(startAnimation).toHaveBeenCalledTimes(1);
			button!.dispatchEvent(new FocusEvent('focusin'));
			expect(startAnimation).toHaveBeenCalledTimes(2);
			button!.dispatchEvent(new MouseEvent('mouseleave'));
			expect(stopAnimation).toHaveBeenCalledTimes(1);

			reducedMotion = true;
			button!.dispatchEvent(new MouseEvent('mouseenter'));
			expect(startAnimation).toHaveBeenCalledTimes(2);
			expect(stopAnimation).toHaveBeenCalledTimes(2);
		} finally {
			app.unmount();
			container.remove();
			if (originalMatchMedia == null) delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
			else Object.defineProperty(window, 'matchMedia', originalMatchMedia);
		}
	});

	test('移植アイコン全件はVueで実際にSVGとして描画できる', () => {
		const iconComponents = readdirSync(animatedIconsRoot)
			.filter(file => file.endsWith('Icon.vue') && !['HatacordingLoaderIcon.vue', 'HatacordingMascotIcon.vue'].includes(file))
			.sort();
		for (const file of iconComponents) {
			const moduleEntry = Object.entries(animatedIconModules).find(([path]) => path.endsWith(`/${file}`));
			expect(moduleEntry, `${file} を実行時モジュールとして解決できる`).toBeDefined();
			const container = window.document.createElement('div');
			const app = createApp(moduleEntry![1].default, { size: 18 });
			window.document.body.appendChild(container);
			try {
				app.mount(container);
				const root = container.querySelector('span[data-hatacording-animated-icon]');
				const svg = root?.querySelector('svg');
				expect(root?.getAttribute('aria-hidden'), file).toBe('true');
				expect(svg?.getAttribute('focusable'), file).toBe('false');
				expect(svg?.getAttribute('width'), file).toBe('18');
				expect(svg?.getAttribute('height'), file).toBe('18');
			} finally {
				app.unmount();
				container.remove();
			}
		}
	});

	test('ローダーも描画でき、アプリ設定と低減モーションでは自動回転を始めない', async () => {
		const originalAnimation = mockPrefer.s.animation;
		const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
		const mountedLoaders: Array<{ app: ReturnType<typeof createApp>; container: HTMLElement }> = [];
		const mountLoader = async (animation: boolean, reducedMotion: boolean) => {
			mockPrefer.s.animation = animation;
			Object.defineProperty(window, 'matchMedia', {
				configurable: true,
				value: vi.fn(() => ({
					matches: reducedMotion,
					media: '(prefers-reduced-motion: reduce)',
					onchange: null,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					addListener: vi.fn(),
					removeListener: vi.fn(),
					dispatchEvent: vi.fn(),
				} satisfies MediaQueryList)),
			});
			const container = window.document.createElement('div');
			const app = createApp(HatacordingLoaderIcon, { size: 19 });
			window.document.body.appendChild(container);
			app.mount(container);
			await nextTick();
			mountedLoaders.push({ app, container });
			return { app, container, root: container.querySelector('span[data-hatacording-animated-icon]') };
		};

		try {
			const appDisabled = await mountLoader(false, false);
			expect(appDisabled.root?.getAttribute('data-hatacording-loader-animation')).toBe('stopped');
			expect(appDisabled.root?.querySelector('svg')?.getAttribute('width')).toBe('19');

			const reduced = await mountLoader(true, true);
			expect(reduced.root?.getAttribute('data-hatacording-loader-animation')).toBe('stopped');

			const enabled = await mountLoader(true, false);
			expect(enabled.root?.getAttribute('data-hatacording-loader-animation')).toBe('running');
		} finally {
			for (const { app, container } of mountedLoaders) {
				app.unmount();
				container.remove();
			}
			mockPrefer.s.animation = originalAnimation;
			if (originalMatchMedia == null) delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
			else Object.defineProperty(window, 'matchMedia', originalMatchMedia);
		}
	});
});
