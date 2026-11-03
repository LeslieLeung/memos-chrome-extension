import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(["chrome", "browser"])("%s background", (namespace) => {
  it("sets the toolbar title at startup and when the language changes", async () => {
    let language = "en";
    const setTitle = vi.fn().mockResolvedValue(undefined);
    const addListener = vi.fn();
    vi.stubGlobal(namespace, {
      action: { setTitle },
      storage: {
        local: { get: async () => ({ "memos.config": { language } }) },
        onChanged: { addListener },
      },
    });
    vi.resetModules();
    await import("../src/background");

    await vi.waitFor(() => expect(setTitle).toHaveBeenCalledWith({ title: "Save to Memos" }));
    const onChanged = addListener.mock.calls[0][0];
    setTitle.mockClear();
    onChanged({ "memos.config": {} }, "session");
    onChanged({ "unrelated.key": {} }, "local");
    expect(setTitle).not.toHaveBeenCalled();

    language = "zh-CN";
    onChanged({ "memos.config": {} }, "local");
    await vi.waitFor(() => expect(setTitle).toHaveBeenCalledWith({ title: "保存到 Memos" }));
  });
});
