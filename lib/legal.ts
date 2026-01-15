const TERMS_DATE_INPUT = "January 15, 2025";
const PRIVACY_DATE_INPUT = "January 15, 2025";

const parseLegalDate = (value: string): Date => {
  const normalized = value.trim();
  const slashParts = normalized.split("/");
  if (slashParts.length === 3) {
    const [rawMonth, rawDay, rawYear] = slashParts;
    const month = Number.parseInt(rawMonth, 10);
    const day = Number.parseInt(rawDay, 10);
    let year = Number.parseInt(rawYear, 10);
    if (String(year).length <= 2) {
      year += 2000;
    }
    if (
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      Number.isFinite(year)
    ) {
      return new Date(year, month - 1, day);
    }
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid legal date: ${value}`);
  }
  return parsed;
};

const formatFullMonthDate = (date: Date) =>
  `${date.toLocaleString("en-US", { month: "long" })} ${date.getDate()}, ${
    date.getFullYear()
  }`;

const formatVersionIdentifier = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export const TERMS_LAST_UPDATED = parseLegalDate(TERMS_DATE_INPUT);
export const PRIVACY_LAST_UPDATED = parseLegalDate(PRIVACY_DATE_INPUT);

export const TERMS_VERSION = formatVersionIdentifier(TERMS_LAST_UPDATED);
export const PRIVACY_VERSION = formatVersionIdentifier(PRIVACY_LAST_UPDATED);

export const termsLastUpdatedDisplay = formatFullMonthDate(TERMS_LAST_UPDATED);
export const privacyLastUpdatedDisplay = formatFullMonthDate(
  PRIVACY_LAST_UPDATED
);
export const formatLegalDate = formatFullMonthDate;
