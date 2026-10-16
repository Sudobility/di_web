/**
 * Web implementation of AlertInterface using a modal dialog.
 *
 * Unlike the native alert used on React Native, the web has no built-in modal
 * confirmation, so this service manages modal state internally and exposes it
 * to a React component (`AlertModal`) rendered at the app root. Pressing a
 * button fires its callback and dismisses the modal.
 *
 * @ai-context Web AlertInterface implementation using a modal
 * @ai-pattern Observable singleton service with React subscription
 * @ai-usage Initialize once at startup and render <AlertModal /> at the app root
 *
 * @example
 * ```tsx
 * // In your app root:
 * import { AlertModal, initializeAlertService } from '@sudobility/di_web';
 * initializeAlertService();
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <AlertModal />
 *     </>
 *   );
 * }
 *
 * // Anywhere:
 * import { getAlertService } from '@sudobility/di';
 * getAlertService().alert('Title', 'Message', [
 *   { text: 'Cancel', style: 'cancel' },
 *   { text: 'OK', onPress: () => doThing() },
 * ]);
 * ```
 */

import {
  type AlertInterface,
  type AlertButton,
  initializeAlertService as initializeDiAlertService,
} from '@sudobility/di/interfaces';
import { Optional } from '@sudobility/types';

/**
 * Modal state managed by the service.
 */
export interface AlertState {
  isVisible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

/**
 * Listener function type for state changes.
 */
export type AlertStateListener = (state: AlertState) => void;

/**
 * Web implementation of AlertInterface using a modal dialog.
 *
 * Manages modal state internally and notifies subscribers of changes.
 *
 * @ai-pattern Observable service pattern for React integration
 */
export class WebAlertService implements AlertInterface {
  private state: AlertState = {
    isVisible: false,
    title: '',
    message: '',
    buttons: [],
  };

  private listeners: Set<AlertStateListener> = new Set();

  /**
   * Subscribe to modal state changes.
   *
   * The listener is immediately called with the current state upon subscription.
   *
   * @returns An unsubscribe function.
   */
  subscribe(listener: AlertStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the current modal state.
   */
  getState(): AlertState {
    return this.state;
  }

  /**
   * Show a modal alert dialog with the given title, message and buttons.
   *
   * When no buttons are provided, a single "OK" button is shown.
   */
  alert(
    title: string,
    message?: Optional<string>,
    buttons?: Optional<AlertButton[]>
  ): void {
    const resolvedButtons =
      buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    this.setState({
      isVisible: true,
      title,
      message: message ?? '',
      buttons: resolvedButtons,
    });
  }

  /**
   * Handle a button press: dismiss the modal, then fire the button callback.
   *
   * Called by the `AlertModal` component.
   */
  handlePress(button: AlertButton): void {
    this.dismiss();
    button.onPress?.();
  }

  /**
   * Dismiss the modal without firing any button callback.
   */
  dismiss(): void {
    this.setState({
      ...this.state,
      isVisible: false,
    });
  }

  private setState(newState: AlertState): void {
    this.state = newState;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

/**
 * Create a WebAlertService instance.
 */
export function createWebAlertService(): WebAlertService {
  return new WebAlertService();
}

// Singleton instance
let alertServiceInstance: WebAlertService | null = null;

/**
 * Initialize the alert service singleton.
 *
 * Also registers with `@sudobility/di` so `getAlertService()` works from both
 * packages. If already initialized, this call is a no-op.
 *
 * @param service - WebAlertService instance (optional, creates one if not provided)
 */
export function initializeAlertService(service?: WebAlertService): void {
  if (alertServiceInstance) {
    return;
  }
  alertServiceInstance = service ?? new WebAlertService();
  // Also register with @sudobility/di so getAlertService() from that package works
  initializeDiAlertService(alertServiceInstance);
}

/**
 * Get the alert service singleton.
 *
 * @throws Error if not initialized
 */
export function getAlertService(): WebAlertService {
  if (!alertServiceInstance) {
    throw new Error(
      'Alert service not initialized. Call initializeAlertService() at app startup.'
    );
  }
  return alertServiceInstance;
}

/**
 * Reset alert service (for testing only)
 */
export function resetAlertService(): void {
  alertServiceInstance = null;
}
