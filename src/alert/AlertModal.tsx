/**
 * React components for AlertInterface integration on web.
 *
 * Provides the useAlertModal hook and AlertModal component that automatically
 * subscribe to the WebAlertService singleton. Render <AlertModal /> once at the
 * app root to display alert dialogs.
 */

import React, { useState, useEffect, CSSProperties } from 'react';
import {
  getAlertService,
  type AlertState,
  type WebAlertService,
} from './alert.web.js';
import type { AlertButton } from '@sudobility/di/interfaces';

/**
 * Hook to subscribe to the alert service modal state.
 *
 * @returns The current modal state and the alert service.
 */
export function useAlertModal(): {
  state: AlertState;
  service: WebAlertService;
} {
  const service = getAlertService();
  const [state, setState] = useState<AlertState>(service.getState());

  useEffect(() => {
    return service.subscribe(setState);
  }, [service]);

  return { state, service };
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  padding: 24,
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 8,
  padding: 20,
  backgroundColor: 'var(--background, #ffffff)',
  color: 'var(--foreground, #111111)',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 8,
};

const messageStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.4,
  marginBottom: 20,
  opacity: 0.85,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 10,
};

const baseButtonStyle: CSSProperties = {
  minWidth: 96,
  minHeight: 40,
  borderRadius: 6,
  paddingInline: 16,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid rgba(0, 0, 0, 0.15)',
  backgroundColor: 'transparent',
  color: 'inherit',
};

function buttonStyleFor(style?: AlertButton['style']): CSSProperties {
  if (style === 'destructive') {
    return {
      ...baseButtonStyle,
      border: 'none',
      backgroundColor: 'var(--destructive, #dc2626)',
      color: '#ffffff',
    };
  }
  if (style === 'cancel') {
    return { ...baseButtonStyle, fontWeight: 500 };
  }
  return baseButtonStyle;
}

/**
 * Modal component that automatically connects to the alert service singleton.
 *
 * Render this once in your app root to display alert dialogs.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <AlertModal />
 *     </>
 *   );
 * }
 * ```
 */
export function AlertModal(): React.ReactElement | null {
  const { state, service } = useAlertModal();

  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      style={overlayStyle}
      role="presentation"
      onClick={() => service.dismiss()}
    >
      <div
        style={dialogStyle}
        role="alertdialog"
        aria-modal="true"
        aria-label={state.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={titleStyle}>{state.title}</div>
        {state.message ? <div style={messageStyle}>{state.message}</div> : null}
        <div style={actionsStyle}>
          {state.buttons.map((button, index) => (
            <button
              key={`${button.text}-${index}`}
              type="button"
              style={buttonStyleFor(button.style)}
              onClick={() => service.handlePress(button)}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
