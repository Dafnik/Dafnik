import {computeAverageLuminance} from './luminance';

export const LUMINANCE_CONFIDENCE_THRESHOLD = 12;

export type PairClassificationResult =
  | {status: 'resolved'; lightImage: string; darkImage: string}
  | {status: 'uncertain'};

export async function classifyByLuminance(
  firstImage: string,
  secondImage: string,
  threshold = LUMINANCE_CONFIDENCE_THRESHOLD,
): Promise<PairClassificationResult> {
  try {
    const [firstLuminance, secondLuminance] = await Promise.all([
      computeAverageLuminance(firstImage),
      computeAverageLuminance(secondImage),
    ]);

    if (Math.abs(firstLuminance - secondLuminance) < threshold) {
      return {status: 'uncertain'};
    }

    return firstLuminance >= secondLuminance
      ? {status: 'resolved', lightImage: firstImage, darkImage: secondImage}
      : {status: 'resolved', lightImage: secondImage, darkImage: firstImage};
  } catch {
    return {status: 'uncertain'};
  }
}
