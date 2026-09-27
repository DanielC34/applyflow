import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      expect(table).toBe("follow_up_reminders");
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                order: (...orderArgs: unknown[]) => {
                  mockOrder(...orderArgs);
                  return {
                    limit: mockLimit,
                    // allow await on order() for getRemindersForApplication
                    then: (
                      onFulfilled: (v: unknown) => unknown,
                      onRejected?: (e: unknown) => unknown
                    ) =>
                      Promise.resolve(
                        mockOrder.mock.results.at(-1)?.value ?? {
                          data: [],
                          error: null,
                        }
                      ).then(onFulfilled, onRejected),
                  };
                },
              };
            },
          };
        },
        insert: mockInsert,
        update: (...args: unknown[]) => {
          mockUpdate(...args);
          return { eq: mockEq };
        },
      };
    }),
  },
}));

import {
  getDashboardReminders,
  getRemindersForApplication,
  createReminder,
  markReminderDone,
} from "../reminders.service";

describe("reminders.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardReminders", () => {
    it("fetches pending reminders ordered by due date with limit", async () => {
      const reminders = [
        {
          id: "r1",
          title: "Follow up",
          due_date: "2026-10-01",
          status: "pending",
          applications: { company_name: "Acme", role_title: "SWE" },
        },
      ];
      mockLimit.mockResolvedValue({ data: reminders, error: null });

      const result = await getDashboardReminders(5);
      expect(result).toEqual(reminders);
      expect(mockEq).toHaveBeenCalledWith("status", "pending");
      expect(mockOrder).toHaveBeenCalledWith("due_date", { ascending: true });
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it("defaults limit to 10", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });
      await getDashboardReminders();
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("throws on error", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "fail" } });
      await expect(getDashboardReminders()).rejects.toEqual({ message: "fail" });
    });
  });

  describe("getRemindersForApplication", () => {
    it("returns reminders for one application ordered by due date", async () => {
      const rows = [{ id: "r1", title: "Ping recruiter", due_date: "2026-10-02" }];
      mockOrder.mockResolvedValue({ data: rows, error: null });

      const result = await getRemindersForApplication("app-1");
      expect(result).toEqual(rows);
      expect(mockEq).toHaveBeenCalledWith("application_id", "app-1");
      expect(mockOrder).toHaveBeenCalledWith("due_date", { ascending: true });
    });

    it("returns empty array when data is null", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await getRemindersForApplication("app-1");
      expect(result).toEqual([]);
    });
  });

  describe("createReminder", () => {
    it("inserts a trimmed title", async () => {
      mockInsert.mockResolvedValue({ error: null });
      await createReminder({
        applicationId: "app-1",
        userId: "user-1",
        title: "  Send thank-you  ",
        dueDate: "2026-10-05",
      });
      expect(mockInsert).toHaveBeenCalledWith({
        application_id: "app-1",
        user_id: "user-1",
        title: "Send thank-you",
        due_date: "2026-10-05",
      });
    });

    it("throws when insert fails", async () => {
      mockInsert.mockResolvedValue({ error: { message: "insert fail" } });
      await expect(
        createReminder({
          applicationId: "app-1",
          userId: "user-1",
          title: "x",
          dueDate: "2026-10-05",
        })
      ).rejects.toEqual({ message: "insert fail" });
    });
  });

  describe("markReminderDone", () => {
    it("sets status to done", async () => {
      mockEq.mockResolvedValue({ error: null });
      await markReminderDone("rem-1");
      expect(mockUpdate).toHaveBeenCalledWith({ status: "done" });
      expect(mockEq).toHaveBeenCalledWith("id", "rem-1");
    });

    it("throws when update fails", async () => {
      mockEq.mockResolvedValue({ error: { message: "update fail" } });
      await expect(markReminderDone("rem-1")).rejects.toEqual({
        message: "update fail",
      });
    });
  });
});
