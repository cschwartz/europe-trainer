import { useSyncExternalStore } from 'preact/compat';
import { getState, subscribe } from './store';
import type { Store } from '../types';

/** Subscribe a component to the store. */
export function useStore(): Store {
  return useSyncExternalStore(subscribe, getState);
}
