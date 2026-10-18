export type SaturationStatus = 'underserved' | 'balanced' | 'saturated';

export interface NaicsSaturationOutput {
  per10kResidents: number;
  smoothedPer10k: number;
  saturationIndex: number;
  status: SaturationStatus;
}

export function computeNaicsSaturation(
  establishments: number,
  population: number,
  usAvgPer10k: number,
  smoothingPriorM: number = 10000
): NaicsSaturationOutput {
  if (population <= 0) {
    throw new Error('Population must be greater than zero');
  }
  if (establishments < 0) {
    throw new Error('Establishments cannot be negative');
  }
  if (usAvgPer10k <= 0) {
    throw new Error('US average per 10k must be positive');
  }

  // Raw density per 10,000 residents
  const per10kResidents = (establishments / population) * 10000;

  // Empirical Bayes smoothed rate
  const smoothedPer10k =
    (population * per10kResidents + smoothingPriorM * usAvgPer10k) /
    (population + smoothingPriorM);

  // Saturation index: 100 = exact national benchmark
  const saturationIndex = Math.max(0, Math.round((smoothedPer10k / usAvgPer10k) * 100));

  let status: SaturationStatus;
  if (saturationIndex < 80) {
    status = 'underserved';
  } else if (saturationIndex <= 120) {
    status = 'balanced';
  } else {
    status = 'saturated';
  }

  return {
    per10kResidents: Number(per10kResidents.toFixed(2)),
    smoothedPer10k: Number(smoothedPer10k.toFixed(2)),
    saturationIndex,
    status,
  };
}
