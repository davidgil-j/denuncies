# Pruebas de navegador (e2e)

Recorren el producto en un navegador de verdad (Chromium, con Playwright), en **modo demo** y con una
**red simulada**: nada sale del ordenador y no se toca ningún Supabase.

## Instalar Playwright (una vez, fuera del repositorio)

Playwright no es una dependencia del proyecto. Se instala aparte:

```bash
npm i --prefix ~/.reportia-e2e playwright
npx --prefix ~/.reportia-e2e playwright install chromium
```

Si lo tienes en otra carpeta, indícala con `PLAYWRIGHT_DIR=/ruta/a/la/carpeta`.

## Lanzarlas

```bash
npm run e2e                    # todas (unos 25 minutos)
npm run e2e -- --only=red      # solo las que llevan «red» en el nombre
npm run e2e -- --list          # lista de pruebas
```

`run.mjs` arranca los servidores que necesita (o reutiliza los que ya estén en marcha) y los para al acabar:

| Puerto | Qué es |
|---|---|
| 3111 | Modo demo |
| 3112 | Modo real contra una red simulada (`http://localhost:59999`, que no existe: cada prueba responde las peticiones) |
| 3113 | Modo demo con la IA encendida (`VITE_AI_ENABLED=1`) |
| 3114 | Red simulada con la IA encendida |

Las capturas y las descargas (PDF, Excel) quedan en la carpeta temporal del sistema, en `reportia-e2e/`,
o donde diga `E2E_OUT`.

## Qué prueba cada una

| Prueba | Qué comprueba |
|---|---|
| `recorrido` | Los 7 puntos de la comprobación final: denuncia anónima con reunión, «Mi caso», acuse, reunión, investigación, cierre con resultado, registro telefónico, PDF del caso, libro-registro, informe y cartel. A 1440, 1366 y 375 px |
| `idiomas` | Las pantallas del recorrido en catalán e inglés |
| `teclado` | Los dos lados solo con Tab, Mayús+Tab, Intro, Espacio y Esc: foco visible, orden, nombres y diálogos |
| `rutas` | 48 direcciones actuales, antiguas e inventadas, con y sin sesión: ninguna en blanco ni con error |
| `red-panel` | Modo real: sin la migración 012, gestor no administrador y empresa recién creada |
| `red-ia` | Modo real: IA apagada, encendida, gestor con permisos limitados y sin la migración 013 |
| `red-contrasena` | «Contraseña nueva» con los formatos de enlace de Supabase (`#access_token`, `?code=`, `?token_hash=`), caducados y sin enlace |
| `endurecimiento` | Modo real: los arreglos de la auditoría (`docs/AUDITORIA.md`). Canal sin conexión, reintento sin denuncias repetidas, código antes que las pruebas, fotos anónimas limpias y con nombre neutro, tope por hora y freno de intentos, vía de antes sin la migración 014; en el panel, doble clic y acuse a medias, caso reabierto, plazo vencido, mensaje en un caso cerrado y autor del registro |
| `ia-demo` | IA apagada y encendida en la demo |
| `canal`, `panel` | Regresiones del lado Denunciar y del lado Gestionar |
| `ajustes-compartir-informe` | Equipo y ajustes, Compartir, Informe, primeros pasos y AIPI |
| `pulido-fallos-claridad` | Los arreglos del pulido final (bloques A y B) |
| `movil-teclado` | Recorrido a 360×640 y 390×844 con el teclado en pantalla |
| `portatil` | 15 pantallas en 6 tamaños de portátil: que quepan, nada partido ni cortado, franja fija |
| `contraste` | Contraste WCAG medido de cada texto, borde de campo e icono en 40 pantallas y estados |
| `propuestas` | Las propuestas aprobadas de `docs/REVISION_UX.md` |
| `anchos-idiomas` | 9 anchos × 3 idiomas: sin desbordes ni textos cortados |
| `textos` | 63 pantallas sin «undefined» ni huecos sin rellenar |
| `pdf` | Los PDF salen con Manrope, también con caracteres del latín extendido |

La lógica que no necesita navegador (plazos en seis zonas horarias y limpieza de fotos) se prueba aparte con `npm run test:logic`, y la base de datos con `npm run db:test`.
