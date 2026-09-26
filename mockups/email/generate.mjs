/* SPDX-License-Identifier: AGPL-3.0-only */
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHataskeyEmail } from '../../packages/backend/src/core/email/hataskey-email-content.ts';
import { renderHataskeyEmail } from '../../packages/backend/src/core/email/render-hataskey-email.ts';
import { brand, fixtures } from './fixtures.mjs';

const destination = new URL('./generated/', import.meta.url);
await mkdir(destination, { recursive: true });
await mkdir(new URL('./assets/', import.meta.url), { recursive: true });
await copyFile(new URL('../../packages/frontend/assets/Righteous-Regular.woff2', import.meta.url), new URL('./assets/Righteous-Regular.woff2', import.meta.url));
await copyFile(new URL('../../packages/frontend/assets/fonts/Righteous-OFL.txt', import.meta.url), new URL('./assets/Righteous-OFL.txt', import.meta.url));
const previewIcon = `data:image/svg+xml;base64,${(await readFile(new URL('./server-icon.svg', import.meta.url))).toString('base64')}`;

const cases = [];
for (const { input, brand: customBrand, ...meta } of fixtures) {
	const variants = {};
	for (const lang of ['ja', 'en']) {
		variants[lang] = {};
		const message = createHataskeyEmail(input, customBrand ?? brand, lang);
		for (const theme of ['light', 'dark']) {
			const rendered = renderHataskeyEmail(message, customBrand ?? brand, { theme });
			// Only the fictional default icon is substituted for offline visual review.
			// Downloadable delivery HTML retains the HTTP(S) URL checked by the renderer.
			const previewHtml = rendered.html.replace(`src="${brand.iconUrl}"`, `src="${previewIcon}"`);
			variants[lang][theme] = { ...rendered, previewHtml };
			await writeFile(new URL(`${meta.id}.${lang}.${theme}.html`, destination), rendered.html);
		}
		await writeFile(new URL(`${meta.id}.${lang}.txt`, destination), variants[lang].light.text);
	}
	cases.push({ ...meta, variants });
}
await writeFile(new URL('catalog.json', destination), JSON.stringify({ cases }, null, 2));
console.log(`Generated ${cases.length} cases × 2 languages × 2 themes in ${fileURLToPath(destination)}`);
