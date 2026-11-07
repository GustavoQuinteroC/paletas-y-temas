import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('arma la paleta triádica por defecto con su gris', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.escala')).toHaveCount(4);
  await expect(page.locator('.escala h3')).toHaveText(['primario', 'secundario', 'acento', 'neutro']);
  await expect(page.getByRole('button', { name: /primario \d+: #2350ff, copiar/ })).toBeVisible();
});

test('cambia la armonía y guarda el estado en la URL', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Complementaria', { exact: true }).click();
  await expect(page.locator('.escala')).toHaveCount(3);
  await page.getByLabel('Color base', { exact: true }).fill('#00c389');
  await expect(page).toHaveURL(/#base=00c389&armonia=complementaria/);
  await page.reload();
  await expect(page.getByLabel('Color base', { exact: true })).toHaveValue('#00c389');
  await expect(page.locator('.escala')).toHaveCount(3);
});

test('avisa cuando el color no es válido sin romper la página', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Color base', { exact: true }).fill('azul');
  await expect(page.getByText('Escribe un color hexadecimal')).toBeVisible();
  await expect(page.locator('.escala')).toHaveCount(4);
});

test('exporta a Tailwind 4 y Bootstrap', async ({ page }) => {
  await page.goto('./#base=2350ff&armonia=analoga');
  await page.getByLabel('Formato', { exact: true }).selectOption('tailwind4');
  await expect(page.locator('.codigo').first()).toContainText('--color-primario-50:');
  await page.getByLabel('Formato', { exact: true }).selectOption('bootstrap');
  await expect(page.locator('.codigo').first()).toContainText('$primary: $primario-500;');
});

test('califica el contraste', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.contrastes li').first().locator('.nivel')).toHaveText(/AAA|AA/);
});
