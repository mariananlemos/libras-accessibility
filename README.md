# 🤟 Libras Accessibility

Aplicativo desktop de acessibilidade que captura áudio do microfone em tempo real, transcreve o que está sendo falado e exibe a tradução em **Língua Brasileira de Sinais (Libras)** através do widget VLibras.

![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Funcionalidades

- 🎤 **Captura de áudio em tempo real** - Usa Web Speech API para transcrever fala
- 🤟 **Tradução para Libras** - Integração com VLibras (ferramenta oficial do governo)
- 📌 **Sempre no topo** - Janela flutuante que fica sobre outras aplicações (Google Meet, Teams, Zoom)
- 📝 **Legendas em tempo real** - Exibe o texto transcrito enquanto você fala
- 🌙 **Tema escuro** - Interface moderna e minimalista
- 🔲 **Semi-transparente** - Controle de opacidade da janela
- ⌨️ **Atalhos de teclado** - Ctrl+Espaço para iniciar/pausar

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Verifique com: `node --version`

2. **npm** (vem junto com o Node.js)
   - Verifique com: `npm --version`

3. **Git** (opcional, para clonar o repositório)
   - Download: https://git-scm.com/

## 🚀 Instalação

### Passo 1: Clone ou baixe o projeto

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/libras-accessibility.git

# Entre na pasta do projeto
cd libras-accessibility
```

Ou baixe o ZIP e extraia em uma pasta.

### Passo 2: Instale as dependências

```bash
# Instala todas as dependências do projeto
npm install
```

Este comando vai instalar:
- `electron` - Framework para criar aplicativos desktop
- `electron-builder` - Para criar instaladores

### Passo 3: Execute o aplicativo

```bash
# Inicia o aplicativo em modo de desenvolvimento
npm start
```

## 📦 Criar Instalador (Build)

Para criar um instalador distribuível:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# Todas as plataformas
npm run build
```

Os instaladores serão gerados na pasta `dist/`.

## 🎯 Como Usar

1. **Inicie o aplicativo** executando `npm start`

2. **Posicione a janela** - Arraste pela barra de título para posicionar onde preferir

3. **Inicie a transcrição** - Clique no botão "🎤 Iniciar Transcrição" ou use `Ctrl+Espaço`

4. **Fale normalmente** - O aplicativo irá:
   - Capturar sua voz pelo microfone
   - Transcrever em tempo real (português brasileiro)
   - Exibir as legendas na caixa de texto
   - Enviar automaticamente para o VLibras traduzir em Libras

5. **Use junto com reuniões** - Abra o Google Meet, Teams ou Zoom, e a janela ficará sobre eles

### ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl + Espaço` | Iniciar/Pausar transcrição |
| `Esc` | Minimizar janela |

### 🎛️ Controles da Interface

- **📌 Fixar** - Mantém a janela sempre no topo (ativo por padrão)
- **─ Minimizar** - Minimiza a janela para a barra de tarefas
- **✕ Fechar** - Fecha o aplicativo
- **🗑️ Limpar** - Limpa o texto de transcrição
- **Opacidade** - Slider para ajustar transparência da janela

## 🏗️ Estrutura do Projeto

```
libras-accessibility/
├── main.js          # Processo principal do Electron
├── preload.js       # Script de pré-carregamento (bridge segura)
├── index.html       # Interface HTML da aplicação
├── renderer.js      # Lógica de captura de áudio e VLibras
├── styles.css       # Estilos CSS (tema escuro)
├── package.json     # Configurações e dependências
└── README.md        # Este arquivo
```

### Descrição dos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `main.js` | Processo principal do Electron. Cria a janela, configura always-on-top, gerencia IPC. |
| `preload.js` | Ponte segura entre main e renderer. Expõe APIs limitadas via contextBridge. |
| `index.html` | Estrutura HTML da interface com áreas para VLibras, controles e legendas. |
| `renderer.js` | Lógica principal: Web Speech API para transcrição, integração com VLibras. |
| `styles.css` | Estilos visuais: tema escuro, bordas arredondadas, animações. |
| `package.json` | Metadados do projeto, scripts npm e configuração do electron-builder. |

## 🔧 Configurações Avançadas

### Alterar o Avatar do VLibras

No arquivo `renderer.js`, você pode mudar o avatar:

```javascript
const CONFIG = {
  vlibras: {
    personalization: 'icaro'  // Opções: icaro, hosana, guga, random
  }
};
```

### Alterar o Idioma de Reconhecimento

```javascript
const CONFIG = {
  recognition: {
    lang: 'pt-BR'  // Pode mudar para outros idiomas
  }
};
```

## 🐛 Solução de Problemas

### "Microfone não encontrado"
- Verifique se o microfone está conectado
- Permita acesso ao microfone nas configurações do sistema

### "Permissão de microfone negada"
- O Electron deve solicitar permissão na primeira execução
- Em caso de problemas, verifique as permissões de privacidade do sistema

### "VLibras não carrega"
- Verifique sua conexão com a internet
- O VLibras precisa baixar recursos do servidor gov.br

### "Transcrição não funciona"
- Web Speech API requer conexão com internet (usa servers do Google)
- Funciona melhor em ambientes silenciosos

## 🔍 Sobre o VLibras

O **VLibras** é uma ferramenta gratuita desenvolvida pelo **Governo Federal Brasileiro** em parceria com a **UFPB** (Universidade Federal da Paraíba).

- Site oficial: https://vlibras.gov.br/
- Documentação: https://vlibras.gov.br/doc/

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📞 Contato

Se tiver dúvidas ou sugestões, abra uma issue no repositório.

---

**Feito com ❤️ para promover acessibilidade**
