import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencySymbol,
  formatSalary,
} from "../currency";

describe("currency utilities", () => {
  describe("CURRENCIES", () => {
    it("contains the expected set of currencies", () => {
      const codes = CURRENCIES.map((c) => c.code);
      expect(codes).toContain("USD");
      expect(codes).toContain("EUR");
      expect(codes).toContain("GBP");
      expect(codes).toContain("ZMW");
      expect(codes).toContain("JPY");
      expect(CURRENCIES.length).toBeGreaterThanOrEqual(10);
    });

    it("every currency has unique code, symbol and name", () => {
      const codes = new Set<string>();
      for (const c of CURRENCIES) {
        expect(c.code).toBeTruthy();
        expect(c.symbol).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(codes.has(c.code)).toBe(false);
        codes.add(c.code);
      }
    });
  });

  describe("getCurrencySymbol", () => {
    it("returns correct symbols for known codes", () => {
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("JPY")).toBe("¥");
      expect(getCurrencySymbol("ZMW")).toBe("K");
    });

    it("falls back to the code itself for unknown currencies", () => {
      expect(getCurrencySymbol("XYZ")).toBe("XYZ");
    });
  });

  describe("formatSalary", () => {
    it("formats a normal salary with default USD when currency is null", () => {
      expect(formatSalary(80000, null)).toBe("$80,000");
    });

    it("formats with explicit USD", () => {
      expect(formatSalary(80000, "USD")).toBe("$80,000");
    });

    it("formats with other currencies", () => {
      expect(formatSalary(65000, "EUR")).toBe("€65,000");
      expect(formatSalary(18000, "ZMW")).toBe("K18,000");
    });

    it("returns em-dash for null amount", () => {
      expect(formatSalary(null, "USD")).toBe("—");
    });

    it("returns em-dash for zero amount", () => {
      expect(formatSalary(0, "USD")).toBe("—");
    });

    it("formats large numbers with locale separators", () => {
      const formatted = formatSalary(1250000, "USD");
      expect(formatted.startsWith("$")).toBe(true);
      expect(formatted).toContain("1");
      expect(formatted).toContain("250");
    });
  });

  describe("DEFAULT_CURRENCY", () => {
    it("is USD", () => {
      expect(DEFAULT_CURRENCY).toBe("USD");
    });
  });
});
