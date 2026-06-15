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
| 🏠 **Inicio** | Partidos en vivo, de hoy y de mañana. Auto-refresh cada 30s si hay partidos en curso. |
| 📊 **Grupos** | Las 12 tablas con cálculo automático de posiciones y desempates FIFA. Mini-vista "carrera de mejores terceros". |
| 🔮 **Calculadora de Cruces** | Bracket oficial FIFA: elegís dos equipos y ves en qué instancia se cruzan para todas las combinaciones de posición. |

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
