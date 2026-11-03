import { getBrowserApi } from "./lib/browser";
import { initializeI18n, t } from "./lib/i18n";
import { loadConfig } from "./storage";

void updateActionTitle();

getBrowserApi().storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "memos.config" in changes) {
    void updateActionTitle();
  }
});

async function updateActionTitle(): Promise<void> {
  try {
    const config = await loadConfig();
    initializeI18n(config.language);
    await getBrowserApi().action.setTitle({ title: t("extension.actionTitle") });
  } catch (error) {
    console.info("Failed to update the action title", error);
  }
}
