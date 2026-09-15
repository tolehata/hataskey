<!--
SPDX-FileCopyrightText: Tolehata and hatasaba-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<section ref="rootEl" :class="$style.page" :data-theme="theme" :data-mode="mode" :data-motion="animations ? 'on' : 'off'" data-hatask-support aria-label="支援情報" :aria-busy="loading">
	<p v-if="loading" :class="$style.empty" role="status">支援情報を読み込んでいます</p>
	<div v-else-if="error" :class="$style.empty" role="alert"><p>支援情報を読み込めませんでした</p><button type="button" :class="$style.secondaryButton" @click="load">再試行</button></div>
	<div v-else-if="!data?.configured || !data.settings" :class="$style.empty" data-section="unconfigured-support"><p>このサーバーでは支援情報がありません。<br>また、後ほどご確認ください</p></div>
	<template v-else>
		<header :class="$style.heading"><div><div :class="$style.kicker">SUPPORT / <span>{{ instance.name }}</span></div><h2>支援情報</h2><p>この場所を、これからも。</p></div></header>
		<section v-if="data.settings.bannerVisible" :class="$style.hero" aria-label="ご支援への感謝" data-section="thanks-banner">
			<div :class="$style.heroCopy"><div :class="$style.eyebrow">THANK YOU FOR YOUR SUPPORT</div><h3 :class="$style.heroTitle" :data-default-title="defaultBannerTitle"><template v-if="defaultBannerTitle"><span :class="$style.heroTitlePart">ご支援</span><wbr><span :class="$style.heroTitlePart">ありがとうございます！</span></template><template v-else>{{ data.settings.bannerTitle }}</template></h3><p :class="$style.heroMessage">{{ data.settings.bannerMessage }}</p></div>
			<div :class="$style.heroArt" aria-hidden="true"><img v-if="theme === 'hatakyu'" :src="heartHands" :class="$style.heroIllustration" alt="" width="168" height="168"><i v-else class="ti ti-heart-handshake" :class="$style.heroMark"></i></div>
		</section>
		<div :class="$style.supportGrid">
			<div :class="$style.primary">
				<section v-if="data.isSupporter" :class="$style.supportStatus" data-section="support-status" :data-pending="pendingBenefits || !benefits.length">
					<div :class="$style.statusLabel"><i class="ti ti-rosette-discount-check" aria-hidden="true"></i>管理者による支援確認済み</div><h3>{{ pendingBenefits || !benefits.length ? 'ご支援を確認しています' : '支援特典が有効になっています' }}</h3><p :class="$style.lede">{{ supporterStatusCopy }}</p>
				</section>
				<section ref="benefitPanelEl" :class="$style.panel" :data-section="data.isSupporter ? 'active-benefits' : 'available-benefits'" :data-disclosure="benefits.length > 3" :data-compact="compact" :data-expanded="isExpanded">
					<h3 :class="$style.sectionTitle"><i :class="data.isSupporter ? 'ti ti-circle-check' : 'ti ti-sparkles'" aria-hidden="true"></i>{{ data.isSupporter ? 'いま使える支援特典' : '支援によって利用できる機能' }}</h3>
					<p :class="$style.lede">{{ data.isSupporter ? 'あなたのアカウントで現在有効な内容です。\n設定の反映状況も、特典ごとに確認できます' : '管理者が案内している特典です。\n利用条件や反映の時期は、支援先の案内をご確認ください' }}</p>
					<div v-if="!benefits.length" :class="$style.empty"><i class="ti ti-list-details" aria-hidden="true"></i><h4>特典の案内は準備中です</h4><p>掲載内容が決まるまでお待ちください</p></div>
					<template v-else>
						<div :class="$style.benefitViewport" :style="compact && benefits.length > 3 && benefitHeight !== null ? { '--benefit-height': `${benefitHeight}px` } : undefined">
							<div :id="benefitListId" ref="benefitGridEl" :class="$style.benefitGrid">
								<article v-for="(benefit, index) in benefits" :key="benefit.key" :class="$style.benefitCard" data-benefit-card :data-policy-key="benefit.key" :data-value-source="benefit.valueSource" :data-available="data.isSupporter ? benefit.reflected : undefined" :inert="!isExpanded && index >= 3" :aria-hidden="!isExpanded && index >= 3 ? true : undefined">
									<h4 :class="$style.benefitName"><i :class="`ti ti-${benefit.icon}`" aria-hidden="true"></i><span :class="$style.benefitNameCopy"><template v-if="benefit.titleLines.length > 1"><span v-for="line in benefit.titleLines" :key="line" :class="$style.benefitNameLine" :style="{ '--title-em': supportTextWidthBudget(line) }">{{ line }}</span></template><template v-else>{{ benefit.title }}</template></span></h4>
									<div :class="$style.valueLabel">{{ benefit.valueLabel }}</div>
									<div :class="$style.valueWrap"><div :class="$style.value" :style="{ '--value-em': supportTextWidthBudget(benefit.valueText) }" :data-baseline-value="benefit.promoteBaseline ? benefit.key : undefined">{{ benefit.valueText }}</div></div>
									<small v-if="benefit.condition" :class="$style.condition">{{ benefit.condition }}</small>
									<dl v-if="benefit.comparisons.length" :class="$style.comparison" aria-label="利用内容の比較"><div v-for="comparison in benefit.comparisons" :key="comparison.kind" :data-emphasized="comparison.emphasized"><dt>{{ comparison.label }}</dt><dd :data-baseline-value="comparison.kind === 'baseline' ? benefit.key : undefined" :data-offered-value="comparison.kind === 'offered' ? benefit.key : undefined">{{ comparison.text }}</dd><dd v-if="comparison.condition"><small :class="$style.condition">{{ comparison.condition }}</small></dd></div></dl>
									<p :class="$style.benefitDescription">{{ benefit.description }}</p>
									<div v-if="data.isSupporter" :class="$style.benefitStatus"><i :class="benefit.reflected ? 'ti ti-circle-check' : 'ti ti-clock'" aria-hidden="true"></i>{{ benefit.reflected ? benefit.current.available ? '利用できます' : '設定が反映されています' : '特典の設定が未反映です' }}</div>
								</article>
							</div>
						</div>
						<button v-if="compact && benefits.length > 3" type="button" :class="$style.secondaryButton" data-benefit-toggle :aria-controls="benefitListId" :aria-expanded="isExpanded" @click="toggleBenefits"><i :class="expanded ? 'ti ti-arrow-up' : 'ti ti-arrow-down'" aria-hidden="true"></i>{{ expanded ? '閉じる' : '支援特典をもっとみる' }}</button>
					</template>
				</section>
				<section :class="$style.panel" data-section="supporters" :aria-busy="supportersLoading">
					<h3 :class="$style.sectionTitle"><i class="ti ti-users" aria-hidden="true"></i>支えてくださるみなさん<span :class="$style.supporterCount">{{ supporterCount }}<small> 人</small></span></h3><p :class="$style.lede">ご支援、本当にありがとうございます</p>
					<div v-if="supporters.length" :class="$style.supporterList"><div v-for="user in supporters" :key="user.id" :class="$style.supporterCard"><MkAvatar :user="user" :class="$style.avatar"/><MkA :to="`/@${user.username}`" :class="$style.supporterWho"><MkUserName :user="user" :class="$style.supporterName"/><small :class="$style.supporterHandle">@{{ user.username }}</small></MkA></div></div>
					<p v-if="supportersLoading" :class="$style.empty" role="status">支援者を読み込んでいます</p>
					<div v-else-if="supportersError" :class="$style.empty" role="alert"><p>支援者を読み込めませんでした</p><button type="button" :class="$style.secondaryButton" @click="loadSupporters">再試行</button></div>
					<div v-else-if="!supporters.length" :class="$style.empty"><i class="ti ti-users" aria-hidden="true"></i><h4>支援者の掲載はまだありません</h4><p>管理者が確認・登録したローカルユーザーを、こちらに表示します</p></div>
					<button v-if="hasMoreSupporters && !supportersError" type="button" :class="$style.secondaryButton" :disabled="supportersLoading" @click="loadSupporters">支援者をもっとみる</button>
				</section>
			</div>
			<aside :class="$style.secondary" aria-label="支援先とご案内">
				<section v-if="data.isSupporter" :class="$style.panel" data-section="cancel-guidance"><h3 :class="$style.sectionTitle"><i class="ti ti-receipt" aria-hidden="true"></i>支援の停止・変更について</h3><p :class="$style.lede">継続的な支援を停止・変更する場合は、支援したプラットフォームで手続きするか、サーバー管理者へご連絡ください。Hatask内では停止手続きはできません</p><a v-if="manageUrl" :class="$style.secondaryButton" :href="manageUrl" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link" aria-hidden="true"></i>支援先で確認する</a><p v-else :class="$style.smallCopy">支援先のURLが未設定です。支援に使用したプラットフォームをご確認ください</p></section>
				<section v-else :class="$style.panel" data-section="support-destination"><h3 :class="$style.sectionTitle"><i class="ti ti-heart-handshake" aria-hidden="true"></i>サーバーを支援する</h3><p :class="$style.lede">{{ data.settings.intro }}</p><template v-if="supportUrl"><div :class="$style.linkCard"><strong>{{ data.settings.platform }}</strong><div :class="$style.supportUrl">{{ supportUrl }}</div></div><a :class="$style.primaryButton" :href="supportUrl" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link" aria-hidden="true"></i>支援先を確認する</a></template><div v-else :class="$style.empty"><i class="ti ti-link" aria-hidden="true"></i><h4>支援先はまだ設定されていません</h4><p>管理者からの案内をお待ちください</p></div><ol :class="$style.steps"><li><div><strong>支援先の案内を確認</strong><span>利用条件や支払い方法をご確認ください</span></div></li><li><div><strong>管理者が支援を確認</strong><span>支援の確認・反映には時間がかかる場合があります</span></div></li><li><div><strong>この画面で特典を確認</strong><span>支援確認後は、あなたの利用状況に合った表示になります</span></div></li></ol></section>
			</aside>
		</div>
	</template>
</section>
</template>

<script lang="ts" setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import type { Endpoints } from 'cherrypick-js';
import { instance } from '@/instance.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { hatakyuAssetUrl } from '@/utility/hatakyu-assets.js';
import { formatSupportSnapshot, supportBenefitHeading, supportDisclosureHeights, supportHttpsUrl, supportPolicyDefinition, supportSnapshotCondition, supportTextWidthBudget } from '@/utility/hatask-support.js';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkUserName from '@/components/global/MkUserName.vue';
import MkA from '@/components/global/MkA.vue';

const props = withDefaults(defineProps<{ theme: string; mode: 'light' | 'dark'; animations?: boolean }>(), { animations: true });
type SupportData = Endpoints['hatask/support/show']['res'];
type SupporterPage = Endpoints['hatask/support/supporters']['res'];
const data = ref<SupportData | null>(null);
const loading = ref(true);
const error = ref(false);
const supporters = ref<SupporterPage['users']>([]);
const supportersLoading = ref(false);
const supportersError = ref(false);
const hasMoreSupporters = ref(false);
const supporterCount = ref(0);
let supporterOffset = 0;
let generation = 0;
let active = true;
let disposed = false;
const rootEl = useTemplateRef('rootEl');
const benefitPanelEl = useTemplateRef('benefitPanelEl');
const benefitGridEl = useTemplateRef('benefitGridEl');
const benefitListId = `hatask-support-benefits-${useId()}`;
const compact = ref(false);
const expanded = ref(false);
const benefitHeight = ref<number | null>(null);
const isExpanded = computed(() => !compact.value || expanded.value || benefits.value.length <= 3);
const heartHands = computed(() => hatakyuAssetUrl('heartHands'));
const defaultBannerTitle = computed(() => data.value?.settings?.bannerTitle === 'ご支援ありがとうございます！');
const supportUrl = computed(() => supportHttpsUrl(data.value?.settings?.url));
const manageUrl = computed(() => supportHttpsUrl(data.value?.settings?.manageUrl) ?? supportUrl.value);
const benefits = computed(() => (data.value?.benefits ?? []).map(benefit => {
	const registered = data.value?.isSupporter === true;
	const emphasizeBaseline = benefit.showBaseline && benefit.baseline?.available === true;
	const promoteBaseline = !registered && emphasizeBaseline;
	const primary = registered ? benefit.current : promoteBaseline ? benefit.baseline : benefit.offered;
	const policy = supportPolicyDefinition(benefit.key);
	const valueText = formatSupportSnapshot(benefit.key, primary);
	const valueLabel = registered ? '現在の設定' : promoteBaseline ? policy?.type === 'boolean' ? '支援なし' : '支援なしでも利用できます' : '支援特典';
	const { baseline, offered } = benefit;
	// Only collapse a known, identical comparison; matching formatted text alone can hide different limits or conditions.
	const sameAsBaseline = promoteBaseline && valueText !== '未設定' && baseline != null && offered != null
		&& (['value', 'available', 'unlimited', 'condition', 'rateMultiplier'] as const).every(key => baseline[key] === offered[key]);
	const comparisons: { kind: 'baseline' | 'offered'; emphasized: boolean; label: string; text: string; condition: string | null }[] = [];
	if (benefit.showBaseline && benefit.baseline && !promoteBaseline) comparisons.push({ kind: 'baseline', emphasized: emphasizeBaseline, label: emphasizeBaseline ? '支援なしでも利用できます' : '支援なし', text: formatSupportSnapshot(benefit.key, benefit.baseline), condition: supportSnapshotCondition(benefit.baseline) });
	if (registered || (promoteBaseline && !sameAsBaseline)) comparisons.push({ kind: 'offered', emphasized: false, label: '支援特典', text: formatSupportSnapshot(benefit.key, benefit.offered), condition: supportSnapshotCondition(benefit.offered) });
	return { ...benefit, promoteBaseline, comparisons, icon: policy?.icon ?? 'sparkles', titleLines: supportBenefitHeading(benefit.key, benefit.title), valueSource: registered ? 'current' : promoteBaseline ? 'baseline' : 'offered', valueText, valueLabel, condition: supportSnapshotCondition(primary) };
}));
const pendingBenefits = computed(() => benefits.value.some(benefit => !benefit.reflected));
const supporterStatusCopy = computed(() => !benefits.value.length ? 'サーバー管理者が、\nあなたからの支援を確認しています。\n特典の案内はまだ設定されていません。\n詳しくは管理者へご確認ください' : pendingBenefits.value ? 'サーバー管理者が、\nあなたからの支援を確認しています。\n一部の特典は設定がまだ反映されていません。\n現在利用できる内容を下でご確認ください' : 'サーバー管理者が、\nあなたからの支援を確認しました。\n現在ご利用いただける支援特典を、\n下にまとめています');

async function load(): Promise<void> {
	if (!active || disposed) return;
	const request = ++generation;
	loading.value = true;
	error.value = false;
	data.value = null;
	supporters.value = [];
	supportersLoading.value = false;
	supportersError.value = false;
	hasMoreSupporters.value = false;
	supporterOffset = 0;
	expanded.value = false;
	try {
		const result = await misskeyApi('hatask/support/show', {});
		if (request !== generation || disposed) return;
		data.value = result;
		supporterCount.value = result.supporterCount;
		if (result.configured && result.settings) void loadSupporters();
	} catch {
		if (request === generation && !disposed) error.value = true;
	} finally {
		if (request === generation && !disposed) loading.value = false;
	}
}

async function loadSupporters(): Promise<void> {
	if (supportersLoading.value || !active || disposed || !data.value?.configured) return;
	const request = generation;
	supportersLoading.value = true;
	supportersError.value = false;
	try {
		const result = await misskeyApi('hatask/support/supporters', { offset: supporterOffset, limit: 30 });
		if (request !== generation || disposed) return;
		const known = new Set(supporters.value.map(user => user.id));
		supporters.value.push(...result.users.filter(user => user.host == null && !known.has(user.id)));
		supporterOffset += result.users.length;
		supporterCount.value = result.total;
		hasMoreSupporters.value = result.hasMore && result.users.length > 0;
	} catch {
		if (request === generation && !disposed) supportersError.value = true;
	} finally {
		if (request === generation && !disposed) supportersLoading.value = false;
	}
}

let observer: ResizeObserver | undefined;
let lastRootWidth = -1;
let lastGridWidth = -1;
let lastGridHeight = -1;

async function updateMeasurements(): Promise<void> {
	if (disposed || !active) return;
	const width = rootEl.value?.getBoundingClientRect().width ?? 0;
	if (width > 0) compact.value = width <= 599;
	await nextTick();
	if (disposed || !active) return;
	const grid = benefitGridEl.value;
	if (!grid || benefits.value.length <= 3 || !compact.value) { benefitHeight.value = null; return; }
	const third = grid.querySelectorAll<HTMLElement>('[data-benefit-card]')[2];
	if (!third) return;
	const gridBox = grid.getBoundingClientRect();
	if (gridBox.height <= 0) return;
	const heights = supportDisclosureHeights(gridBox.height, third.getBoundingClientRect().bottom - gridBox.top);
	benefitHeight.value = expanded.value ? heights.expanded : heights.collapsed;
}

function observeLayout(): void {
	observer?.disconnect();
	lastRootWidth = -1;
	lastGridWidth = -1;
	lastGridHeight = -1;
	if (typeof ResizeObserver !== 'undefined') {
		observer = new ResizeObserver(entries => {
			let changed = false;
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (entry.target === rootEl.value) {
					changed ||= width !== lastRootWidth;
					lastRootWidth = width;
				} else {
					changed ||= width !== lastGridWidth || height !== lastGridHeight;
					lastGridWidth = width;
					lastGridHeight = height;
				}
			}
			if (changed) void updateMeasurements();
		});
		if (rootEl.value) observer.observe(rootEl.value);
		if (benefitGridEl.value) observer.observe(benefitGridEl.value);
	}
	void updateMeasurements();
}

function toggleBenefits(): void {
	const closing = expanded.value;
	expanded.value = !expanded.value;
	if (closing && benefitPanelEl.value && benefitPanelEl.value.getBoundingClientRect().top < 0) {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		benefitPanelEl.value.scrollIntoView({ block: 'start', behavior: props.animations && !reducedMotion ? 'smooth' : 'instant' });
	}
}

watch([rootEl, benefitGridEl], observeLayout, { flush: 'post' });
watch([expanded, () => props.theme, () => props.mode, benefits], () => void updateMeasurements(), { flush: 'post' });
const onResize = () => void updateMeasurements();
onMounted(() => { void load(); window.addEventListener('resize', onResize); });
onDeactivated(() => { active = false; generation++; observer?.disconnect(); });
onActivated(() => { if (!active) { active = true; observeLayout(); void load(); } });
onBeforeUnmount(() => { disposed = true; generation++; observer?.disconnect(); window.removeEventListener('resize', onResize); });
</script>

<style module lang="scss">
.page {
	--support-panel: var(--surface);
	--support-line: var(--rule);
	--support-muted: var(--fg-2);
	--support-accent: var(--accent-ink, var(--accent));
	--support-radius: var(--card-radius);
	--support-border: var(--card-border);
	--support-shadow: var(--card-shadow);
	--support-success: color-mix(in srgb, var(--MI_THEME-success, #6ec072) 45%, var(--fg));
	--support-success-bg: color-mix(in srgb, var(--MI_THEME-success, #6ec072) 12%, var(--support-panel));
	--support-info-bg: color-mix(in srgb, var(--accent) 8%, var(--support-panel));
	--support-number: 'Archivo', var(--htk-font-body);
	container: hatask-support / inline-size;
	min-width: 0;
	color: var(--fg);
	font-family: var(--htk-font-body);
	line-height: 1.75;
	line-break: strict;
	overflow-wrap: anywhere;
}
.page, .page * { box-sizing: border-box; }
.page :is(button, a):focus-visible { outline: 3px solid var(--support-accent); outline-offset: 3px; }
.heading { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 24px; }
.heading h2 { font: 700 28px/1.4 var(--htk-font-head); margin: 8px 0; }
.heading p { margin: 0; font-size: 14px; color: var(--support-muted); }
.kicker { font-size: 12px; letter-spacing: .06em; color: var(--support-muted); font-weight: 700; }
.kicker span { font-weight: 400; }
.hero { position: relative; min-height: 194px; padding: 28px 32px; display: flex; align-items: center; border: var(--support-border); border-radius: var(--support-radius); margin-bottom: 24px; background: var(--support-panel); box-shadow: var(--support-shadow); }
.heroCopy { position: relative; z-index: 1; min-width: 0; flex: 1; }
.eyebrow { font: 12px 'Righteous', var(--htk-font-body); letter-spacing: .16em; margin-bottom: 10px; color: var(--support-accent); }
.heroTitle { font: 700 clamp(22px, 2.6cqi, 34px)/1.5 var(--htk-font-head); text-wrap: balance; margin: 0 0 10px; }
.heroTitle[data-default-title='true'] { container-type: inline-size; }
.heroTitlePart { white-space: nowrap; font-size: min(1em, calc((100cqi - .24em) / 11)); }
.heroMessage { font-size: 14px; line-height: 1.85; margin: 0; white-space: pre-line; color: var(--support-muted); }
.heroArt { width: 166px; flex: 0 0 166px; display: grid; place-items: center; margin-left: 22px; }
.page .heroArt .heroMark { display: grid; place-items: center; width: 130px; height: 130px; font-size: 68px; border: 1px solid var(--support-line); border-radius: 50%; color: var(--support-accent); background: var(--support-info-bg); }
.heroIllustration { width: 116px; height: 116px; object-fit: contain; }
.supportGrid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 310px); gap: 24px; align-items: start; }
.primary, .secondary { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.panel { position: relative; border: var(--support-border); border-radius: var(--support-radius); background: var(--support-panel); box-shadow: var(--support-shadow); padding: 24px; min-width: 0; }
.sectionTitle { margin: 0 0 12px; font: 700 20px/1.6 var(--htk-font-head); display: flex; align-items: center; gap: 10px; }
.sectionTitle > :global(.ti) { flex-shrink: 0; font-size: 22px; }
.lede { font-size: 14px; line-height: 1.85; color: var(--support-muted); margin: 0 0 18px; white-space: pre-line; }
.page .primaryButton, .page .secondaryButton { position: relative; display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 46px; padding: 10px 16px; font: 700 14px/1.6 var(--htk-font-body); cursor: pointer; border: 1px solid var(--support-line); border-radius: max(8px, var(--support-radius)); text-decoration: none; transition: opacity .15s; }
.primaryButton:hover, .secondaryButton:hover { opacity: .85; text-decoration: none; }
.page .primaryButton { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.page .secondaryButton { color: var(--support-accent); background: var(--support-panel); }
.secondaryButton:disabled { cursor: wait; opacity: .6; }
.secondaryButton[data-benefit-toggle] { margin-top: 12px; }
.supportStatus { background: var(--support-success-bg); border: 1px solid var(--support-success); border-radius: var(--support-radius); padding: 22px 24px; box-shadow: var(--support-shadow); }
.supportStatus h3 { font: 700 20px/1.6 var(--htk-font-head); margin: 0 0 8px; }
.supportStatus .lede { margin: 0; }
.statusLabel { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--support-success); margin-bottom: 12px; }
.statusLabel > :global(.ti) { font-size: 20px; }
.supportStatus[data-pending='true'] { background: var(--support-info-bg); border-color: var(--support-line); }
.benefitGrid { container: support-benefits / inline-size; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.benefitCard { padding: 17px; min-width: 0; background: var(--support-panel); border: var(--support-border); border-radius: var(--support-radius); box-shadow: var(--support-shadow); }
.benefitName { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; margin: 0 0 10px; }
.benefitName > :global(.ti) { flex-shrink: 0; font-size: 20px; color: var(--support-accent); }
.benefitNameCopy { container: benefit-name / inline-size; flex: 1; min-width: 0; }
.benefitNameLine { display: block; white-space: nowrap; font-size: min(1em, calc(100cqi / var(--title-em))); }
.valueWrap { container: benefit-value / inline-size; min-width: 0; }
.value { font: 700 26px/1.35 var(--support-number); font-size: min(26px, calc(100cqi / var(--value-em))); white-space: nowrap; overflow-wrap: normal; font-variant-numeric: tabular-nums; color: var(--support-accent); margin-bottom: 5px; }
.valueLabel { color: var(--support-muted); font-size: 12px; margin-bottom: 4px; }
.benefitCard[data-value-source='baseline'] :is(.valueLabel, .value) { color: var(--support-success); font-weight: 700; }
.comparison { display: grid; gap: 10px; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--support-line); }
.comparison > div { display: grid; gap: 2px; min-width: 0; }
.comparison dt { font-size: 12px; color: var(--support-muted); }
.comparison dd { margin: 0; font-size: 14px; color: var(--fg); }
.comparison :is([data-baseline-value], [data-offered-value]) { font-weight: 700; font-variant-numeric: tabular-nums; }
.comparison > [data-emphasized='true'] dt { color: var(--support-success); font-weight: 700; }
.comparison > [data-emphasized='true'] [data-baseline-value] { color: var(--support-success); font-size: 20px; }
.condition { display: block; font-size: 12px; line-height: 1.7; color: var(--support-muted); }
.benefitDescription { color: var(--support-muted); font-size: 12px; margin: 12px 0 0; line-height: 1.8; white-space: pre-line; }
.benefitStatus { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--support-success); margin-top: 10px; }
.benefitCard[data-available='false'] .benefitStatus { color: var(--support-muted); }
.benefitViewport { position: relative; padding: 16px; margin: -16px; }
.panel[data-disclosure='true'][data-compact='true'] .benefitViewport { height: var(--benefit-height); overflow: clip; transition: height .42s cubic-bezier(.22, .61, .36, 1); }
.benefitViewport::after { content: ''; position: absolute; inset: auto 0 0; height: 72px; background: linear-gradient(to bottom, transparent, var(--benefit-fade-bg, var(--support-panel))); pointer-events: none; opacity: 0; transition: opacity .24s ease; }
.panel[data-disclosure='true'][data-compact='true'][data-expanded='false'] .benefitViewport::after { opacity: 1; }
.linkCard { padding: 16px; margin-bottom: 16px; border: 1px solid var(--support-line); border-radius: max(10px, calc(var(--support-radius) - 8px)); background: var(--fill, var(--support-panel)); }
.linkCard strong { display: block; margin-bottom: 4px; font-size: 14px; }
.supportUrl { font-size: 12px; color: var(--support-muted); overflow-wrap: anywhere; }
.smallCopy { font-size: 12px; color: var(--support-muted); }
.steps { list-style: none; counter-reset: support-step; padding: 0; margin: 20px 0 0; display: grid; gap: 14px; }
.steps li { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; font-size: 13px; }
.steps li::before { counter-increment: support-step; content: counter(support-step); width: 26px; height: 26px; display: grid; place-items: center; background: var(--fill, var(--support-panel)); border: 1px solid var(--support-line); border-radius: 50%; font: 14px 'Archivo', sans-serif; }
.steps strong { display: block; }
.steps span { color: var(--support-muted); font-size: 12px; }
.supporterList { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.supporterCard { display: flex; align-items: center; gap: 10px; padding: 11px; background: var(--support-panel); border: var(--support-border); border-radius: var(--support-radius); box-shadow: var(--support-shadow); min-width: 0; }
.avatar { position: relative; display: inline-block; width: 38px; height: 38px; flex: 0 0 38px; line-height: 16px; }
.supporterWho { display: flex; flex-direction: column; min-width: 0; color: var(--fg); }
.supporterName { font-weight: 700; font-size: 14px; overflow-wrap: anywhere; }
.supporterHandle { display: block; color: var(--support-muted); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.supporterCount { margin-left: auto; font: 700 18px var(--support-number); white-space: nowrap; }
.supporterCount small { font: 12px var(--htk-font-body); }
.empty { text-align: center; padding: 28px 12px; font-size: 14px; color: var(--support-muted); }
.empty > :global(.ti) { display: block; font-size: 36px; margin: 0 auto 12px; }
.empty h4 { margin: 0 0 8px; font-size: 16px; color: var(--fg); }
.empty p { margin: 0; font-size: 13px; }
.empty .secondaryButton { margin-top: 14px; }
.empty[data-section='unconfigured-support'] { color: var(--fg); }

.page[data-theme] { --support-panel: var(--paper, var(--surface)); }
[data-theme] .hero { border-radius: 28px; }
[data-theme] .sectionTitle { padding-bottom: 12px; border-bottom: 1px solid color-mix(in srgb, var(--fg) 34%, transparent); }
[data-theme] :is(.primaryButton, .secondaryButton) { border-radius: 999px; }
[data-theme] .primaryButton { background: var(--support-accent); border-color: var(--support-accent); }
[data-theme] .secondaryButton { border: 2px solid color-mix(in srgb, var(--fg) 34%, transparent); }

@container support-benefits (max-width: 600px) { .benefitCard { grid-column: 1 / -1; } }
@container hatask-support (max-width: 850px) { .supportGrid { grid-template-columns: minmax(0, 1fr); } }
@container hatask-support (max-width: 599px) {
	.hero { padding: 24px; } .heroTitle { font-size: 25px; } .heroArt { flex-basis: 88px; width: 88px; margin-left: 10px; } .page .heroArt .heroMark { width: 88px; height: 88px; font-size: 45px; } .heroIllustration { width: 84px; height: 84px; }
	.panel { padding: 20px; } .sectionTitle { font-size: 18px; } .supportStatus { padding: 20px; } .supportStatus h3 { font-size: 18px; }
}
@container hatask-support (max-width: 460px) {
	.hero { padding: 20px; } .heroArt { width: 65px; flex-basis: 65px; align-self: flex-start; } .page .heroArt .heroMark, .heroIllustration { width: 72px; height: 72px; } .page .heroArt .heroMark { font-size: 38px; } .heroTitle { font-size: 23px; } .eyebrow { font-size: 11px; } .heroMessage { font-size: 13px; }
	.panel { padding: 18px; } .benefitCard { padding: 16px; }
}
@container hatask-support (max-width: 380px) {
	.hero { flex-direction: column-reverse; align-items: flex-start; gap: 12px; } .heroCopy { align-self: stretch; } .heroArt { width: 64px; flex-basis: auto; margin: 0; } .page .heroArt .heroMark, .heroIllustration { width: 64px; height: 64px; } .page .heroArt .heroMark { font-size: 34px; }
}
.page[data-motion='off'] :is(.benefitViewport, .primaryButton, .secondaryButton), .page[data-motion='off'] .benefitViewport::after { transition: none; }
@media (prefers-reduced-motion: reduce) { .page :is(.benefitViewport, .primaryButton, .secondaryButton), .page .benefitViewport::after { transition: none; } }

:global(.htk-root:not([data-theme='akatsuki'])) .panel { border-radius: var(--card-radius); border-color: var(--rule); box-shadow: var(--shadow); }
</style>
