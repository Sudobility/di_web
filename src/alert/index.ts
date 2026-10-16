/**
 * Alert service exports
 */

// Service and types
export {
  WebAlertService,
  createWebAlertService,
  initializeAlertService,
  getAlertService,
  resetAlertService,
  type AlertState,
  type AlertStateListener,
} from './alert.web.js';

// React components
export { AlertModal, useAlertModal } from './AlertModal.js';
