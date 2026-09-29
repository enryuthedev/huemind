/**
 * HueMind — In-App Purchases (RevenueCat, Expo SDK 57).
 *
 * - Dev/EAS/store builds: real RevenueCat via `react-native-purchases`.
 *   Keys come from EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY.
 *   Missing key → warning, purchases behave as unavailable.
 * - Expo Go: the native module is NEVER loaded. The SDK is only `require()`d
 *   lazily inside functions guarded by `!isExpoGo()` (a static import broke the
 *   Expo Go bundle before — keep it that way; `import type` is fine).
 *   In Expo Go + __DEV__ a local mock flips the store's `premium` flag.
 *
 * Entitlement: 'premium' ("HueMind Pro"). Packages in the current offering:
 * `$rc_annual` (yearly, 7-day trial) and `$rc_lifetime` (one-time).
 * Call `initPurchases()` once from the root layout.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { useStore } from '@/src/store/useStore';

/** Entitlement identifier configured in RevenueCat. */
export const PREMIUM_ENTITLEMENT = 'premium';

export type PurchasePlan = 'yearly' | 'lifetime';
export type PurchaseResult = 'success' | 'cancelled' | 'error';

export interface NormalizedOfferings {
  yearly?: { priceString: string; hasTrial: boolean; trialDays: number };
  lifetime?: { priceString: string };
}

type PurchasesModule = typeof import('react-native-purchases').default;

/**
 * True when the app is running inside Expo Go, where native purchase modules
 * are unavailable. RevenueCat must be skipped in this environment.
 */
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  );
}

/** Mock only for local development inside Expo Go. */
function isMockMode(): boolean {
  return isExpoGo() && __DEV__;
}

let configured = false;
let initPromise: Promise<void> | null = null;

/** Lazily loads the SDK. Returns null in Expo Go or if the module is missing. */
function loadSdk(): PurchasesModule | null {
  if (isExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as {
      default: PurchasesModule;
    };
    return mod.default ?? null;
  } catch (e) {
    console.warn('[purchases] react-native-purchases not available', e);
    return null;
  }
}

/** Configured SDK instance, or null if unavailable. */
async function getSdk(): Promise<PurchasesModule | null> {
  if (isExpoGo()) return null;
  await initPurchases();
  return configured ? loadSdk() : null;
}

function hasPremium(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[PREMIUM_ENTITLEMENT] !== 'undefined';
}

function syncFromInfo(info: CustomerInfo): boolean {
  const active = hasPremium(info);
  useStore.getState().setPremium(active);
  return active;
}

/** Configure RevenueCat once and keep the store's premium flag in sync. */
export function initPurchases(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isExpoGo()) return;
    const Purchases = loadSdk();
    if (!Purchases) return;

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
      android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
    });
    if (!apiKey) {
      console.warn(
        '[purchases] Missing RevenueCat API key (EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY). Purchases disabled.',
      );
      return;
    }

    try {
      if (__DEV__) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { LOG_LEVEL } = require('react-native-purchases') as typeof import('react-native-purchases');
        void Purchases.setLogLevel(LOG_LEVEL.WARN);
      }
      Purchases.configure({ apiKey });
      configured = true;
      Purchases.addCustomerInfoUpdateListener((info) => {
        syncFromInfo(info);
      });
      const info = await Purchases.getCustomerInfo();
      syncFromInfo(info);
    } catch (e) {
      console.warn('[purchases] init failed', e);
    }
  })();
  return initPromise;
}

async function getCurrentOffering(
  Purchases: PurchasesModule,
): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

function findPackage(
  offering: PurchasesOffering,
  plan: PurchasePlan,
): PurchasesPackage | null {
  const id = plan === 'yearly' ? '$rc_annual' : '$rc_lifetime';
  return (
    (plan === 'yearly' ? offering.annual : offering.lifetime) ??
    offering.availablePackages.find((p) => p.identifier === id) ??
    null
  );
}

function unitToDays(unit: string, n: number): number {
  switch (unit) {
    case 'DAY':
      return n;
    case 'WEEK':
      return n * 7;
    case 'MONTH':
      return n * 30;
    case 'YEAR':
      return n * 365;
    default:
      return 0;
  }
}

/** Free-trial length in days for a subscription package (0 = no trial). */
function trialDaysOf(pkg: PurchasesPackage): number {
  const product = pkg.product;
  // Google Play: free phase of the default subscription option.
  const free = product.defaultOption?.freePhase;
  if (free?.billingPeriod) {
    return unitToDays(free.billingPeriod.unit, free.billingPeriod.value);
  }
  // App Store: introductory offer with price 0.
  const intro = product.introPrice;
  if (intro && intro.price === 0) {
    return unitToDays(intro.periodUnit, intro.periodNumberOfUnits * intro.cycles);
  }
  return 0;
}

/**
 * Localized prices + trial info of the current offering, or null when
 * unavailable (Expo Go, no key, network error) — the paywall then falls back.
 */
export async function getOfferings(): Promise<NormalizedOfferings | null> {
  const Purchases = await getSdk();
  if (!Purchases) return null;
  try {
    const offering = await getCurrentOffering(Purchases);
    if (!offering) return null;
    const result: NormalizedOfferings = {};
    const yearly = findPackage(offering, 'yearly');
    if (yearly) {
      const trialDays = trialDaysOf(yearly);
      result.yearly = {
        priceString: yearly.product.priceString,
        hasTrial: trialDays > 0,
        trialDays,
      };
    }
    const lifetime = findPackage(offering, 'lifetime');
    if (lifetime) {
      result.lifetime = { priceString: lifetime.product.priceString };
    }
    return result.yearly || result.lifetime ? result : null;
  } catch (e) {
    console.warn('[purchases] getOfferings failed', e);
    return null;
  }
}

/** Purchase the yearly subscription or the lifetime unlock. */
export async function purchasePremium(
  plan: PurchasePlan,
): Promise<PurchaseResult> {
  if (isMockMode()) {
    useStore.getState().setPremium(true);
    return 'success';
  }
  const Purchases = await getSdk();
  if (!Purchases) return 'error';
  try {
    const offering = await getCurrentOffering(Purchases);
    const pkg = offering ? findPackage(offering, plan) : null;
    if (!pkg) {
      console.warn(`[purchases] package for plan "${plan}" not found`);
      return 'error';
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return syncFromInfo(customerInfo) ? 'success' : 'error';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (
      err?.userCancelled === true ||
      err?.code === 'PURCHASE_CANCELLED_ERROR' ||
      err?.code === '1'
    ) {
      return 'cancelled';
    }
    console.warn('[purchases] purchase failed', e);
    return 'error';
  }
}

/** Restore previous purchases. Returns true if the premium entitlement is active. */
export async function restorePurchases(): Promise<boolean> {
  if (isMockMode()) return useStore.getState().premium;
  const Purchases = await getSdk();
  if (!Purchases) return false;
  try {
    const info = await Purchases.restorePurchases();
    return syncFromInfo(info);
  } catch (e) {
    console.warn('[purchases] restore failed', e);
    return false;
  }
}

/** React hook: subscribe to the current premium status from the store. */
export function usePremium(): boolean {
  return useStore((s) => s.premium);
}
