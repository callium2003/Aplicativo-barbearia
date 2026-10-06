import test from "node:test";
import assert from "node:assert/strict";
import { customerAuthRedirect, safeCustomerReturnPath } from "../app/customer-return-path.mjs";

const origin = "https://app.example.test";
const fallback = "/meus-agendamentos";

test("envia o login direto do cliente para Meus agendamentos", () => {
  assert.equal(safeCustomerReturnPath(null, origin), "/meus-agendamentos");
  assert.equal(safeCustomerReturnPath("/", origin), "/");
});

test("preserva destinos de cliente permitidos com query e hash internos", () => {
  assert.equal(safeCustomerReturnPath("/meus-agendamentos", origin), "/meus-agendamentos");
  assert.equal(safeCustomerReturnPath("/meu-perfil?aba=dados#contato", origin), "/meu-perfil?aba=dados#contato");
  assert.equal(safeCustomerReturnPath("/meu-perfil/privacidade?secao=direitos#exportacao", origin), "/meu-perfil/privacidade?secao=direitos#exportacao");
});

test("rejeita URLs absolutas, protocol-relative e de outra origem", () => {
  for (const value of ["https://evil.example/", "http://evil.example/", "//evil.example/meu-perfil", "https://app.example.test.evil.example/meu-perfil", "https://other.example.test/meu-perfil"]) {
    assert.equal(safeCustomerReturnPath(value, origin), fallback, value);
  }
});

test("rejeita barra invertida literal, codificada e duplamente codificada", () => {
  for (const value of ["/\\evil.example", "/%5Cevil.example", "/%255Cevil.example", "/meu-perfil?next=%5C%5Cevil.example"]) {
    assert.equal(safeCustomerReturnPath(value, origin), fallback, value);
  }
});

test("rejeita caracteres de controle literais e codificados", () => {
  for (const value of ["/meu-perfil\u0000", "/meu-perfil\u0009", "/meu-perfil?tab=contato%0A", "/meu-perfil?tab=%2500"]) {
    assert.equal(safeCustomerReturnPath(value, origin), fallback, JSON.stringify(value));
  }
});

test("rejeita credenciais, entrada não textual e rotas não permitidas", () => {
  for (const value of ["https://user:password@app.example.test/meu-perfil", undefined, 42, "/painel", "/meu-perfil/privacidade/extra", "/meus-agendamentos/extra"]) {
    assert.equal(safeCustomerReturnPath(value, origin), fallback, String(value));
  }
});

test("rejeita origem inválida ou protocolo não HTTP", () => {
  assert.equal(safeCustomerReturnPath("/meu-perfil", "not an origin"), fallback);
  assert.equal(safeCustomerReturnPath("/meu-perfil", "javascript:alert(1)"), fallback);
  assert.equal(safeCustomerReturnPath("/meu-perfil", "http://app.example.test"), "/meu-perfil");
});

test("retorna à barbearia após login sem permitir rotas administrativas ou loop de login", () => {
  assert.equal(safeCustomerReturnPath("/cullenbarba?reagendar=abc", origin), "/cullenbarba?reagendar=abc");
  for (const path of ["/entrar", "/painel", "/cliente/entrar", "/cadastro-inicial", "/auth", "/api", "/design", "/%65ntrar"]) {
    assert.equal(safeCustomerReturnPath(path, origin), fallback, path);
  }
});

test("usa um único callback do cliente preservando o destino e descartando origem externa", () => {
  const redirect = new URL(customerAuthRedirect(origin, "/cullenbarba?reagendar=abc"));
  assert.equal(redirect.origin, origin);
  assert.equal(redirect.pathname, "/cliente/entrar");
  assert.equal(redirect.searchParams.get("returnTo"), "/cullenbarba?reagendar=abc");
  assert.equal(new URL(customerAuthRedirect(origin, "//evil.example")).searchParams.get("returnTo"), fallback);
});
