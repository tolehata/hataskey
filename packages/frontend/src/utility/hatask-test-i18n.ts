/*
 * SPDX-FileCopyrightText: Tolehata
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { I18n } from '@@/js/i18n.js';
import type { Locale } from '../../../../locales/index.js';

/** Test helper: exercise formatters against the checked-in catalogs. */
export function createTestHataskI18n(language = 'ja-JP'): I18n<Locale> {
	const path = resolve(process.cwd(), '../../locales', `${language}.yml`);
	return new I18n(load(readFileSync(path, 'utf8')) as Locale);
}
