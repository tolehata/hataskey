/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * HataSNSCordUI の案内文と実績IDを一か所で変更できるようにする。
 */

import { i18n } from '@/i18n.js';

export const HATACORDING_TUTORIAL_ACHIEVEMENT_ID = 'hatacordingUiTutorial' as const;

const tutorial = i18n.ts._hata._hatacordingUi._tutorial;

export const HATACORDING_TUTORIAL_COPY = {
	title: tutorial.title,
	lead: tutorial.lead,
	steps: [
		{
			title: tutorial.step1Title,
			body: tutorial.step1Body,
		},
		{
			title: tutorial.step2Title,
			body: tutorial.step2Body,
		},
		{
			title: tutorial.step3Title,
			body: tutorial.step3Body,
		},
		{
			title: tutorial.step4Title,
			body: tutorial.step4Body,
		},
		{
			title: tutorial.step5Title,
			body: tutorial.step5Body,
		},
	],
	previous: tutorial.previous,
	next: tutorial.next,
	start: tutorial.start,
	required: tutorial.required,
} as const;
