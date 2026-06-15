# 🏆 Mundial Fácil 2026

Tracker personal del FIFA World Cup 2026 (Canadá/México/EEUU · 11 Jun – 19 Jul).

## Cómo correr

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5173` con dark mode por defecto.

## Features

| Feature | Descripción |
|---------|-------------|
| 🏠 **Inicio** | Partidos en vivo / hoy / mañana con countdown "faltan X horas", marcador en vivo animado y auto-refresh. |
| 📊 **Grupos** | Las 12 tablas con desempates FIFA + "carrera de mejores terceros". |
| 🗺️ **Llaves** | Bracket proyectado con los equipos que clasificarían HOY (terceros asignados con matching tipo Annex C). |
| 🔮 **Cruces** | Elegís dos equipos y ves en qué instancia se cruzan para todas las combinaciones de posición. |

**Banderas:** se sirven como SVG desde [flagcdn.com](https://flagcdn.com) (los emojis de bandera no renderizan en Windows/Chrome), con fallback automático al emoji si no hay conexión.

**Argentina** tiene realce visual (glow celeste + ★) en toda la app.

## API en vivo (opcional)

1. Registrarse gratis en [API-Football](https://dashboard.api-football.com/) (100 req/día sin cargo)
2. Copiar `.env.example` → `.env` y pegar tu API key:
   ```
   VITE_FOOTBALL_API_KEY=xxxxx
   ```
3. Reiniciar `npm run dev`

Sin API key la app usa el seed con datos reales hasta la última actualización (15 Jun 2026).

## Tests

```bash
npm test
```

Cubre lógica de ordenamiento de grupos y el algoritmo LCA del bracket.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (via @tailwindcss/vite)
- Zustand (estado + persistencia en localStorage)
- Vitest (tests)
