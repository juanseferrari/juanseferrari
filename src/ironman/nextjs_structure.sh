ironman-tracker/
├── .env.local                  # Variables de entorno (no commitear)
├── .env.example                # Template para otros devs
├── next.config.js
├── package.json
│
├── lib/
│   ├── strava.js               # Cliente Strava API + helpers
│   ├── plan.js                 # Datos del plan (fases, sesiones, glosario)
│   └── utils.js                # Helpers de fecha, FC, ritmo, etc.
│
├── app/
│   ├── layout.js               # Root layout + metadata
│   ├── page.js                 # Dashboard principal
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── strava/route.js         # GET → redirect a Strava OAuth
│   │   │   └── strava/callback/route.js # GET → intercambio code→token
│   │   └── strava/
│   │       ├── activities/route.js     # GET → últimas actividades
│   │       └── athlete/route.js        # GET → perfil del atleta
│   │
│   ├── dashboard/
│   │   └── page.js             # Vista principal post-login
│   │
│   └── plan/
│       └── page.js             # El plan completo
│
└── components/
    ├── PhaseSelector.jsx
    ├── SessionCard.jsx
    ├── ActivityFeed.jsx         # Feed de Strava
    ├── ProgressChart.jsx        # Gráfico FC/ritmo (recharts)
    ├── WeeklyProgress.jsx       # Check ✓ de sesiones vs plan
    └── ZoneBar.jsx              # Barra visual de zonas FC
