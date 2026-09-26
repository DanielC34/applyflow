import { describe, it, expect } from "vitest";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  NOTE_TYPE_LABELS,
} from "../types";

describe("domain constants", () => {
  it("APPLICATION_STAGES contains the full pipeline in order", () => {
    expect(APPLICATION_STAGES).toEqual([
      "wishlist",
      "applied",
      "assessment",
      "interview",
      "offer",
      "rejected",
      "archived",
    ]);
  });

  it("STAGE_LABELS covers every stage", () => {
    for (const stage of APPLICATION_STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
      expect(typeof STAGE_LABELS[stage]).toBe("string");
    }
  });

  it("STAGE_COLORS covers every stage", () => {
    for (const stage of APPLICATION_STAGES) {
      expect(STAGE_COLORS[stage]).toMatch(/^bg-stage-/);
    }
  });

  it("EMPLOYMENT_TYPE_LABELS has expected keys", () => {
    expect(EMPLOYMENT_TYPE_LABELS.full_time).toBe("Full Time");
    expect(EMPLOYMENT_TYPE_LABELS.internship).toBe("Internship");
  });

  it("WORK_MODE_LABELS has expected keys", () => {
    expect(WORK_MODE_LABELS.remote).toBe("Remote");
    expect(WORK_MODE_LABELS.hybrid).toBe("Hybrid");
    expect(WORK_MODE_LABELS.onsite).toBe("On-site");
  });

  it("NOTE_TYPE_LABELS has expected keys", () => {
    expect(NOTE_TYPE_LABELS.note).toBe("Note");
    expect(NOTE_TYPE_LABELS.status_change).toBe("Status Change");
    expect(NOTE_TYPE_LABELS.follow_up).toBe("Follow-up");
  });
});
