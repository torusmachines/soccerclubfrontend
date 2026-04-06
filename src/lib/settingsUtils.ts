const CONTRACT_EXPIRING_MONTHS_KEY = 'contractExpiringMonths';
export const DEFAULT_CONTRACT_EXPIRING_MONTHS = 6;

export const getContractExpiringMonths = (): number => {
  const raw = localStorage.getItem(CONTRACT_EXPIRING_MONTHS_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CONTRACT_EXPIRING_MONTHS;
  }
  return Math.floor(parsed);
};

export const setContractExpiringMonths = (months: number): void => {
  const sanitized = Number.isFinite(months) && months > 0 ? Math.floor(months) : DEFAULT_CONTRACT_EXPIRING_MONTHS;
  localStorage.setItem(CONTRACT_EXPIRING_MONTHS_KEY, String(sanitized));
};
