import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

import {
  filterProfessionals,
  professionalAccessState,
  professionalCreatePayload,
  professionalInitials,
  professionalSaveError,
  teamEmptyMessage,
} from "../app/painel/profissionais/presentation.mjs";

const professionals = [
  { id: "1", name: "Álvaro Lima", phone: "11999990001", active: true },
  { id: "2", name: "Bruno Souza", phone: "11999990002", active: false },
  { id: "3", name: "Carla Mendes", phone: null, active: true },
];

test("professional save errors expose only approved copy, never provider details", () => {
  assert.equal(professionalSaveError({ message: "Telefone inválido." }), "Telefone inválido.");
  for (const error of [null, {}, { message: "private database detail" }, { message: "Telefone inválido. private data" }]) {
    assert.equal(professionalSaveError(error), "Não foi possível salvar os dados do profissional. Tente novamente.");
  }
});

test("team search ignores accents and combines with the operational status filter", () => {
  assert.deepEqual(
    filterProfessionals(professionals, "alvaro", "active").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(
    filterProfessionals(professionals, "11999990002", "inactive").map((item) => item.id),
    ["2"],
  );
  assert.deepEqual(
    filterProfessionals(professionals, "", "active").map((item) => item.id),
    ["1", "3"],
  );
});

test("new professional payload keeps contact data separate from access", () => {
  assert.deepEqual(
    professionalCreatePayload({
      barbershopId: "shop-1",
      name: "  João da Silva  ",
      phone: " 11999990000 ",
      contactEmail: " JOAO@EXAMPLE.COM ",
    }),
    {
      p_barbershop_id: "shop-1",
      p_name: "João da Silva",
      p_phone: "11999990000",
      p_contact_email: "joao@example.com",
    },
  );
});

test("new professional payload rejects invalid identity fields", () => {
  assert.throws(
    () => professionalCreatePayload({ barbershopId: "shop-1", name: "A", phone: "", contactEmail: "" }),
    /nome/i,
  );
  assert.throws(
    () => professionalCreatePayload({ barbershopId: "shop-1", name: "Ana", phone: "", contactEmail: "email-invalido" }),
    /e-mail/i,
  );
});

test("team access state prioritizes a membership over an invitation", () => {
  assert.equal(
    professionalAccessState(
      "1",
      [{ professional_id: "1", status: "active" }],
      [{ professional_id: "1", status: "pending", expires_at: "2099-01-01T00:00:00Z" }],
      Date.parse("2026-09-09T12:00:00Z"),
    ),
    "active",
  );
  assert.equal(
    professionalAccessState(
      "2",
      [{ professional_id: "2", status: "inactive" }],
      [],
      Date.parse("2026-09-09T12:00:00Z"),
    ),
    "inactive",
  );
});

test("team access state accepts only a pending invitation that has not expired", () => {
  assert.equal(
    professionalAccessState(
      "3",
      [],
      [{ professional_id: "3", status: "pending", expires_at: "2026-09-10T00:00:00Z" }],
      Date.parse("2026-09-09T12:00:00Z"),
    ),
    "pending",
  );
  assert.equal(
    professionalAccessState(
      "3",
      [],
      [{ professional_id: "3", status: "pending", expires_at: "2026-09-08T00:00:00Z" }],
      Date.parse("2026-09-09T12:00:00Z"),
    ),
    "none",
  );
});

test("team identity and empty messages stay useful in every list state", () => {
  assert.equal(professionalInitials("Maria Clara Santos"), "MC");
  assert.equal(professionalInitials("Jo"), "JO");
  assert.equal(professionalInitials(""), "PR");
  assert.equal(teamEmptyMessage(false), "Cadastre o primeiro profissional da equipe.");
  assert.equal(teamEmptyMessage(true), "Nenhum profissional corresponde aos filtros atuais.");
});

test("professional detail keeps photo, invitation and deactivation review flows explicit", async () => {
  const [page, migration] = await Promise.all([
    readFile(new URL("../app/painel/profissionais/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260909014503_gestao_v2_team_contracts.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\/convite\/equipe\?token=/);
  assert.match(page, /isSafePublicStorageImageUrl/);
  assert.match(page, /professional-images/);
  assert.match(page, /professional_deactivation_reviews/);
  assert.match(page, /resolve_professional_deactivation_review/);
  assert.match(migration, /create or replace function public\.resolve_professional_deactivation_review/);
  assert.match(migration, /revoke all on function public\.resolve_professional_deactivation_review\(uuid\) from public, anon/);
  assert.match(migration, /grant execute on function public\.resolve_professional_deactivation_review\(uuid\) to authenticated/);
});

test("pending professional invitation can be reissued, changed, revoked, copied, or shared by WhatsApp", async () => {
  const page = await readFile(new URL("../app/painel/profissionais/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(page, />Reenviar convite<\/button>/);
  assert.match(page, />Alterar e-mail<\/button>/);
  assert.match(page, />Revogar convite<\/button>/);
  assert.match(page, />Copiar link<\/button>/);
  assert.match(page, /Enviar pelo WhatsApp/);
  assert.match(page, /revoke_team_invitation/);
  assert.match(page, /management-invite-result/);
});

test("reissuing a professional invitation invalidates every pending link for that professional", async () => {
  const names = await readdir(new URL("../supabase/migrations/", import.meta.url));
  const matches = names.filter((name) => name.endsWith("_replace_professional_invitation.sql"));

  assert.equal(matches.length, 1);
  const migration = await readFile(new URL(`../supabase/migrations/${matches[0]}`, import.meta.url), "utf8");
  assert.match(migration, /professional_id\s*=\s*p_professional_id[\s\S]*?status\s*=\s*'pending'/i);
  assert.match(migration, /set status = 'revoked'[\s\S]*?professional_id\s*=\s*p_professional_id/i);
});

test("professional actions show contextual feedback beside their own controls", async () => {
  const page = await readFile(new URL("../app/painel/profissionais/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(page, /import ActionFeedback from "\.\.\/\.\.\/ActionFeedback"/);
  assert.match(page, /type FeedbackScope =/);
  for (const scope of ["data", "commission", "schedule", "break", "block", "invite", "access", "operational", "review"]) {
    assert.match(page, new RegExp(`ActionFeedback[\\s\\S]{0,180}feedbackFor\\(\"${scope}\"\\)`));
  }
  assert.doesNotMatch(page, /setMessage\("(?:Dados profissionais atualizados|Agenda personalizada salva|Pausa recorrente salva|Bloqueio pontual salvo)/);
});

test("team interactive controls use the terracotta redesign instead of dark legacy selection", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/painel/profissionais/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-ui.css", import.meta.url), "utf8"),
  ]);

  assert.match(css, /\.management-team-tabs button\[aria-selected="true"\][\s\S]*?background:\s*var\(--sp-accent\)/);
  assert.match(css, /\.management-professional-detail \.product-button:not\(\.secondary\):not\(\.danger\)[\s\S]*?background:\s*var\(--sp-accent\)/);
  assert.equal((page.match(/Novo profissional/g) ?? []).length, 1);
  assert.match(page, /product-page-head management-team-page-head[\s\S]*?management-team-new/);
  assert.doesNotMatch(css, /\.management-team-new[^}]*position:\s*fixed/);
  assert.match(css, /\.management-team-new\s*\{[^}]*background:\s*var\(--sp-accent\)/);
});

test("professional detail uses one full-width primary action pattern", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/painel/profissionais/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-ui.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /className="product-button secondary"[\s\S]{0,80}Salvar pausa/);
  assert.doesNotMatch(page, /className="product-button secondary"[\s\S]{0,80}Bloquear período/);
  assert.match(css, /\.management-professional-section \.management-action-area\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.management-professional-section \.management-action-area > \.product-button\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.management-availability-forms \.product-button\s*\{[^}]*width:\s*100%/);
});

test("new professional keeps navigation and action feedback in the redesign pattern", async () => {
  const [page, detailPage, css] = await Promise.all([
    readFile(new URL("../app/painel/profissionais/novo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/painel/profissionais/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-ui.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /mobileBackHref="\/painel\/profissionais"/);
  assert.match(page, /mobileBackLabel="Voltar"/);
  assert.match(page, /aria-label="Voltar">←<\/Link>/);
  assert.doesNotMatch(page, />← Voltar para Equipe<\/Link>/);
  assert.match(page, /management-professional-submit/);
  assert.match(page, /management-professional-cancel/);
  assert.match(page, /management-professional-form-feedback/);
  assert.match(page, /noValidate/);
  assert.match(detailPage, /management-back-link-icon/);
  assert.doesNotMatch(detailPage, />← Voltar para Equipe<\/Link>/);
  assert.match(css, /\.management-professional-submit\s*\{[^}]*background:\s*var\(--sp-accent\)/);
  assert.match(css, /\.management-professional-form-feedback\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
});
