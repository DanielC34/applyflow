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
      if (table === "follow_up_reminders") {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: mockOrder.mockReturnValue({
                limit: mockLimit,
              }),
            }),
          }),
          insert: mockInsert,
          update: mockUpdate.mockReturnValue({
            eq: mockEq,
          }),
        };
      }
      return {};
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
    it("fetches pending reminders with application join and limit", async () => {
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
  });

  describe("getRemindersForApplication", () => {
    it("returns reminders for one application", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder,
        }),
      });

      const result = await getRemindersForApplication("app-1");
      expect(result).toEqual([]);
      expect(mockEq).toHaveBeenCalledWith("application_id", "app-1");
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
  });

  describe("markReminderDone", () => {
    it("sets status to done", async () => {
      mockEq.mockResolvedValue({ error: null });
      await markReminderDone("rem-1");
      expect(mockUpdate).toHaveBeenCalledWith({ status: "done" });
      expect(mockEq).toHaveBeenCalledWith("id", "rem-1");
    });
  });
});
