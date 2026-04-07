const { test, expect, _electron: electron } = require("@playwright/test");
const electronPath = require("electron");

test("app boots and shows title", async () => {
  const app = await electron.launch({
    executablePath: electronPath,
    args: ["."]
  });

  const page = await app.firstWindow();
  await expect(page.locator("h1")).toHaveText("Mani PDF Local");
  await app.close();
});
