import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("management save feedback stays next to the action that caused it", async () => {
  const [feedback, agenda, availability, preferences, notifications, settingsPage, settingsIndex, shopProfile, businessHours, services, professionals, teamAccess, newProfessional] = await Promise.all([
    read("app/painel/ActionFeedback.tsx").catch(() => ""),
    read("app/painel/agenda/page.tsx"),
    read("app/painel/ProfessionalAvailability.tsx"),
    read("app/painel/configurar/NotificationPreferencesPanel.tsx"),
    read("app/painel/notificacoes/page.tsx"),
    read("app/painel/configurar/page.tsx"),
    read("app/painel/configurar/SettingsIndex.tsx"),
    read("app/painel/configurar/ShopProfileSection.tsx"),
    read("app/painel/configurar/BusinessHoursSection.tsx"),
    read("app/painel/configurar/ServicesSection.tsx"),
    read("app/painel/configurar/ProfessionalsSection.tsx"),
    read("app/painel/configurar/TeamAccessSection.tsx"),
    read("app/painel/profissionais/novo/page.tsx"),
  ]);

  assert.match(feedback, /role="status"/);
  assert.match(feedback, /aria-live="polite"/);
  assert.match(feedback, /management-action-feedback/);
  assert.match(agenda, /ActionFeedback/);
  assert.match(availability, /Salvar disponibilidade[\s\S]*?<ActionFeedback/);
  assert.match(preferences, /notification-preference-row[\s\S]*?<ActionFeedback/);
  assert.match(notifications, /Marcar todas como lidas[\s\S]*?<ActionFeedback/);
  assert.match(shopProfile, /management-shop-form-actions[\s\S]*?<ActionFeedback/);
  assert.match(services, /management-service-create-action[\s\S]*?<ActionFeedback/);
  assert.match(businessHours, /Salvar horários[\s\S]*?<ActionFeedback/);
  assert.match(settingsPage, /const actionMessage = message === "Carregando\.\.\."/);
  assert.match(newProfessional, /Salvar profissional[\s\S]*?<ActionFeedback message=\{message\} tone="error"/);
  assert.doesNotMatch(newProfessional, /\{message && <p className="product-message error"/);
  assert.match(agenda, /O período operacional desta agenda terminou/);
  assert.match(agenda, /role="status"/);
  assert.match(notifications, /setMessage\("Não foi possível carregar o histórico de notificações/);
  assert.doesNotMatch(notifications, /setMessage\("Não foi possível marcar/);
  const settings = settingsPage + settingsIndex + shopProfile + businessHours + services + professionals + teamAccess;
  assert.doesNotMatch(settings, /management-settings-status/);
});
