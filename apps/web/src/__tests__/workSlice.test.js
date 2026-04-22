import workReducer, { setTheme } from "../store/workSlice";

describe("work slice", () => {
  test("updates theme", () => {
    const next = workReducer(undefined, setTheme("dark"));
    expect(next.theme).toBe("dark");
  });

  test("adds project via fulfilled action", () => {
    const action = { type: "work/createProject/fulfilled", payload: { id: "p1", name: "Alpha" } };
    const next = workReducer(undefined, action);
    expect(next.projects[0].name).toBe("Alpha");
  });
});
