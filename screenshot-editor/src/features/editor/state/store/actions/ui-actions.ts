import type {EditorStoreActions} from '@/features/editor/state/types';
import type {StoreContext} from '@/features/editor/state/store/types';

export function createUiActions({
  set,
}: StoreContext): Pick<
  EditorStoreActions,
  | 'openExportModal'
  | 'closeExportModal'
  | 'setExportBaseName'
  | 'openShortcutsModal'
  | 'closeShortcutsModal'
  | 'toggleShortcutsModal'
  | 'openLightSelector'
  | 'resolveLightSelector'
> {
  return {
    openExportModal: () => set({showExportModal: true}),
    closeExportModal: () => set({showExportModal: false}),
    setExportBaseName: (name) => set({exportBaseName: name?.trim() || null}),

    openShortcutsModal: () => set({showShortcutsModal: true}),
    closeShortcutsModal: () => set({showShortcutsModal: false}),
    toggleShortcutsModal: () => set((state) => ({showShortcutsModal: !state.showShortcutsModal})),

    openLightSelector: ({firstImage, secondImage}) =>
      set({
        showLightSelectorModal: true,
        selectorFirstImage: firstImage,
        selectorSecondImage: secondImage,
        lightSelectorState: 'awaitingSelection',
      }),

    resolveLightSelector: (selection) =>
      set({
        showLightSelectorModal: false,
        selectorFirstImage: null,
        selectorSecondImage: null,
        lightSelectorState: selection === 'cancel' ? 'cancelled' : 'resolved',
      }),
  };
}
