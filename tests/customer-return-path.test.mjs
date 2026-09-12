import test from "node:test";
import assert from "node:assert/strict";
import { safeCustomerReturnPath } from "../app/customer-return-path.mjs";

const origin = "https://app.example.test";
const fallback = "/meus-agendamentos";

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
  for (const value of ["https://user:password@app.example.test/meu-perfil", null, undefined, 42, "/painel", "/meu-perfil/privacidade/extra", "/meus-agendamentos/extra", "/"]) {
    assert.equal(safeCustomerReturnPath(value, origin), fallback, String(value));
  }
});

test("rejeita origem inválida ou protocolo não HTTP", () => {
  assert.equal(safeCustomerReturnPath("/meu-perfil", "not an origin"), fallback);
  assert.equal(safeCustomerReturnPath("/meu-perfil", "javascript:alert(1)"), fallback);
  assert.equal(safeCustomerReturnPath("/meu-perfil", "http://app.example.test"), "/meu-perfil");
});
