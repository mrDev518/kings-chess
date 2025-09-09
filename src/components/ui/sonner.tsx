import * as React from 'react';

export type ToastOptions = { description?: string };

function log(prefix: string, msg: string, opts?: ToastOptions) {
  // eslint-disable-next-line no-console
  console.log(`${prefix}`, msg, opts?.description ? `— ${opts.description}` : '');
}

export const toast = Object.assign(
  (msg: string, opts?: ToastOptions) => log('[toast]', msg, opts),
  {
    success: (msg: string, opts?: ToastOptions) => log('[toast:success]', msg, opts),
    error:   (msg: string, opts?: ToastOptions) => log('[toast:error]', msg, opts),
    info:    (msg: string, opts?: ToastOptions) => log('[toast:info]', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => log('[toast:warn]', msg, opts),
  }
);

export const Toaster: React.FC = () => null; // renderless placeholder
