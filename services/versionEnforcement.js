import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import VersionCheck from 'react-native-version-check';

const PACKAGE_NAME = 'com.mendozadev.pradoslahuerta';
const DEFAULT_ANDROID_STORE =
  'https://play.google.com/store/apps/details?id=com.mendozadev.pradoslahuerta';
const DEFAULT_IOS_STORE = 'https://apps.apple.com/app/idYOUR_ID';

export function getCurrentAppVersion() {
  return VersionCheck.getCurrentVersion() || Constants.expoConfig?.version || '0.0.0';
}

export function openStoreUrl(storeUrl) {
  const fallback = Platform.OS === 'ios' ? DEFAULT_IOS_STORE : DEFAULT_ANDROID_STORE;
  Linking.openURL(storeUrl || fallback).catch(() => {
    Linking.openURL(fallback);
  });
}

/**
 * Compares installed version with the version published on Google Play / App Store.
 * If the store cannot be reached, the user is allowed in (no backend fallback).
 */
export async function checkAppVersion() {
  const currentVersion = getCurrentAppVersion();
  const fallbackStore =
    Platform.OS === 'ios' ? DEFAULT_IOS_STORE : DEFAULT_ANDROID_STORE;

  try {
    const update = await VersionCheck.needUpdate({
      packageName: PACKAGE_NAME,
      ignoreErrors: false,
    });

    const storeUrl =
      (await VersionCheck.getStoreUrl({ packageName: PACKAGE_NAME }).catch(() => null)) ||
      fallbackStore;

    if (update?.isNeeded) {
      return {
        allowed: false,
        currentVersion: update.currentVersion || currentVersion,
        minVersion: update.latestVersion || null,
        storeUrl: update.storeUrl || storeUrl,
        checkFailed: false,
      };
    }

    return {
      allowed: true,
      currentVersion,
      minVersion: update?.latestVersion || null,
      storeUrl,
      checkFailed: false,
    };
  } catch (error) {
    console.log('[Version] Store check failed, allowing entry:', error?.message);
    return {
      allowed: true,
      currentVersion,
      minVersion: null,
      storeUrl: fallbackStore,
      checkFailed: true,
    };
  }
}
