/**
 * @fileoverview Centralized web app initialization
 * @description Provides a single initialization function for web apps
 * that sets up all DI services in the correct order.
 */

import {
  initializeStorageService,
  initializeNetworkService,
  initializeFirebaseService,
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type FirebaseConfig,
  type AnalyticsEventParams,
} from '@sudobility/di/web';
import { initializeInfoService } from '../info/index.js';

// Re-export analytics types and functions from di for convenience
export {
  FirebaseAnalyticsService,
  initializeFirebaseAnalytics,
  getAnalyticsService,
  resetAnalyticsService,
  type AnalyticsEventParams,
};

// ============================================================================
// Web App Initialization
// ============================================================================

/**
 * Configuration options for web app initialization
 */
export interface WebAppInitOptions {
  /** Firebase configuration */
  firebaseConfig: FirebaseConfig;

  /** Options controlling which Firebase services to enable (analytics, messaging) */
  firebaseInitOptions?: import('@sudobility/di').FirebaseInitOptions;

  /** Optional: Initialize i18n (app-specific, pass your initializeI18n function) */
  initializeI18n?: () => void;

  /** Optional: Register service worker. Pass `true` to use the shared implementation, or a function for custom behavior. */
  registerServiceWorker?: boolean | (() => void);

  /** Optional: Initialize web vitals (app-specific, pass your function) */
  initWebVitals?: () => void;
}

/**
 * Initialize a web application with all required DI services.
 *
 * This function sets up services in the correct order:
 * 1. Storage service
 * 2. Firebase DI service (analytics, messaging, etc.)
 * 3. Firebase Analytics singleton
 * 4. Network service
 * 5. Info service
 * 6. i18n (if provided)
 * 7. Performance monitoring (if provided)
 *
 * Subscriptions/RevenueCat are intentionally NOT initialized here. RevenueCat is
 * optional and platform-specific; each app initializes it at startup via
 * `initializeSubscription` from @sudobility/subscription_lib with the adapter
 * from @sudobility/subscription_pages (web).
 *
 * Note: Firebase Auth is NOT initialized here. Apps using Firebase Auth should
 * call initializeFirebaseAuth() from @sudobility/auth_lib separately, or use
 * SudobilityAppWithFirebaseAuth from @sudobility/building_blocks which handles this.
 *
 * @param options - Configuration options
 * @returns The initialized analytics service
 */
export async function initializeWebApp(
  options: WebAppInitOptions
): Promise<FirebaseAnalyticsService> {
  const {
    firebaseConfig,
    firebaseInitOptions,
    initializeI18n,
    registerServiceWorker,
    initWebVitals,
  } = options;

  // 1. Initialize storage service
  initializeStorageService();

  // 2. Initialize Firebase DI service (analytics, messaging, etc.)
  initializeFirebaseService(firebaseConfig, firebaseInitOptions);

  // 3. Initialize Firebase Analytics singleton
  const analytics = initializeFirebaseAnalytics();

  // 4. Initialize network service (for online/offline status detection)
  // Note: For authenticated API calls, apps should use FirebaseAuthNetworkService directly
  // from @sudobility/auth_lib, which provides automatic token refresh on 401 responses.
  initializeNetworkService();

  // 5. Initialize info service
  initializeInfoService();

  // 6. Initialize i18n (app-specific)
  if (initializeI18n) {
    initializeI18n();
  }

  // 7. Initialize performance monitoring (app-specific)
  if (registerServiceWorker === true) {
    const { registerServiceWorker: register } =
      await import('../sw/register.js');
    register();
  } else if (typeof registerServiceWorker === 'function') {
    registerServiceWorker();
  }
  if (initWebVitals) {
    initWebVitals();
  }

  return analytics;
}
