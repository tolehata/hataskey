/*
 * SPDX-FileCopyrightText: Tolehata and hatasaba-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import './hatacording-icons.css';
import ActivityIcon from './ActivityIcon.vue';
import ArrowLeftIcon from './ArrowLeftIcon.vue';
import ArrowRightIcon from './ArrowRightIcon.vue';
import ArrowUpIcon from './ArrowUpIcon.vue';
import AtSignIcon from './AtSignIcon.vue';
import AttachFileIcon from './AttachFileIcon.vue';
import BadgeAlertIcon from './BadgeAlertIcon.vue';
import BellIcon from './BellIcon.vue';
import BookTextIcon from './BookTextIcon.vue';
import CheckIcon from './CheckIcon.vue';
import ChevronDownIcon from './ChevronDownIcon.vue';
import ChevronRightIcon from './ChevronRightIcon.vue';
import ChevronUpIcon from './ChevronUpIcon.vue';
import CloudUploadIcon from './CloudUploadIcon.vue';
import CompassIcon from './CompassIcon.vue';
import CopyIcon from './CopyIcon.vue';
import CornerUpLeftIcon from './CornerUpLeftIcon.vue';
import EarthIcon from './EarthIcon.vue';
import ExternalLinkIcon from './ExternalLinkIcon.vue';
import EyeOffIcon from './EyeOffIcon.vue';
import FlameIcon from './FlameIcon.vue';
import FolderInputIcon from './FolderInputIcon.vue';
import FolderOpenIcon from './FolderOpenIcon.vue';
import GaugeIcon from './GaugeIcon.vue';
import HistoryIcon from './HistoryIcon.vue';
import HomeIcon from './HomeIcon.vue';
import HatacordingLoaderIcon from './HatacordingLoaderIcon.vue';
import LayersIcon from './LayersIcon.vue';
import LayoutGridIcon from './LayoutGridIcon.vue';
import LockIcon from './LockIcon.vue';
import Maximize2Icon from './Maximize2Icon.vue';
import MenuIcon from './MenuIcon.vue';
import MessageCircleIcon from './MessageCircleIcon.vue';
import MessageSquareIcon from './MessageSquareIcon.vue';
import PaletteIcon from './PaletteIcon.vue';
import PanelLeftCloseIcon from './PanelLeftCloseIcon.vue';
import PanelLeftOpenIcon from './PanelLeftOpenIcon.vue';
import PanelRightOpenIcon from './PanelRightOpenIcon.vue';
import PlusIcon from './PlusIcon.vue';
import RadioIcon from './RadioIcon.vue';
import RadioTowerIcon from './RadioTowerIcon.vue';
import RefreshCWIcon from './RefreshCWIcon.vue';
import RocketIcon from './RocketIcon.vue';
import SearchIcon from './SearchIcon.vue';
import SettingsIcon from './SettingsIcon.vue';
import SlidersHorizontalIcon from './SlidersHorizontalIcon.vue';
import SmilePlusIcon from './SmilePlusIcon.vue';
import SparklesIcon from './SparklesIcon.vue';
import SquarePenIcon from './SquarePenIcon.vue';
import UserIcon from './UserIcon.vue';
import XIcon from './XIcon.vue';
import { withInteractiveParentMotion } from './with-interactive-parent-motion.js';

// pqoqubbw/icons に同義のアイコンがない操作は、意味を変えないことを優先して
// 既存の Lucide をそのまま公開する。
export {
	ArrowDownToLine,
	CalendarPlus,
	Gamepad2,
	Hash,
	Info,
	Inbox,
	LayoutList,
	List,
	Megaphone,
	MessageSquareWarning,
	MoreHorizontal,
	PanelRightClose,
	Pin,
	PinOff,
	Plug,
	Quote,
	Save,
	Shield,
	Square,
	TimerReset,
	Tv,
	Unplug,
	WandSparkles,
} from '@lucide/vue';

const animated = withInteractiveParentMotion;

export const Activity = animated(ActivityIcon);
export const ArrowLeft = animated(ArrowLeftIcon);
export const ArrowRight = animated(ArrowRightIcon);
export const ArrowUp = animated(ArrowUpIcon);
export const AtSign = animated(AtSignIcon);
export const Bell = animated(BellIcon);
export const BookOpen = animated(BookTextIcon);
export const Check = animated(CheckIcon);
export const ChevronDown = animated(ChevronDownIcon);
export const ChevronRight = animated(ChevronRightIcon);
export const ChevronUp = animated(ChevronUpIcon);
export const CircleAlert = animated(BadgeAlertIcon);
export const CloudUpload = animated(CloudUploadIcon);
export const Compass = animated(CompassIcon);
export const Copy = animated(CopyIcon);
export const Earth = animated(EarthIcon);
export const ExternalLink = animated(ExternalLinkIcon);
export const EyeOff = animated(EyeOffIcon);
export const Flame = animated(FlameIcon);
export const Folder = animated(FolderOpenIcon);
export const Globe2 = animated(EarthIcon);
export const History = animated(HistoryIcon);
export const Home = animated(HomeIcon);
export const Import = animated(FolderInputIcon);
export const Layers = animated(LayersIcon);
export const LayoutDashboard = animated(LayoutGridIcon);
export const LoaderCircle = HatacordingLoaderIcon;
export const Lock = animated(LockIcon);
export const Maximize2 = animated(Maximize2Icon);
export const Menu = animated(MenuIcon);
export const MessageCircle = animated(MessageCircleIcon);
export const MessageSquareText = animated(MessageSquareIcon);
export const PanelLeftClose = animated(PanelLeftCloseIcon);
export const PanelLeftOpen = animated(PanelLeftOpenIcon);
export const PanelRight = animated(PanelRightOpenIcon);
export const PanelRightOpen = animated(PanelRightOpenIcon);
export const Paperclip = animated(AttachFileIcon);
export const Pencil = animated(SquarePenIcon);
export const Plus = animated(PlusIcon);
export const Radio = animated(RadioIcon);
export const RadioTower = animated(RadioTowerIcon);
export const RefreshCw = animated(RefreshCWIcon);
export const Reply = animated(CornerUpLeftIcon);
export const Rocket = animated(RocketIcon);
export const Search = animated(SearchIcon);
export const Settings = animated(SettingsIcon);
export const SlidersHorizontal = animated(SlidersHorizontalIcon);
export const SmilePlus = animated(SmilePlusIcon);
export const Sparkles = animated(SparklesIcon);
// 上流に単独のStarがないため、投稿機能の「星」は同じ星表現のSparklesを使う。
export const Star = animated(SparklesIcon);
export const SwatchBook = animated(PaletteIcon);
export const UserRound = animated(UserIcon);
export const X = animated(XIcon);
export const Gauge = animated(GaugeIcon);
