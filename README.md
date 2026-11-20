# El Gran Incremental

Un juego incremental/idle con mini-juegos integrados. Juega mientras trabajas, déjalo corriendo y vuelve a recoger tus ganancias.

## Mini-Juegos

| Juego | Estado | Descripción |
|-------|--------|-------------|
| 🐍 Snake | ✅ | Come y crece. Comida dorada para puntos extra |
| 🐦 Flappy Bird | ✅ | Vuela entre los tubos sin chocar |
| 💣 Buscaminas | ✅ | Despeja el campo sin pisar una mina |
| 🦕 Dino Runner | ✅ | Salta obstáculos al estilo Chrome |
| 🐔 Crossy Road | ✅ | Cruza carreteras y ríos |
| 👾 Space Invaders | ✅ | Defiende la Tierra de los aliens |

## Mecánicas

- **Income pasivo** — Las monedas suben solas, incluso cuando no juegas
- **Click** — Botón "Trabajar" para ganar monedas manualmente
- **Mejoras** — Compra upgrades que aumentan tu income y potencian los mini-juegos
- **Mini-juegos** — Desbloquéalos comprando licencias y gana monedas según tu puntuación
- **Pilotos automáticos** — IAs que juegan por ti con habilidad configurable y visuales en vivo
- **Prestigio** — Reinicia tu progreso a cambio de gemas y un multiplicador permanente
- **Progreso offline** — Al volver después de un rato, recibes monedas por el tiempo fuera
- **Estadísticas** — Gráfica de income en tiempo real desglosada por fuente

## Progresión

```
0-10s   → Monedas subiendo lento, botón Trabajar
30s     → Primera mejora (+0.5/s)
2min    → Desbloqueas Snake
5min    → Varios upgrades, ~5 monedas/s
10min   → Todos los mini-juegos de Fase 1
30min   → Profundo en el árbol de mejoras, prestigio a la vista
```

## Tech Stack

- **Vite** + **TypeScript** (strict)
- **HTML5 Canvas** para mini-juegos
- **DOM + CSS** para la UI (sin frameworks)
- **lz-string** para compresión de guardados
- Sprites 100% procedurales (sin assets de imagen)

## Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

## Arquitectura

```
src/
├── core/           # Motor: EventBus, GameState, GameLoop, SaveManager
├── minigames/      # Framework y cada mini-juego en su carpeta
├── ui/             # Componentes UI: HUD, Shop, Tabs, Notificaciones
├── upgrades/       # Sistema de mejoras data-driven
├── utils/          # Helpers: formateo números, DOM
└── styles/         # CSS con custom properties y tema oscuro
```

## Roadmap

- [x] Fase 1: Core loop + Snake + Flappy Bird + Buscaminas
- [x] Fase 2: Dino Runner + Crossy Road + Space Invaders + Autopilots + Stats
- [ ] Fase 3: Prestigio avanzado, logros, pesca, minería
- [ ] Fase 4: Sonidos, temas visuales, partículas
