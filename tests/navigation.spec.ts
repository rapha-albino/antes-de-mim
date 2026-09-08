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
    await page.getByRole("link", { name: "← Voltar aos caminhos de leitura" }).last().click();
    await expect(page).toHaveURL(/\/#caminhos$/);
  }
});

test("the reader testimonials carousel exposes all eight reviews with accessible controls", async ({ page }) => {
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Relatos de leitura" });
  await expect(carousel.getByRole("figure")).toHaveCount(8);
  await expect(carousel.getByRole("button", { name: "Ver relato anterior" })).toBeEnabled();
  const next = carousel.getByRole("button", { name: "Ver próximo relato" });
  await next.click();
  await expect(page.locator("#testimonial-status")).toContainText("2 de 8");
  for (let index = 0; index < 7; index += 1) await next.click();
  await expect(page.locator("#testimonial-status")).toContainText("1 de 8");
});

test("the home page exposes search and sharing metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://antesdemim.art.br/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /29 ensaios/);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("essay pages retain the full site menu and offer a return at the end", async ({ page }) => {
  await page.goto("/ensaios/esforco-de-ser-inteiro/");
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Encontros", exact: true })).toHaveAttribute("href", "/#encontros");
  await expect(page.getByRole("link", { name: "← Voltar aos caminhos de leitura" })).toHaveCount(2);
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
    const menu = page.locator("[data-menu-toggle]");
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Adquirir", exact: true })).toBeVisible();
    expect(await page.locator("main").evaluate((main) => main.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("a mobile menu selection keeps the destination title visible below the fixed header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("[data-menu-toggle]").click();
  await page.getByRole("link", { name: "Encontros", exact: true }).click();
  await expect(page.locator("#titulo-encontros")).toBeInViewport();
  await expect(page.locator("[data-menu-toggle]")).toHaveAttribute("aria-expanded", "false");
});

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
