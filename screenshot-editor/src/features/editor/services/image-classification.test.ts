import {beforeEach, describe, expect, it, vi} from 'vitest';
import {classifyByLuminance} from '@/features/editor/services/image-classification';

vi.mock('@/features/editor/services/luminance', () => ({
  computeAverageLuminance: vi.fn(),
}));

import {computeAverageLuminance} from '@/features/editor/services/luminance';

const mockedComputeAverageLuminance = vi.mocked(computeAverageLuminance);

describe('classifyByLuminance', () => {
  beforeEach(() => {
    mockedComputeAverageLuminance.mockReset();
  });

  it('returns resolved when luminance difference is clear', async () => {
    mockedComputeAverageLuminance.mockResolvedValueOnce(210).mockResolvedValueOnce(40);

    const result = await classifyByLuminance('light', 'dark');

    expect(result).toEqual({status: 'resolved', lightImage: 'light', darkImage: 'dark'});
  });

  it('returns uncertain when luminance difference is small', async () => {
    mockedComputeAverageLuminance.mockResolvedValueOnce(100).mockResolvedValueOnce(95);

    const result = await classifyByLuminance('first', 'second', 12);

    expect(result).toEqual({status: 'uncertain'});
  });
});
