import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      expect(table).toBe("application_notes");
      return {
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder,
          }),
        }),
        insert: mockInsert,
      };
    }),
  },
}));

import {
  getNotesForApplication,
  createNote,
  createStatusChangeNote,
} from "../notes.service";

describe("notes.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotesForApplication", () => {
    it("returns notes ordered newest first", async () => {
      const notes = [
        { id: "n2", content: "Second", created_at: "2026-09-02" },
        { id: "n1", content: "First", created_at: "2026-09-01" },
      ];
      mockOrder.mockResolvedValue({ data: notes, error: null });

      const result = await getNotesForApplication("app-1");
      expect(result).toEqual(notes);
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("application_id", "app-1");
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("returns empty array when data is null", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });
      const result = await getNotesForApplication("app-1");
      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "fail" } });
      await expect(getNotesForApplication("app-1")).rejects.toEqual({
        message: "fail",
      });
    });
  });

  describe("createNote", () => {
    it("inserts a trimmed note", async () => {
      mockInsert.mockResolvedValue({ error: null });
      await createNote({
        applicationId: "app-1",
        userId: "user-1",
        noteType: "note",
        content: "  Hello world  ",
      });
      expect(mockInsert).toHaveBeenCalledWith({
        application_id: "app-1",
        user_id: "user-1",
        note_type: "note",
        content: "Hello world",
      });
    });

    it("throws when insert fails", async () => {
      mockInsert.mockResolvedValue({ error: { message: "insert error" } });
      await expect(
        createNote({
          applicationId: "app-1",
          userId: "user-1",
          noteType: "note",
          content: "x",
        })
      ).rejects.toEqual({ message: "insert error" });
    });
  });

  describe("createStatusChangeNote", () => {
    it("creates a status_change note with the stage label", async () => {
      mockInsert.mockResolvedValue({ error: null });
      await createStatusChangeNote("app-1", "user-1", "Interview");
      expect(mockInsert).toHaveBeenCalledWith({
        application_id: "app-1",
        user_id: "user-1",
        note_type: "status_change",
        content: "Stage changed to Interview",
      });
    });
  });
});
