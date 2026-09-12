# 📋 Registro de Trabalho — BarbeariaSP Platform
**Última atualização:** 2026-09-07  

---

> **Atualização de fechamento.** As seções históricas “PENDENTE” deste arquivo foram superadas para a implementação da área do cliente: `/meus-agendamentos`, gerenciamento inline, `/meu-perfil`, preferências e privacidade foram redesenhados. Os blocos 3.1–3.4 foram aprovados manualmente; Privacidade ainda requer captura autenticada repetível. O registro canônico do lote é [docs/REDESIGN-STAGES-1-3-20260907.md](docs/REDESIGN-STAGES-1-3-20260907.md). As pendências de gestão continuam fora desse fechamento.

## ✅ O QUE FOI FEITO (comprovado com evidência visual)

### 1. Tela pública `/cullenbarba` — CONCLUÍDA

**Mockup de referência:** `exec-7b8e1062-967b-463a-8940-1599a64364fc.png`

**Implementado:**
- [x] Foto de barbearia real (220px altura, borda a borda, bordas inferiores arredondadas 26px)
- [x] Nome da barbearia em Georgia serif
- [x] Endereço com ícone 📍
- [x] Botão CTA terracota `[ 📅 Agendar horário ]` — largura total
- [x] Botões `[ 💬 WhatsApp ]` e `[ 📍 Como chegar ]` lado a lado, fundo branco
- [x] Seção "Serviços" com 4 ícones circulares
- [x] Seção "Nossa equipe" com 4 fotos circulares
- [x] Card "Horários de atendimento"
- [x] Card "Endereço e contato"
- [x] Navegação inferior fixa

**Assets criados em `public/`:**
- `barbearia-central-hero.png`, `marketing-barbershop-hero.png`
- `services/corte.png`, `barba.png`, `corte-barba.png`, `sobrancelha.png`
- `team/rafael.png`, `lucas.png`, `thiago.png`, `pedro.png`

---

## ⚠️ PENDENTE

### 2. `/meus-agendamentos` — `app/meus-agendamentos/page.tsx`
**Mockup:** `exec-50102b10-9fb5-4043-b0d1-2acf742038b0.png`
- [ ] Capa fotográfica com bordas arredondadas inferiores
- [ ] Saudação "Olá, [nome]" em Georgia h1
- [ ] Card de agendamento confirmado (status verde)
- [ ] Card "Próximo agendamento" com data grande em Georgia
- [ ] 3 botões: Reagendar (terracota outlined), Cancelar (cinza), WhatsApp (verde)
- [ ] Menu lista iOS: Meus agendamentos / Meus dados / Preferências / Privacidade
- [ ] Link Sair no rodapé

### 3. `/painel/configurar` — `app/painel/configurar/page.tsx`
**Mockups:** `exec-678493c7`, `exec-85bb4d42`, `exec-493eed7c`
- [ ] Hub principal lista iOS (6 grupos)
- [ ] Tela Dados da barbearia (foto circular, campos, botão Salvar preto)
- [ ] Tela Profissional (foto, cargo, agenda, horários)

---

## 📐 REGRAS DE DESIGN

### Paleta
| Token | Hex |
|-------|-----|
| Terracota (CTAs) | `#B45334` |
| Fundo página | `#FAF8F5` |
| Texto principal | `#1C1917` |
| Texto secundário | `#786E64` |
| Borda card | `#EDE6DD` |
| Círculo ícone fundo | `#EFE9DF` |

### Tipografia
- Títulos: **Georgia, serif**
- Corpo: -apple-system, Roboto, sans-serif
- h1 hero: `clamp(36px, 4vw, 56px)`, weight 700

### Layout
- Largura máxima: **480px**
- Padding horizontal: **20px**
- Mobile-first (design para 390px)

### Componentes-padrão
- Foto hero: 220px, `border-bottom-radius: 26px`
- Botão primário: `#B45334`, radius 14px, height 58px, width 100%
- Botão secundário: branco, `border: 1px solid #E2D7CC`, radius 12px
- Card: branco, `border: 1px solid #EDE6DD`, radius 18px, padding 18px
- Nav inferior: fixed, 64px, `background: rgba(255,255,255,0.96)`, blur 18px

### Restrições absolutas
1. **NÃO alterar** banco Supabase (schemas, RPCs, políticas)
2. **NÃO alterar** os 25 testes em `tests/` — devem ficar 100% verdes
3. **NÃO alterar** `globals.css` — usar só CSS Modules
4. **NÃO alterar** rotas de autenticação (`/entrar`, `/cadastro-inicial`)
5. `tsc --noEmit` deve retornar zero erros sempre

---

## 🗂️ Arquivos-chave modificados

```
app/[slug]/page.tsx                 ← MODIFICADO (hero, showcase sections)
app/[slug]/public-page.module.css   ← MODIFICADO (layout, showcase, info cards)
app/meus-agendamentos/page.tsx      ← PENDENTE
app/painel/configurar/page.tsx      ← PENDENTE
public/barbearia-central-hero.png   ← NOVO
public/services/*.png               ← NOVO
public/team/*.png                   ← NOVO
```

## 🖼️ Mockups de referência

```
C:\Users\calli\.codex\generated_images\01a074af-90ce-7743-80c1-20f2e2f9e8c9\
├── exec-7b8e1062-...  ← /cullenbarba (página pública) — FEITO
├── exec-4952101c-...  ← /cullenbarba (seleção de serviços/profissional)
├── exec-50102b10-...  ← /meus-agendamentos — PENDENTE
├── exec-678493c7-...  ← /painel/configurar (hub) — PENDENTE
├── exec-85bb4d42-...  ← /painel/configurar (dados da barbearia) — PENDENTE
└── exec-493eed7c-...  ← /painel/configurar (profissional) — PENDENTE
```
