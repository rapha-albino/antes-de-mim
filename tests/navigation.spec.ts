import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const purchaseUrl = "https://softwarezen.com.br/livros/antes-de-mim/";

test("the main navigation reaches every on-page section", async ({ page }) => {
  await page.goto("/");

  for (const [label, id] of [
    ["O livro", "livro"],
    ["Caminhos", "caminhos"],
    ["A conversa", "conversa"],
    ["Leituras", "vozes"],
    ["Autor", "autor"],
    ["Encontros", "encontros"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "location");
  }
});

test("every reading path leads to its essay and back to the reading paths", async ({ page }) => {
  await page.goto("/");

  for (const essay of [
    "/ensaios/esforco-de-ser-inteiro/",
    "/ensaios/ruptura-e-traicao-de-si/",
    "/ensaios/passado-nao-e-morada/",
  ]) {
    await page.goto("/");
    await page.locator(`a[href="${essay}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${essay}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "← Voltar aos caminhos de leitura" }).click();
    await expect(page).toHaveURL(/\/#caminhos$/);
  }
});

test("purchase and launch-video links point to their official destinations", async ({ page }) => {
  await page.goto("/");

  const purchaseLinks = page.locator(`a[href="${purchaseUrl}"]`);
  await expect(purchaseLinks).toHaveCount(4);
  await expect(purchaseLinks.first()).toHaveAttribute("target", "_blank");
  await expect(page.locator('a[href^="https://www.youtube.com/watch?v=UYHlW2VYCOo"]')).toHaveCount(6);
});

for (const [name, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 768, height: 1024 }],
] as const) {
  test(`the layout remains usable without horizontal overflow on a ${name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".site-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: "Adquirir", exact: true })).toBeVisible();
    expect(await page.locator("main").evaluate((main) => main.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("the keyboard skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/#conteudo$/);
  await expect(page.locator("main")).toBeFocused();
});

for (const path of [
  "/",
  "/ensaios/esforco-de-ser-inteiro/",
  "/ensaios/ruptura-e-traicao-de-si/",
  "/ensaios/passado-nao-e-morada/",
]) {
  test(`${path} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    // The embedded YouTube player is third-party content. Its host iframe has a title;
    // Axe does not audit its internal markup here.
    const results = await new AxeBuilder({ page }).exclude("iframe").analyze();
    expect(results.violations).toEqual([]);
  });
}

test("an unknown route offers a path back to the site", async ({ page }) => {
  await page.goto("/um-caminho-ausente");
  await expect(page.getByRole("heading", { name: "Este caminho não está mais aqui." })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await expect(page).toHaveURL(/\/$/);
});
