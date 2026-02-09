import {describe, expect, it} from 'vitest';
import {
  getPersistedSettingsSlice,
  LEGACY_MIGRATION_KEY,
  loadLegacySettingsOnce,
} from '@/features/editor/state/persistence';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('editor persistence helpers', () => {
  it('loads legacy settings once and marks migration', () => {
    localStorage.removeItem(LEGACY_MIGRATION_KEY);
    localStorage.setItem('editor-split-ratio', '66');
    localStorage.setItem('editor-split-direction', 'horizontal');
    localStorage.setItem('editor-brush-radius', '31');
    localStorage.setItem('editor-brush-strength', '12');
    localStorage.setItem('editor-blur-type', 'pixelated');
    localStorage.setItem('editor-active-tool', 'blur');
    localStorage.setItem('editor-light-image-side', 'right');
    localStorage.setItem('editor-zoom', '140');

    const loaded = loadLegacySettingsOnce();
    expect(loaded.splitRatio).toBe(66);
    expect(loaded.splitDirection).toBe('horizontal');
    expect(loaded.brushRadius).toBe(31);
    expect(loaded.brushStrength).toBe(12);
    expect(loaded.blurType).toBe('pixelated');
    expect(loaded.activeTool).toBe('blur');
    expect(loaded.lightImageSide).toBe('right');
    expect(loaded.zoom).toBe(140);

    const second = loadLegacySettingsOnce();
    expect(second).toEqual({});
  });

  it('maps legacy select tool to drag tool', () => {
    localStorage.removeItem(LEGACY_MIGRATION_KEY);
    localStorage.setItem('editor-active-tool', 'select');

    const loaded = loadLegacySettingsOnce();
    expect(loaded.activeTool).toBe('drag');
  });

  it('partializes only persisted settings fields', () => {
    const persisted = getPersistedSettingsSlice({
      splitRatio: 55,
      splitDirection: 'vertical',
      brushRadius: 20,
      brushStrength: 9,
      blurType: 'normal',
      activeTool: 'drag',
      lightImageSide: 'left',
      zoom: 120,
    });

    expect(persisted).toEqual({
      splitRatio: 55,
      splitDirection: 'vertical',
      brushRadius: 20,
      brushStrength: 9,
      blurType: 'normal',
      activeTool: 'drag',
      lightImageSide: 'left',
      zoom: 120,
    });
  });

  it('migrates persisted v1 select tool to drag', () => {
    const migrate = useEditorStore.persist.getOptions().migrate;
    expect(migrate).toBeTypeOf('function');

    const migrated = migrate?.({activeTool: 'select'} as never, 1) as {activeTool: string};
    expect(migrated.activeTool).toBe('drag');
  });
});
