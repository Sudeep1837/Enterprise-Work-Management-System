import {
  formatManagerName,
  formatRoleLabel,
  formatStatusLabel,
  formatTeamLabel,
  getRoleColors,
} from "../lib/formatters";

describe("display formatters", () => {
  test("formats known roles and safely falls back for missing or custom roles", () => {
    expect(formatRoleLabel("ADMIN")).toBe("Admin");
    expect(formatRoleLabel("manager")).toBe("Manager");
    expect(formatRoleLabel("contractor")).toBe("contractor");
    expect(formatRoleLabel()).toBe("\u2014");
  });

  test("returns role badge colors with a safe employee-style default", () => {
    expect(getRoleColors("admin")).toMatchObject({ dot: "bg-purple-500" });
    expect(getRoleColors("MANAGER")).toMatchObject({ dot: "bg-indigo-500" });
    expect(getRoleColors("unknown")).toMatchObject({ dot: "bg-slate-400" });
    expect(getRoleColors()).toMatchObject({ text: expect.stringContaining("slate") });
  });

  test("formats team, status, and manager fields for null-safe UI display", () => {
    expect(formatTeamLabel("Platform")).toBe("Platform");
    expect(formatTeamLabel("   ")).toBe("\u2014");
    expect(formatStatusLabel(true)).toBe("Active");
    expect(formatStatusLabel(false)).toBe("Inactive");
    expect(formatManagerName({ id: "m1", name: "Mina Manager" })).toBe("Mina Manager");
    expect(formatManagerName("raw-object-id")).toBe("\u2014");
    expect(formatManagerName(null)).toBe("\u2014");
  });
});
