# Descobertas e Restrições (Findings)

## Estrutura Encontrada
- Raiz do projeto contém:
  - `.codex-worktrees/`
  - `.git/`
  - `.playwright-cli/`
  - `docs/`
  - `pagina barbearia/`
- Em `pagina barbearia/`:
  - `node_modules/` (com arquivos staged no git incorretamente ou sem .gitignore na raiz do repo)
  - `outputs/`
  - `supabase/`
  - `work/` (contém pastas de evidências, auditorias e submódulos/repositórios aninhados como `barbeariasp-platform`)
- `git status` possui centenas de arquivos em `node_modules` com tracking aberto e modificações não commitadas em submódulos.

## Status Legal e Documental: Termos de Uso
- **Situação Atual no Produto:**
  - Na Landing Page (`app/page.tsx`, linha 182), o item está visível como texto inativo: `<span className="legalPending">Termos de Uso — em preparação</span>`.
  - A suíte de testes (`tests/rendered-html.test.mjs`, linhas 53-57) possui uma asserção expressa proibindo que o rodapé aponte para um link `/termos` enquanto a rota e o conteúdo aprovado não existirem (`assert.doesNotMatch(landing.html, /href="\/(?:termos|...)"/i)`).
  - A Especificação Funcional (EFS - `docs/FUNCTIONAL-SPEC.md`, seções 2776 e 2778) define o escopo obrigatório dos Termos de Uso:
    1. Elegibilidade e capacidade civil;
    2. Delimitação de responsabilidades: a plataforma é a intermediadora tecnológica de software; a execução do corte/serviço presencial e a cobrança presencial no balcão são de responsabilidade exclusiva da barbearia parceira;
    3. Regras de cancelamento, atraso e tolerância de comparecimento (*no-show*);
    4. Condições de assinatura da barbearia (SaaS B2B): planos, ciclo de faturamento, direito de arrependimento de 7 dias (CDC Art. 49) e fases pós-cancelamento;
    5. Propriedade intelectual e relacionamento intrínseco com a Política de Privacidade (`/privacidade`).
- **Registro da Falha de Conexão no Deploy:**
  - O arquivo `app/termos/page.tsx` foi criado e testado, mas faltou atualizar o rodapé da página inicial (`app/page.tsx`) com o link clicável.
  - Como consequência, o site publicado continua exibindo o texto inativo `Termos de Uso — em preparação`, e os termos de uso não estão acessíveis pela navegação pública.
  - Essa correção ficou pendente para o próximo ciclo de deploy.


