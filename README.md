# MoxList — Wishlist Highlighter for Moxfield

MoxList es una extensión de navegador cross-browser (compatible con Chrome y Firefox) desarrollada en TypeScript utilizando el framework **WXT (Web Extension Toolkit)**. 

La extensión destaca de forma visual mediante un emoji de corona (👑) y un contador flotante todas las cartas de tu wishlist de Moxfield que se muestren en cualquier página de Moxfield (como decklists de otros usuarios, buscador de cartas, tu perfil, páginas de trade, colecciones, etc.).

---

## Características Principales

*   **Sincronización Automática via API**: Obtiene tu wishlist de Moxfield de forma directa con un solo click usando tu sesión activa de Moxfield.
*   **Importación Manual**: Alternativa para importar tu wishlist copiando y pegando el formato de texto exportado de Moxfield.
*   **Highlight Visual Resiliente**: Agrega el emoji 👑 antes del nombre de las cartas y actualiza un badge flotante en la esquina inferior derecha ("X cartas del wishlist") con animaciones fluidas.
*   **Compatibilidad con React/SPA**: Utiliza un MutationObserver avanzado que observa cambios de contenido y datos de texto (`characterData`), permitiendo re-escanear elementos reciclados por React al navegar, paginar o filtrar.
*   **Normalización de Variaciones y Sufijos**: Identifica cartas base ignorando sufijos y variantes complejas envueltas en subetiquetas `<span>` como `(Foil)`, `(Borderless)`, etc.
*   **Soporte Doble Cara (DFC)**: Identifica coincidencias en cartas de dos caras (ej. "Delver of Secrets // Insectile Aberration" se destaca tanto por su nombre completo como por el de su cara frontal).
*   **Matching Exacto**: Comparación estricta por nombre completo e insensible a mayúsculas/minúsculas (evita falsos positivos como destacar "Chaos Confetti" cuando buscas "Chaos Orb").
*   **Diseño Premium**: Popup con interfaz oscura (Dark Navy) y detalles dorados inspirados en la estética moderna de Moxfield.

---

## Arquitectura del Proyecto

### Estructura de Directorios

```
d:\dev\moxlist\
├── wxt.config.ts                    # Configuración de WXT (metadatos, permisos y builds)
├── package.json                     # Scripts y dependencias del proyecto (WXT, TypeScript)
├── tsconfig.json                    # Configuración de compilación TypeScript
├── public/                          # Recursos estáticos
│   ├── icon.svg                     # Icono base vectorial (Corona dorada)
│   └── icon/                        # Tamaños PNG requeridos por los navegadores
├── utils/                           # Utilidades lógicas modulares
│   ├── types.ts                     # Definiciones y contratos de datos
│   ├── storage.ts                   # Wrapper tipado para browser.storage.local
│   ├── card-matcher.ts              # Algoritmo de normalización y matching exacto
│   └── wishlist-parser.ts           # Parser de respuestas de API JSON y texto plano
└── entrypoints/                     # Puntos de entrada de la extensión
    ├── background.ts                # Service Worker para sync de API y mensajería
    ├── content.ts                   # Script de inyección en DOM con MutationObserver
    └── popup/                       # Popup flotante de la barra de herramientas
        ├── index.html
        ├── main.ts
        └── style.css
```

### Flujo de Datos

```
[Moxfield Tab] ──(Cookies)──> [background.ts] ──(POST /startup/authenticated)──> [Moxfield API]
                                     │
                             (wishList.deck)
                                     ▼
                            [processApiResponse]
                                     ▼
                            [storage.ts (Save)]
                                     │
                             (WISHLIST_UPDATED)
                                     ▼
                              [content.ts] ──(DOM Scan & MutationObserver)──> Inject 👑 + Badge
```

---

## Stack Tecnológico

*   **Core**: Vanilla TypeScript / JavaScript.
*   **Framework**: [WXT (Web Extension Toolkit)](https://wxt.dev/) — Simplifica el desarrollo cross-browser empaquetando para Manifest V3 en Chrome y Manifest V2 en Firefox de forma nativa.
*   **Bundler**: Vite 8+ (Configurado internamente por WXT).
*   **Diseño**: Vanilla CSS (Dark mode adaptativo con HSL tailored colors y animaciones clave `@keyframes`).

---

## Detalles Técnicos de la API

La sincronización automática utiliza el endpoint interno y privado de Moxfield:
*   **URL**: `POST https://api2.moxfield.com/v1/startup/authenticated`
*   **Cabeceras**: `Content-Type: application/json`
*   **Cuerpo**: `{}` (Objeto vacío)
*   **Autenticación**: Credenciales de sesión (`credentials: 'include'`) enviadas de forma segura desde el Background Service Worker aprovechando los permisos de host.

Este endpoint retorna un payload unificado que contiene el perfil del usuario logueado en la clave `refresh` y los datos del deck especial de la wishlist en `wishList.deck`, evitando hacer múltiples llamadas cruzadas.

---

## Requisitos Previos

*   [Node.js](https://nodejs.org/) v20 o superior.
*   `npm` (incluido con Node.js).

---

## Guía de Instalación y Desarrollo Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/hector-horta/moxlist.git
cd moxlist
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Scripts de Desarrollo y Build

| Comando | Acción |
|---------|--------|
| `npm run dev` | Inicia entorno de desarrollo con HMR (Hot Module Replacement) en Chrome |
| `npm run dev:firefox` | Inicia entorno de desarrollo con HMR en Firefox |
| `npm run compile` | Valida que no existan errores de compilación TypeScript (`tsc --noEmit`) |
| `npm run build` | Compila y empaqueta la extensión para **Chrome (Manifest V3)** en `.output/chrome-mv3/` |
| `npm run build:firefox` | Compila y empaqueta la extensión para **Firefox (Manifest V2)** en `.output/firefox-mv2/` |
| `npm run zip` | Empaqueta la build de Chrome en un archivo ZIP para distribución |
| `npm run zip:firefox` | Empaqueta la build de Firefox en un archivo ZIP para distribución |

---

## Cómo Cargar la Extensión en tu Navegador

### En Google Chrome / Chromium
1. Abrí Chrome y navegá a `chrome://extensions/`.
2. Activá el **Modo de desarrollador** (interruptor arriba a la derecha).
3. Hacé clic en **Cargar descomprimida** (Load unpacked).
4. Seleccioná la carpeta de la build generada: `d:\dev\moxlist\.output\chrome-mv3\`.

### En Mozilla Firefox
1. Abrí Firefox y navegá a `about:debugging#/runtime/this-firefox`.
2. Hacé clic en **Cargar complemento temporal...** (Load Temporary Add-on...).
3. Seleccioná el archivo `manifest.json` dentro de la carpeta: `d:\dev\moxlist\.output\firefox-mv2/manifest.json`.

---

## Licencia y Descargo de Responsabilidad

Este proyecto es una herramienta de código abierto desarrollada exclusivamente para uso personal y comunitario. MoxList **no** está afiliado, asociado, autorizado, respaldado ni conectado de ninguna manera con Moxfield ni Wizards of the Coast. La obtención automática de datos utiliza endpoints privados del servicio web de Moxfield y su estabilidad depende de que el sitio no realice cambios estructurales en su infraestructura privada.
