export type ShortcutId =
  | 'shortcuts-modal'
  | 'undo'
  | 'redo'
  | 'open-upload-dialog'
  | 'pan'
  | 'zoom'
  | 'zoom-step'
  | 'export'
  | 'new-project'
  | 'switch-tool'
  | 'load-template-slot'
  | 'toggle-blur-type'
  | 'cycle-split-direction'
  | 'toggle-split-placement'
  | 'toggle-outlines'
  | 'radius-step'
  | 'strength-step';

export interface ShortcutDefinition {
  id: ShortcutId;
  label: string;
  keys: string;
}

export const EDITOR_SHORTCUTS: ShortcutDefinition[] = [
  {id: 'shortcuts-modal', label: 'Shortcuts', keys: 'MOD+/'},
  {id: 'undo', label: 'Undo', keys: 'MOD+Z'},
  {id: 'redo', label: 'Redo', keys: 'MOD+Y / MOD+Shift+Z'},
  {id: 'open-upload-dialog', label: 'Open file dialog', keys: 'MOD+U'},
  {id: 'pan', label: 'Pan', keys: 'Alt+Drag'},
  {id: 'zoom', label: 'Zoom', keys: 'Scroll'},
  {id: 'zoom-step', label: 'Zoom +/-', keys: 'MOD+←/→'},
  {id: 'export', label: 'Export', keys: 'MOD+E'},
  {id: 'new-project', label: 'New project', keys: 'MOD+N'},
  {id: 'switch-tool', label: 'Switch tool', keys: 'MOD+T'},
  {id: 'load-template-slot', label: 'Load template slot', keys: 'MOD+1-9'},
  {id: 'toggle-blur-type', label: 'Toggle blur type', keys: 'MOD+B'},
  {id: 'cycle-split-direction', label: 'Cycle direction', keys: 'MOD+D'},
  {id: 'toggle-split-placement', label: 'Cycle placement', keys: 'MOD+P'},
  {id: 'toggle-outlines', label: 'Toggle outlines', keys: 'MOD+O'},
  {id: 'radius-step', label: 'Radius +/-', keys: 'MOD+R+←/→/J/K'},
  {id: 'strength-step', label: 'Strength +/-', keys: 'MOD+S+←/→/J/K'},
];

const SHORTCUT_LOOKUP: Record<ShortcutId, ShortcutDefinition> = EDITOR_SHORTCUTS.reduce(
  (acc, shortcut) => {
    acc[shortcut.id] = shortcut;
    return acc;
  },
  {} as Record<ShortcutId, ShortcutDefinition>,
);

interface ShortcutFormatOptions {
  platform?: string;
}

export function isMacLikePlatform(platform = getPlatform()): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export function getModifierKeyLabel(options: ShortcutFormatOptions = {}): 'Cmd' | 'Ctrl' {
  return isMacLikePlatform(options.platform) ? 'Cmd' : 'Ctrl';
}

function getPlatform(): string {
  if (typeof navigator !== 'undefined' && typeof navigator.platform === 'string') {
    return navigator.platform;
  }
  if (typeof window !== 'undefined' && typeof window.navigator?.platform === 'string') {
    return window.navigator.platform;
  }
  return '';
}

export function formatShortcutKeys(keys: string, options: ShortcutFormatOptions = {}): string {
  return keys.replaceAll('MOD', getModifierKeyLabel(options));
}

export function getShortcutDefinition(shortcutId: ShortcutId): ShortcutDefinition {
  return SHORTCUT_LOOKUP[shortcutId];
}

export function formatShortcutById(
  shortcutId: ShortcutId,
  options: ShortcutFormatOptions = {},
): string {
  return formatShortcutKeys(getShortcutDefinition(shortcutId).keys, options);
}

export function formatShortcutTooltip(
  label: string,
  shortcutIds: ShortcutId[],
  options: ShortcutFormatOptions = {},
): string {
  const shortcutText = shortcutIds
    .map((shortcutId) => formatShortcutById(shortcutId, options))
    .join(' | ');
  return `${label} · ${shortcutText}`;
}
