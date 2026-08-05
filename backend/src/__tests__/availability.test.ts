import { describe, expect, it } from "vitest";
import { generateSlotsForWindow } from "../availability";

describe("generateSlotsForWindow", () => {
  const day = new Date("2026-08-10T00:00:00"); // a Monday, arbitrary reference date

  it("generates evenly spaced slots for a full window", () => {
    const slots = generateSlotsForWindow(day, "09:00", "11:00", 30);
    expect(slots).toHaveLength(4);
    expect(slots[0].getHours()).toBe(9);
    expect(slots[0].getMinutes()).toBe(0);
    expect(slots[3].getHours()).toBe(10);
    expect(slots[3].getMinutes()).toBe(30);
  });

  it("does not produce a slot that would run past the window end", () => {
    // 09:00-10:00 window, 40-minute slots: only one slot fits (09:00-09:40),
    // a second would end at 10:20 which overruns the window.
    const slots = generateSlotsForWindow(day, "09:00", "10:00", 40);
    expect(slots).toHaveLength(1);
  });

  it("returns an empty array when the window is shorter than one slot", () => {
    const slots = generateSlotsForWindow(day, "09:00", "09:15", 30);
    expect(slots).toHaveLength(0);
  });

  it("handles a window that divides evenly with no remainder", () => {
    const slots = generateSlotsForWindow(day, "09:00", "12:00", 60);
    expect(slots).toHaveLength(3);
  });
});