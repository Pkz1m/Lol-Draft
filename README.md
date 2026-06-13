# LoL Draft Tool 🎮

Site de draft completo para League of Legends campeões, timer e lógica de ban/pick.

---

## 📁 Estrutura dos Arquivos

```
lol-draft/
├── index.html   → Estrutura da página
├── style.css    → Visual e animações
├── script.js    → Lógica completa do draft
└── README.md    → Este arquivo
```

---

## 🚀 Como Usar

### Opção 1 — Abrir direto no navegador
1. Descompacte a pasta
2. Dê duplo clique em `index.html`
3. Pronto! (precisa de internet para carregar as imagens dos campeões)

### Opção 2 — VS Code com Live Server (recomendado)
1. Abra a pasta no VS Code
2. Instale a extensão **Live Server** (ritwickdey.LiveServer)
3. Clique com botão direito em `index.html` → **Open with Live Server**
4. O site abre no navegador automaticamente

---

## ⚙️ Funcionalidades

| Feature | Descrição |
|---|---|
| 🏆 Todos os campeões | Carregados via Data Dragon API (oficial da Riot) |
| 🖼️ Imagens reais | Ícones e splash arts dos campeões |
| ⏱️ Timer configurável | 30s / 60s / 90s / ilimitado |
| 🔴 Ban Phase 1 | Azul B B, Vermelho B B, Azul B, Vermelho B |
| 🟢 Pick Phase 1 | B R R B B R |
| 🔴 Ban Phase 2 | R B R B |
| 🟢 Pick Phase 2 | R B B R |
| 🔍 Busca de campeões | Filtro em tempo real por nome |
| 🎯 Filtro por role | Top / Jungle / Mid / ADC / Support |
| ⏰ Auto-pick | Se o timer chegar a zero, escolhe um campeão aleatório |
| 📋 Tela de resultado | Resumo completo do draft ao final |
| 🔄 Reiniciar | Reinicia o draft a qualquer momento |

---

## 🔧 Requisitos

- Navegador moderno (Chrome, Firefox, Edge — versão 2020+)
- Conexão com a internet (para carregar imagens e dados da API da Riot)

---

## 🛠️ Customização Fácil

**Mudar cores dos times** → `style.css`, variáveis `--blue` e `--red`

**Mudar tempo padrão do timer** → `script.js`, linha `timerMax: 30`

**Adicionar mais filtros de role** → `index.html` nos botões `.role-btn` + `script.js` na função `applyFilters()`
