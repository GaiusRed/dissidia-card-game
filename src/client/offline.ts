import { registerSW } from 'virtual:pwa-register';

export type OfflineStatus = 'installing' | 'ready' | 'update' | 'error';
export function registerOffline(onStatus: (status: OfflineStatus) => void): () => void {
  onStatus('installing');
  let update = () => {};
  update = registerSW({
    immediate: true,
    onOfflineReady: () => onStatus('ready'),
    onNeedRefresh: () => onStatus('update'),
    onRegisterError: () => onStatus('error'),
  });
  return () => update();
}
