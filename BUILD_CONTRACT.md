# HueMind Build Contract

Single source of truth for the parallel build. **Read your assigned section, then write ONLY your one file.** Do not run npm/expo/git. Do not edit other files. Match the existing code style.

## Project facts
- Expo SDK 54, expo-router v6 (typed routes ON), React 19.1, RN 0.81, TypeScript strict.
- **Must run in Expo Go (SDK 54).** Allowed deps ONLY: `react`, `react-native`, `expo-router`, `expo-linear-gradient`, `expo-haptics`, `expo-localization`, `expo-splash-screen`, `expo-font`, `expo-constants`, `expo-status-bar`, `react-native-svg`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`, `react-native-gesture-handler`, `@expo/vector-icons` (use `MaterialIcons`), `@expo-google-fonts/manrope`, `zustand`, `i18next`, `react-i18next`. **NEVER import** `react-native-purchases`, `react-native-reanimated`, `expo-av`, or anything else — it will break Expo Go.
- Import alias: `@/` → repo root. Always import via alias, e.g. `import { useTheme } from '@/src/theme'`.
- Animations: use RN built-in `Animated` + `PanResponder` only (no reanimated).
- Icons: `import { MaterialIcons } from '@expo/vector-icons'`. Names are kebab MaterialIcons names (e.g. `home`, `insights`, `settings`, `grid-view`, `bolt`, `warning`, `spa`, `arrow-back`, `palette`, `pause`, `close`, `chevron-right`, `volume-up`, `vibration`, `dark-mode`, `visibility`, `translate`, `emoji-events`, `local-fire-department`, `replay`, `trending-up`, `workspace-premium`).

## Already built (DO NOT recreate — import and use)
- `@/src/types` — `ModeId`, `ThemeMode`, `Language`, `HSV`, `RGB`, `RoundResult`, `Settings`, `Stats`, `GameState`, `ModeConfig`.
- `@/src/theme` — `useTheme(): Theme`, `useThemeScheme()`, `makeTheme`, `spacing`, `radius`, `typography`, `fontFamily`, `ambientShadow`. `Theme = { colors: Palette, spacing, radius, typography, font, shadow }`. `Palette` keys: `bg, card, cardAlt, inset, border, borderStrong, text, textMuted, textFaint, primary, onPrimary, secondaryBtn, onSecondaryBtn, error, errorContainer, onErrorContainer, overlay, scheme`. `typography` keys: `display, headlineLg, headlineMd, title, bodyLg, body, bodyMedium, label, caption`.
- `@/src/constants/modes` — `MODES: Record<ModeId, ModeConfig>`, `MODE_ORDER: ModeId[]`, `HARDCORE_DISTRACTORS`, `HARDCORE_DISTRACTOR_MS`. `ModeConfig = { id, memorizeSeconds, difficulty, accent, icon, bonus, hardcore }`.
- `@/src/utils/color` — `clamp`, `hsvToRgb`, `rgbToHsv`, `rgbToHex`, `hexToRgb`, `hsvToHex`, `hexToHsv`, `randomTargetHex(rand?)`, `randomDistractorHex(rand?)`, `colorDeltaE(a,b)`, `luminance(hex)`, `readableTextColor(hex)`.
- `@/src/utils/scoring` — `MAX_DELTA_E`, `scoreFromDelta(deltaE)`, `feedbackKey(score): 'perfect'|'almost'|'close'|'good'|'off'`, `roundPoints(r)`, `computeRound({mode,target,guess,reactionMs,timestamp}): RoundResult`.
- `@/src/utils/colorName` — `colorNameKey(hex): ColorNameKey` (key under i18n `colors.*`).
- `@/src/i18n` — default export `i18n`; named: `applyLanguage(setting)`, `resolveLanguage`, `deviceLanguage`, `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`. Use translations via `useTranslation()` from `react-i18next`: `const { t } = useTranslation();` then `t('home.headline')`. Interpolation: `t('modeSelect.secondsToMemorize', { count: 5 })`.
- `@/src/components/ColorPicker` — `ColorPicker({ value: HSV, onChange: (hsv:HSV)=>void })`. Controlled.

## i18n keys (already defined in de/en/es)
`common.{appName,back,home,close,cancel,of,seconds,second,points}`,
`splash.tagline`,
`home.{headline,subline,play,modes,bestScore,streak,rounds}`,
`modeSelect.{title,subtitle,start,secondsToMemorize}`,
`modes.<id>.{name,tagline,short}` and `modes.hardcore.subtitle`,
`ready.{title,subline,start,modeLabel,timeLabel}`,
`game.{memorizeTitle,memorizeSub,transitionTitle,transitionSub,pickTitle,pickSub,yourPick,confirm,hue,brightness,details,distractTitle,distractSub,targetTitle,targetSub,paused,resume,quit,quitConfirmTitle,quitConfirmBody}`,
`result.{original,yourPick,deviation,reaction,modeBonus,nextRound,retry,home,newBest,feedback.{perfect,almost,close,good,off}}`,
`progress.{title,subtitle,weeklyStreak,currentStreak,avgScore,bestScore,roundsPlayed,bestColor,hardestColor,empty,none}`,
`settings.{title,sound,haptics,darkMode,colorBlind,difficultyDetails,language,sectionGeneral,sectionAppearance,sectionData,resetStats,resetConfirmTitle,resetConfirmBody,reset,version,premium,premiumActive,premiumSubtitle,restore}`,
`themeMode.{system,light,dark}`, `language.{system,de,en,es}`,
`paywall.{title,subtitle,feature1,feature2,feature3,feature4,monthly,yearly,cta,restore,notNow,bestValue}`,
`colors.{red,orange,yellow,lime,green,teal,cyan,blue,indigo,purple,magenta,pink,brown,grey,white,black}`,
`days.{mon,tue,wed,thu,fri,sat,sun}`.

---

# FILES TO BUILD

## PHASE A — core state & services

### `src/store/useStore.ts`
Zustand v4 (`import { create } from 'zustand'`) + `persist` middleware (`import { persist, createJSONStorage } from 'zustand/middleware'`) backed by `@react-native-async-storage/async-storage`.
Export `const useStore = create(persist(...))`. State:
```
{
  hydrated: boolean,          // false until rehydrated
  premium: boolean,           // local premium flag (RevenueCat wires this later)
  settings: Settings,
  stats: Stats,
  game: GameState,
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void,
  setLanguage(language: Language): void,   // updates settings.language AND calls applyLanguage(language)
  setPremium(v: boolean): void,
  setMode(mode: ModeId): void,
  setTarget(hex: string | null): void,
  recordResult(result: RoundResult): void,
  resetStats(): void,
}
```
Defaults: `settings = { sound:true, haptics:true, themeMode:'system', colorBlind:false, showDifficultyDetails:false, language:'system' }`; `stats = { history:[], bestScore:0, streak:0, lastPlayedDay:null }`; `game = { selectedMode:'normal', target:null, lastResult:null }`; `premium:false`, `hydrated:false`.
`recordResult`: push to `stats.history`; `bestScore = max(bestScore, result.score)`; update streak — compute `today` and `yesterday` as `YYYY-MM-DD` from `new Date(result.timestamp)` (use a local helper `dayKey(ts)`); if `lastPlayedDay===today` keep streak; else if `lastPlayedDay===yesterday` streak+1; else streak=1; set `lastPlayedDay=today`; set `game.lastResult=result`. Keep history capped at last 500.
`resetStats`: reset stats to defaults and `game.lastResult=null`.
persist config: `name:'huemind-store'`, `storage: createJSONStorage(() => AsyncStorage)`, `partialize: (s) => ({ settings: s.settings, stats: s.stats, premium: s.premium })`, `onRehydrateStorage: () => (state) => { state?.? }` → set `hydrated=true` and call `applyLanguage(state.settings.language)` (import from `@/src/i18n`). Use `set`/`get` correctly. All actions use immutable updates.

### `src/store/selectors.ts`
Pure functions over `Stats` (import types + `@/src/utils/colorName` + `@/src/utils/scoring`):
```
totalPoints(stats): number              // sum over history of roundPoints
averageScore(stats): number             // mean of score, rounded; 0 if empty
roundsPlayed(stats): number
weeklyScores(stats, now: number): { values: number[]; labels: string[] }
  // 7 entries Mon..Sun of the week containing `now`. values = avg score that day (0 if none). labels = ['mon'..'sun'] i18n suffixes.
bestColorKey(stats): string | null      // colorNameKey bucket with highest avg score (need >=1 round); null if empty
hardestColorKey(stats): string | null   // bucket with lowest avg score; null if empty
trendDelta(stats): number               // avg(last 5) - avg(previous 5), rounded 1 decimal; 0 if not enough
```
Day math with plain `Date`; week starts Monday.

### `src/services/purchases.ts`
RevenueCat-ready **mock** abstraction. **Do NOT import `react-native-purchases`** (not installed; would break Expo Go). Pure local implementation that flips the store's `premium` flag, with a big doc block explaining how to wire RevenueCat for production (install `react-native-purchases`, build a dev/production build — not Expo Go —, `Purchases.configure({ apiKey })`, read `customerInfo.entitlements.active['premium']`, replace the mock bodies). Export:
```
import Constants from 'expo-constants';
export function isExpoGo(): boolean   // Constants.appOwnership === 'expo' OR executionEnvironment === 'storeClient'
export async function initPurchases(): Promise<void>          // mock: resolves
export async function getOfferings(): Promise<null>           // mock: null
export async function purchasePremium(plan: 'monthly'|'yearly'): Promise<boolean>  // mock: useStore.getState().setPremium(true); return true
export async function restorePurchases(): Promise<boolean>    // mock: returns current premium
export function usePremium(): boolean                          // useStore((s)=>s.premium)
```
Reference store via `import { useStore } from '@/src/store/useStore'`.

### `src/services/feedback.ts`
Haptics + sound, gated by settings. `import * as Haptics from 'expo-haptics'`, `import { Platform } from 'react-native'`, `import { useStore } from '@/src/store/useStore'`. No-op on web. Read `useStore.getState().settings`.
```
export const feedback = {
  tap(): void,       // selectionAsync if haptics on
  select(): void,    // impact Light
  success(): void,   // notification Success
  warning(): void,   // notification Warning
  error(): void,     // notification Error
};
// sound: TODO placeholder gated by settings.sound (comment only; expo-audio later). No imports for sound.
```
Wrap all in try/catch and `Platform.OS !== 'web'` guard.

---

## PHASE B — UI kit (`src/components/*`). Each file = one component, default-importable as named export. May import `@/src/theme`, react-native, `react-native-svg`, `expo-linear-gradient`, `@expo/vector-icons`, color utils, and the atomic components `AppText`/`Pill`/`DifficultyDots` where useful.

### `src/components/AppText.tsx`
`export function AppText({ variant='body', color, align, style, numberOfLines, children, onPress })`. `variant: keyof Theme['typography']`. Renders `<Text>` merging `theme.typography[variant]`, `color: color ?? theme.colors.text`, `textAlign: align`. Spread remaining via `style`.

### `src/components/Pill.tsx`
`export function Pill({ label, tone='default', accent, style })`. tone `'default'|'accent'|'error'`. Rounded (radius.full) small chip; default bg `theme.colors.inset` text `textMuted`; accent → translucent accent bg + accent text; error → `errorContainer`/`onErrorContainer`. Use `typography.label` (uppercase optional). Padding ~ 6/12.

### `src/components/DifficultyDots.tsx`
`export function DifficultyDots({ filled, total=4, color, size=8, style })`. Row of `total` dots; first `filled` use `color ?? theme.colors.text`, rest `theme.colors.border`. gap ~6.

### `src/components/AppButton.tsx`
`export function AppButton({ label, onPress, variant='primary', icon, iconPosition='left', disabled=false, full=true, style })`. Uses `Pressable` with press scale 0.98 (Animated.Value) + opacity on disabled. primary: bg `colors.primary`, text `colors.onPrimary`; secondary: bg `colors.secondaryBtn`, text `colors.onSecondaryBtn`; ghost: transparent, text `colors.textMuted`. radius.lg, paddingVertical 16, center, `typography.headlineMd` for label (size ok). Optional `MaterialIcons` icon colored to match text. Calls `feedback.select()` from `@/src/services/feedback` on press (import it).

### `src/components/ScreenContainer.tsx`
`export function ScreenContainer({ children, scroll=false, padded=true, center=false, style, contentStyle, edges })`. Uses `SafeAreaView` from `react-native-safe-area-context` with `backgroundColor: theme.colors.bg`, flex 1. If scroll → `ScrollView` with `contentContainerStyle` (paddingHorizontal containerPadding when padded, flexGrow 1, center if asked). Else a `View`. `edges` default `['top','bottom']`.

### `src/components/AppHeader.tsx`
`export function AppHeader({ title, showBack=false, onBack, right })`. Row height ~56, centered title (`title ?? t('common.appName')`, `typography.headlineMd`). Back button (MaterialIcons `arrow-back`) left when showBack; default onBack = `router.back()` (`import { useRouter } from 'expo-router'`). right node on the right. Use `useTranslation`.

### `src/components/StatCard.tsx`
`export function StatCard({ icon, label, value, style })`. Card bg `colors.card`, radius.md, padding, ambient shadow (`theme.shadow`), centered: optional MaterialIcons icon (textMuted), `Pill`-less label using `typography.label` uppercase in `textMuted`, value `typography.headlineMd` in `text`. Compact.

### `src/components/ModeCard.tsx`
`export function ModeCard({ mode, selected, onPress })` where `mode: ModeConfig`. Card radius.xl, bg `colors.card`, border 1px (`selected` → `mode.accent` width 2 + larger shadow; else `colors.border`), padding lg. Layout: top row = MaterialIcons `mode.icon` (left) + `DifficultyDots filled={mode.difficulty}` colored `mode.text-ish` (right). Then name `t('modes.'+mode.id+'.name')` (`typography.headlineMd`). Then `t('modeSelect.secondsToMemorize',{count: mode.memorizeSeconds})` in `textMuted`. Then a `Pill` with tagline `t('modes.'+mode.id+'.tagline')`, tone accent (accent=mode.accent) — except hardcore uses tone `error`. Pressable scale 0.99.

### `src/components/CountdownRing.tsx`
`export function CountdownRing({ seconds, running=true, onComplete, size=120, stroke=8, color, trackColor, label })`. `react-native-svg`: a `Svg` with a track `Circle` (trackColor ?? colors.inset) and a progress `Circle` (color ?? colors.text) using `Animated.Value` 0→1 driving `strokeDashoffset` over `seconds*1000` ms linear; rotate -90°. Center: `<AppText variant="headlineLg">` showing `label ?? Math.ceil(remaining)` where remaining counts down (use state + interval, or derive from animated listener). Fire `onComplete` once at end. When `running` false, pause animation. `AnimatedCircle = Animated.createAnimatedComponent(Circle)`. Restart animation if `seconds`/key changes. Keep it robust: clear timers on unmount.

### `src/components/ColorSwatch.tsx`
`export function ColorSwatch({ color, width, height, size=140, radius, label, glow=false, style, labelColor })`. A rounded `View` filled `color`; optional inner glow (an absolute inset View with subtle `borderColor`/shadow) when glow. Optional `label` (`typography.label` uppercase) centered below in `labelColor ?? colors.textMuted`. width/height default to size.

### `src/components/WeeklyChart.tsx`
`export function WeeklyChart({ values, labels, height=160, color, style })`. `values:number[]` (len 7, 0..100), `labels:string[]` (len 7, already-translated day strings). Use `react-native-svg`. Measure width via `onLayout`. Draw 3 dotted horizontal gridlines (`colors.border`), a smooth curve (Catmull-Rom → cubic bezier path `d`) through the 7 points mapped y=height*(1 - v/100) with vertical padding, small dot at the last point, and the day labels in a row below (`typography.caption`, `textFaint`). Handle width=0 (first render) by rendering nothing until measured. All-zero values → flat line near bottom.

### `src/components/SettingRow.tsx`
`export function SettingRow({ icon, label, description, right, onPress, isFirst, isLast })`. A row inside a grouped card: leading round icon chip (bg `colors.inset`, MaterialIcons in `text`), label `typography.bodyMedium`, optional description `typography.caption textMuted`, trailing `right` node (or a `chevron-right` MaterialIcons when `onPress` and no right). Pressable when onPress. Rows separated by a hairline `colors.border` except last. (Screen wraps rows in a card; row itself is transparent.)

### `src/components/GradientOrb.tsx`
`export function GradientOrb({ size=200, style })`. A perfectly round view (`borderRadius size/2`, `overflow hidden`, `theme.shadow`) containing a diagonal `LinearGradient` (colors `['#FF6B6B','#4ECDC4','#45B7D1']`, start {0,0} end {1,1}) and a soft inner highlight (absolute inset View, subtle white radial-ish via a translucent LinearGradient). Add gentle life: an `Animated` looped rotation (8s) of an overlaid second translucent gradient layer. Calm, premium. No external anim deps.

### `src/components/BrandLogo.tsx`
`export function BrandLogo({ size=96 })`. The brand "gradient dot": a rounded-square card (bg `colors.card`, radius `size*0.28`, `theme.shadow`, padding) containing a circular `LinearGradient` teal→coral with a soft white center glow (concentric absolute Views). Matches the splash logo.

### `src/components/Celebration.tsx`
`export function Celebration({ active, color, style })`. Decorative soft glow burst using RN `Animated` only: when `active` flips true, animate opacity 0→1→0 and scale of a few translucent concentric rings (color-tinted). No particle libs. Pointer-events none; absolute fill. Safe no-op when inactive.

---

## PHASE C — layouts & screens

### `app/_layout.tsx` (root)
- `import 'react-native-gesture-handler'` first line. Wrap tree in `GestureHandlerRootView` (`flex:1`) + `SafeAreaProvider` (from safe-area-context).
- Load Manrope: `import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope'`.
- `import '@/src/i18n'` (init). Keep native splash up via `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()` at module top, `hideAsync()` once fonts loaded AND `useStore(s=>s.hydrated)` true). Return `null` until ready.
- Render `expo-status-bar` `<StatusBar style="auto" />`.
- `Stack` (`from 'expo-router'`) with `screenOptions={{ headerShown:false, contentStyle:{backgroundColor: theme.colors.bg} }}`. Declare screens: `index`, `(tabs)`, `modes`, `ready`, `game`, `result`, and `paywall` (`options={{ presentation:'modal' }}`). Use `useTheme()` for bg. Animations default.

### `app/(tabs)/_layout.tsx`
`Tabs` from expo-router with a **custom tab bar** matching the design (floating rounded top bar, three items: home/insights/settings; active item shown as a filled rounded pill using `colors.inset`/`text`, inactive `textMuted`). Implement `tabBar={(props) => <CustomTabBar {...props} />}` with a small inline `CustomTabBar` (use `props.state`, `props.navigation`, `props.descriptors`). Tab screens (set `title` via options): `home` (icon `home`), `progress` (icon `insights`), `settings` (icon `settings`). `initialRouteName="home"`, `screenOptions={{ headerShown:false }}`. Bar bg `colors.card`, top rounded radius.xl, ambient top shadow, safe-area bottom padding.

### `app/index.tsx` (Splash)
Warm bg screen, centered `BrandLogo` + appName (`typography.display`) + `t('splash.tagline')` (textMuted). On mount, after ~1500ms `router.replace('/home')` (use `useRouter`; clear timeout on unmount). Subtle fade-in via Animated. No header/tabs.

### `app/(tabs)/home.tsx`
ScreenContainer (scroll). Centered: app name small top, `GradientOrb` (color reflects nothing specific — decorative), headline `t('home.headline')` (`headlineLg`, centered), subline `t('home.subline')` (`bodyLg textMuted`). Primary `AppButton` `t('home.play')` → on press `router.push('/ready')`. Secondary `AppButton` `t('home.modes')` → `router.push('/modes')`. Below: 3 `StatCard`s in a row reading store: bestScore = `t('home.bestScore')` value `totalPoints(stats)` (formatted with thousands sep), streak = `t('home.streak')` value `stats.streak`, rounds = `t('home.rounds')` value `roundsPlayed(stats)`. Icons: `emoji-events`, `local-fire-department`, `replay`. Use `useStore`, `@/src/store/selectors`.

### `app/(tabs)/progress.tsx`
ScreenContainer (scroll). `AppHeader` (no back). Title `t('progress.title')`, subtitle `t('progress.subtitle')`. If `roundsPlayed===0` show empty state (`t('progress.empty')`). Else: a card containing `WeeklyChart` (values+labels from `weeklyScores(stats, Date.now())`, labels via `t('days.'+key)`) with header `t('progress.weeklyStreak')` + `t('progress.currentStreak',{count: stats.streak})`. Then a 2-col grid of cards: `avgScore` (`averageScore`+'%', with trend `trendDelta` shown as +x% via `trending-up`), `bestScore` (`stats.bestScore`+'%'), `roundsPlayed`, `bestColor` (color swatch of representative hue + `t('colors.'+bestColorKey)`), `hardestColor` similarly. For color swatches pick a representative hex per color key (define a small local map keyâ†'hex, or reuse: just render a neutral dot if null → `t('progress.none')`). Use `typography` + cards consistent with design.

### `app/(tabs)/settings.tsx`
ScreenContainer (scroll). `AppHeader`. Title `t('settings.title')`. Sections (grouped cards with `SettingRow`s):
- Premium row at top: `workspace-premium` icon, label `t('settings.premium')`, description `premium ? t('settings.premiumActive') : t('settings.premiumSubtitle')`, onPress → `router.push('/paywall')` (hide press/chevron if premium, show check).
- General: Sound (`volume-up`, RN `Switch` bound to `settings.sound` via `setSetting('sound', v)` + `feedback.select()`), Haptics (`vibration`, `settings.haptics`).
- Appearance: Dark Mode — a segmented control or row that cycles theme: present 3 chips (`themeMode.system/light/dark`) selecting `settings.themeMode` via `setSetting('themeMode', ...)`. Color-blind (`visibility`, `settings.colorBlind`), Difficulty details (`settings.showDifficultyDetails`). 
- Language: row opening an inline selector of `language.{system,de,en,es}` → `setLanguage(code)`. (Simple: show 4 chips or an Alert/ActionSheet; chips are fine.)
- Data: Reset stats (`replay` icon) → confirm via RN `Alert.alert` (`settings.resetConfirm*`) then `resetStats()`. Version row showing `Constants.expoConfig?.version` (`expo-constants`).
Use RN `Switch` with `trackColor`/`thumbColor` themed. Bind all to store.

### `app/modes.tsx`
ScreenContainer (scroll, with fixed bottom button). `AppHeader showBack`. Title `t('modeSelect.title')`, subtitle `t('modeSelect.subtitle')`. Local state `selected: ModeId` init from `useStore.getState().game.selectedMode`. Render `MODE_ORDER.map` → `ModeCard mode={MODES[id]} selected={selected===id} onPress={()=>setSelected(id)}`. Fixed bottom primary `AppButton t('modeSelect.start')` → `setMode(selected)` then `router.push('/ready')`.

### `app/ready.tsx`
ScreenContainer (center). Top-right small close (`MaterialIcons close` → `router.replace('/home')`) optional. Center: round icon chip (`palette`), title `t('ready.title')` (`display`), subline `t('ready.subline')` (textMuted center). A card with two rows: `t('ready.modeLabel')` → mode short name `t('modes.'+mode+'.short')`; `t('ready.timeLabel')` → `mode.memorizeSeconds + ' ' + t('common.seconds')`. Bottom primary `AppButton t('ready.start')` icon `arrow-forward` → `router.replace('/game')`. Read mode from `useStore(s=>s.game.selectedMode)` + `MODES`.

### `app/game.tsx`  ← most important; be careful
Full-screen (no tabs/header). Reads `mode = useStore(s=>s.game.selectedMode)` and `MODES[mode]`. On first mount generate `target = randomTargetHex()` and `setTarget(target)` (store). Phase state machine via `useState<'distract'|'target'|'memorize'|'transition'|'pick'>`:
- Non-hardcore: start `'memorize'`.
- Hardcore: start `'distract'`.
Flow & timing:
- `'distract'` (hardcore only): cycle through `HARDCORE_DISTRACTORS` random distractor colors, each shown `HARDCORE_DISTRACTOR_MS` ms as a big centered `ColorSwatch`; header `t('game.distractTitle')` + `t('game.distractSub')`; small `close` to quit. After all distractors → `'target'`.
- `'target'` (hardcore only): show the real `target` big with `CountdownRing seconds={mode.memorizeSeconds}` and `t('game.targetTitle')`/`t('game.targetSub')`; on ring complete → `'transition'`.
- `'memorize'` (non-hardcore): big `target` swatch/orb, `CountdownRing seconds={mode.memorizeSeconds}` top, texts `t('game.memorizeTitle')`/`t('game.memorizeSub')`, small `pause` button (top-left) toggling a paused overlay (`t('game.paused')`, resume/quit). On complete → `'transition'`.
- `'transition'`: neutral screen ~1100ms, `t('game.transitionTitle')`/`t('game.transitionSub')`, subtle fade. Then → `'pick'`. Record `pickStart = Date.now()` when entering `'pick'`.
- `'pick'`: header `t('game.pickTitle')`/`t('game.pickSub')`. Local `hsv` state init `{ h: random 0..360, s:0.5, v:0.6 }`. Render `<ColorPicker value={hsv} onChange={setHsv} />`. Below, a live preview `ColorSwatch` (round) with label `t('game.yourPick')`. Optional `t('game.details')` toggle revealing hex when `settings.showDifficultyDetails`. Bottom primary `AppButton t('game.confirm')`. On confirm: `guess = hsvToHex(hsv)`; `result = computeRound({ mode, target, guess, reactionMs: Date.now()-pickStart, timestamp: Date.now() })`; `recordResult(result)`; `feedback.success()` (or based on score); `router.replace('/result')`.
Use `Animated` for fades. Clean up ALL timers/intervals on unmount and on phase change. Use a quit handler → `Alert.alert` confirm → `router.replace('/home')`. Keep target hidden during pick (never show it). Avoid stale-closure timer bugs (use refs or functional updates).

### `app/result.tsx`
Full screen. Read `result = useStore(s=>s.game.lastResult)`. If null → `router.replace('/home')`. `AppHeader showBack` (back → home). Two `ColorSwatch` side by side: left `result.target` label `t('result.original')`, right `result.guess` label `t('result.yourPick')`. Big score: `<AppText variant="display">{result.score}</AppText>` + ` / 100` muted. Feedback line `t('result.feedback.'+feedbackKey(result.score))` (`headlineMd`). Detail `Pill`s row: `t('result.deviation')+': '+result.deviationPct+'%'`, `t('result.reaction')+': '+(result.reactionMs/1000).toFixed(1)+'s'`, `t('result.modeBonus')+': +'+result.modeBonus`. Only show deltaE/hex extras when `settings.showDifficultyDetails`. If `result.score>=stats.bestScore` show `t('result.newBest')` + `<Celebration active />` (use accent of guess color). Buttons: primary `t('result.nextRound')` → `router.replace('/game')`; secondary `t('result.retry')` → `router.replace('/game')`; ghost `t('result.home')` → `router.replace('/home')`. (next & retry both start a fresh round; that's fine.) Celebration only for score>=90.

### `app/paywall.tsx`
Modal screen. Close `X` (top-right) → `router.back()`. `BrandLogo` small, title `t('paywall.title')` (`headlineLg`), subtitle `t('paywall.subtitle')`. Feature list (4 rows, MaterialIcons `check`): `t('paywall.feature1..4')`. Two plan cards monthly/yearly (local `selected` state; yearly shows `t('paywall.bestValue')` pill). Primary `AppButton t('paywall.cta')` → `await purchasePremium(selected); router.back()` (import from `@/src/services/purchases`). Ghost `t('paywall.restore')` → `restorePurchases()`. Ghost `t('paywall.notNow')` → `router.back()`. Prices are placeholder strings (e.g. `'4,99 €'`, `'29,99 €'`) — RevenueCat will supply real ones later (note in a comment).

---
## Global quality bar
- TypeScript strict-clean. No `any` unless unavoidable. No unused imports.
- Every screen safe-area aware. Respect light/dark via `useTheme()`. No hardcoded background colors except inside game color areas.
- All user-facing text via `t(...)`. No literal German/English strings in components/screens.
- No banned imports. No reanimated. Expo Go must bundle.
