import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client before importing the service
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn(() => chain),
      // expose chain so tests can control return values
      __chain: chain,
    },
  };
});

import { supabase } from "@/integrations/supabase/client";
import {
  getApplications,
  getApplicationStats,
  getApplication,
  createApplication,
  updateApplication,
  updateApplicationStage,
  deleteApplication,
} from "../applications.service";

const mockChain = (supabase as any).__chain;

function mockResolved(data: unknown, error: unknown = null, count: number | null = null) {
  // Make the final thenable resolve
  const result = Promise.resolve({ data, error, count });
  // Attach to every chain method so the last call works
  Object.keys(mockChain).forEach((key) => {
    if (typeof mockChain[key] === "function" && key !== "mockClear") {
      mockChain[key].mockReturnValue({
        ...mockChain,
        then: result.then.bind(result),
        catch: result.catch.bind(result),
      });
    }
  });
  // Also make the object itself thenable for direct awaits
  mockChain.then = result.then.bind(result);
  mockChain.catch = result.catch.bind(result);
  return result;
}

describe("applications.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getApplications", () => {
    it("returns applications and count on success", async () => {
      const fakeApps = [
        { id: "1", company_name: "Acme", role_title: "Engineer", current_stage: "applied" },
      ];
      mockResolved(fakeApps, null, 1);

      const result = await getApplications();
      expect(result.applications).toEqual(fakeApps);
      expect(result.count).toBe(1);
      expect(supabase.from).toHaveBeenCalledWith("applications");
    });

    it("applies stage filter when provided", async () => {
      mockResolved([], null, 0);
      await getApplications({ stage: "interview" });
      expect(mockChain.eq).toHaveBeenCalledWith("current_stage", "interview");
    });

    it("applies search filter with ilike on company and role", async () => {
      mockResolved([], null, 0);
      await getApplications({ search: "Google" });
      expect(mockChain.or).toHaveBeenCalledWith(
        "company_name.ilike.%Google%,role_title.ilike.%Google%"
      );
    });

    it("throws when supabase returns an error", async () => {
      mockResolved(null, { message: "DB error" });
      await expect(getApplications()).rejects.toEqual({ message: "DB error" });
    });
  });

  describe("getApplicationStats", () => {
    it("returns lightweight stats rows", async () => {
      const stats = [{ id: "1", current_stage: "applied", company_name: "Acme" }];
      mockResolved(stats);
      const result = await getApplicationStats();
      expect(result).toEqual(stats);
    });
  });

  describe("getApplication", () => {
    it("fetches a single application with resume join", async () => {
      const app = { id: "abc", company_name: "Acme", resume_versions: { label: "v1" } };
      mockResolved(app);
      const result = await getApplication("abc");
      expect(result).toEqual(app);
      expect(mockChain.eq).toHaveBeenCalledWith("id", "abc");
      expect(mockChain.single).toHaveBeenCalled();
    });
  });

  describe("createApplication", () => {
    it("inserts the payload", async () => {
      mockResolved(null);
      const payload = {
        user_id: "user-1",
        company_name: "Acme",
        role_title: "SWE",
        location: "Remote",
        employment_type: "full_time" as const,
        work_mode: "remote" as const,
        applied_date: "2026-09-01",
        current_stage: "applied" as const,
      };
      await createApplication(payload);
      expect(supabase.from).toHaveBeenCalledWith("applications");
      expect(mockChain.insert).toHaveBeenCalledWith(payload);
    });
  });

  describe("updateApplicationStage", () => {
    it("updates only the stage column", async () => {
      mockResolved(null);
      await updateApplicationStage("app-1", "interview");
      expect(mockChain.update).toHaveBeenCalledWith({ current_stage: "interview" });
      expect(mockChain.eq).toHaveBeenCalledWith("id", "app-1");
    });
  });

  describe("deleteApplication", () => {
    it("deletes by id", async () => {
      mockResolved(null);
      await deleteApplication("app-1");
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("id", "app-1");
    });
  });
});
