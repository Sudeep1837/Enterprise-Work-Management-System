import axios from "axios";
import { apiUnavailableError, getApiErrorMessage, normalizeApiError } from "../services/apiErrors";

describe("api error helpers", () => {
  test("creates a recognizable API unavailable error", () => {
    const error = apiUnavailableError("Backend is sleeping");

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Backend is sleeping");
    expect(error.code).toBe("EWMS_API_UNAVAILABLE");
    expect(error.isApiUnavailable).toBe(true);
  });

  test("prefers server messages, then error messages, then fallback text", () => {
    expect(getApiErrorMessage({ response: { data: { message: "Email already exists" } } })).toBe(
      "Email already exists",
    );
    expect(getApiErrorMessage(new Error("Network failed"))).toBe("Network failed");
    expect(getApiErrorMessage(null, "Fallback copy")).toBe("Fallback copy");
  });

  test("passes through cancel and already-normalized unavailable errors", async () => {
    const cancel = new axios.Cancel("Request superseded");
    const unavailable = apiUnavailableError("Offline");

    await expect(normalizeApiError(cancel)).rejects.toBe(cancel);
    await expect(normalizeApiError(unavailable)).rejects.toBe(unavailable);
  });

  test("normalizes missing response errors into deployment-friendly unavailable errors", async () => {
    await expect(normalizeApiError(new Error("ECONNREFUSED"))).rejects.toMatchObject({
      code: "EWMS_API_UNAVAILABLE",
      isApiUnavailable: true,
      message: expect.stringContaining("Cannot reach the backend API"),
    });
  });

  test("keeps API response errors intact", async () => {
    const responseError = { response: { status: 422, data: { message: "Invalid role" } } };

    await expect(normalizeApiError(responseError)).rejects.toBe(responseError);
  });
});
