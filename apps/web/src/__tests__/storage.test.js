import { readStorage } from "../lib/storage";

describe("storage helpers", () => {
  test("returns defaults when localStorage is empty", () => {
    localStorage.clear();
    const data = readStorage();
    expect(data.theme).toBe("light");
    expect(data.projects).toBeUndefined(); // Backend drives business data now
  });
});
