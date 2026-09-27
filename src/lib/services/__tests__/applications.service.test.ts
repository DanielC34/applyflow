import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Fluent Supabase query builder mock.
 * Each chain method returns `this` so callers can `.select().eq().order()...`
 * The final awaitable resolves to `{ data, error, count }`.
 */
function createQueryMock(resolved: { data?: unknown; error?: unknown; count?: number | null }) {
  const result = {
    data: resolved.data ?? null,
    error: resolved.error ?? null,
    count: resolved.count ?? null,
  };

  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "or",
    "order",
    "range",
    "single",
    "insert",
    "update",
    "delete",
  ] as const;

  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // Make the chain thenable so `await query` works
  chain.then = (onFulfilled: (v: typeof result) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}

const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import {
  getApplications,
  getApplicationStats,
  getApplication,
  getApplicationForEdit,
  createApplication,
  updateApplication,
  updateApplicationStage,
  deleteApplication,
} from "../applications.service";

describe("applications.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getApplications", () => {
    it("returns applications and count on success", async () => {
      const fakeApps = [
        {
          id: "1",
          company_name: "Acme",
          role_title: "Engineer",
          current_stage: "applied",
        },
      ];
      fromMock.mockReturnValue(createQueryMock({ data: fakeApps, count: 1 }));

      const result = await getApplications();
      expect(result.applications).toEqual(fakeApps);
      expect(result.count).toBe(1);
      expect(fromMock).toHaveBeenCalledWith("applications");
    });

    it("applies stage filter when provided", async () => {
      const chain = createQueryMock({ data: [], count: 0 });
      fromMock.mockReturnValue(chain);

      await getApplications({ stage: "interview" });
      expect(chain.eq).toHaveBeenCalledWith("current_stage", "interview");
    });

    it("applies workMode filter when provided", async () => {
      const chain = createQueryMock({ data: [], count: 0 });
      fromMock.mockReturnValue(chain);

      await getApplications({ workMode: "remote" });
      expect(chain.eq).toHaveBeenCalledWith("work_mode", "remote");
    });

    it("applies search filter with ilike on company and role", async () => {
      const chain = createQueryMock({ data: [], count: 0 });
      fromMock.mockReturnValue(chain);

      await getApplications({ search: "Google" });
      expect(chain.or).toHaveBeenCalledWith(
        "company_name.ilike.%Google%,role_title.ilike.%Google%"
      );
    });

    it("does not apply search when search is empty/whitespace", async () => {
      const chain = createQueryMock({ data: [], count: 0 });
      fromMock.mockReturnValue(chain);

      await getApplications({ search: "   " });
      expect(chain.or).not.toHaveBeenCalled();
    });

    it("throws when supabase returns an error", async () => {
      fromMock.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );
      await expect(getApplications()).rejects.toEqual({ message: "DB error" });
    });
  });

  describe("getApplicationStats", () => {
    it("returns lightweight stats rows", async () => {
      const stats = [
        { id: "1", current_stage: "applied", company_name: "Acme" },
      ];
      fromMock.mockReturnValue(createQueryMock({ data: stats }));

      const result = await getApplicationStats();
      expect(result).toEqual(stats);
      expect(fromMock).toHaveBeenCalledWith("applications");
    });

    it("returns empty array when data is null", async () => {
      fromMock.mockReturnValue(createQueryMock({ data: null }));
      const result = await getApplicationStats();
      expect(result).toEqual([]);
    });
  });

  describe("getApplication", () => {
    it("fetches a single application with resume join", async () => {
      const app = {
        id: "abc",
        company_name: "Acme",
        resume_versions: { label: "v1" },
      };
      const chain = createQueryMock({ data: app });
      fromMock.mockReturnValue(chain);

      const result = await getApplication("abc");
      expect(result).toEqual(app);
      expect(chain.eq).toHaveBeenCalledWith("id", "abc");
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe("getApplicationForEdit", () => {
    it("fetches full row without joins", async () => {
      const app = { id: "abc", company_name: "Acme", role_title: "SWE" };
      const chain = createQueryMock({ data: app });
      fromMock.mockReturnValue(chain);

      const result = await getApplicationForEdit("abc");
      expect(result).toEqual(app);
      expect(chain.eq).toHaveBeenCalledWith("id", "abc");
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe("createApplication", () => {
    it("inserts the payload", async () => {
      const chain = createQueryMock({ data: null });
      fromMock.mockReturnValue(chain);

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
      expect(fromMock).toHaveBeenCalledWith("applications");
      expect(chain.insert).toHaveBeenCalledWith(payload);
    });

    it("throws on insert error", async () => {
      fromMock.mockReturnValue(
        createQueryMock({ error: { message: "insert failed" } })
      );
      await expect(
        createApplication({
          user_id: "u",
          company_name: "X",
          role_title: "Y",
        } as never)
      ).rejects.toEqual({ message: "insert failed" });
    });
  });

  describe("updateApplication", () => {
    it("updates by id", async () => {
      const chain = createQueryMock({ data: null });
      fromMock.mockReturnValue(chain);

      await updateApplication("app-1", { company_name: "NewCo" });
      expect(chain.update).toHaveBeenCalledWith({ company_name: "NewCo" });
      expect(chain.eq).toHaveBeenCalledWith("id", "app-1");
    });
  });

  describe("updateApplicationStage", () => {
    it("updates only the stage column", async () => {
      const chain = createQueryMock({ data: null });
      fromMock.mockReturnValue(chain);

      await updateApplicationStage("app-1", "interview");
      expect(chain.update).toHaveBeenCalledWith({ current_stage: "interview" });
      expect(chain.eq).toHaveBeenCalledWith("id", "app-1");
    });
  });

  describe("deleteApplication", () => {
    it("deletes by id", async () => {
      const chain = createQueryMock({ data: null });
      fromMock.mockReturnValue(chain);

      await deleteApplication("app-1");
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("id", "app-1");
    });
  });
});
