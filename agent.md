# Documentación de Comportamiento: Fechas y Planes

Esta guía documenta el estándar de manejo de fechas y la lógica de negocio para los planes en Novafit, para que los agentes futuros y desarrolladores la apliquen sistemáticamente y eviten el "Timezone Bug" (desfases de fecha por husos horarios).

## 1. Zona Horaria Estándar
**Se debe usar siempre la hora local de Nicaragua (`America/Managua`) para todas las validaciones del "Día Actual" y la visualización de fechas de auditoría.** 
No confíes en el reloj o zona horaria local del navegador o del servidor donde se ejecuta la app, utiliza siempre los formateadores definidos en `packages/supabase/src/utils/date.ts` (`formatDateTime`, `toTimezoneYYYYMMDD`).

## 2. Tipos de Fechas

### A. Fechas de Periodo (Inicio de Plan y Expiración)
Para fechas que dictan vigencia (como `starts_at` y `expiration_date` de `member_plans`), **NO se debe considerar la hora**.
- **Regla:** Solo nos guiamos por el "Día" calendario (Formato: `YYYY-MM-DD`).
- **Almacenamiento (Base de Datos):** Deben almacenarse de forma neutra asegurando que representen el día exacto en `UTC` a la medianoche (ej. `2026-10-06T00:00:00.000Z`).
- **En Formularios (Frontend/Server Actions):** Se debe forzar explícitamente el timezone `UTC` al leer la fecha (ej. `new Date(string).toLocaleDateString('en-CA', { timeZone: 'UTC' })`) y al guardarla (inyectando `T00:00:00Z` manualmente a la cadena antes de crear el objeto `Date`) para evitar sumas o restas accidentales causadas por conversiones automáticas del navegador.

### B. Fechas de Auditoría y Transaccionales
Para metadatos y registros (como `created_at`, `updated_at`, `scanned_at`, `registered_at`), **SÍ se debe incluir la hora y los minutos exactos**.
- Estas fechas siempre representan el instante global preciso en el que ocurrió un evento (guardadas como `timestamptz`).
- Al mostrarlas en pantalla, deben formatearse respetando siempre la hora de Nicaragua para que los registros del sistema reflejen la hora local real.

## 3. Lógica de Vigencia y Expiración de Planes
- **Expiración Estricta:** Si los días disponibles / restantes (visitas) caen a `0`, el plan está matemáticamente **Expirado**, y así se mostrará visualmente en los historiales y badges.
- **Re-ingreso el mismo día (Grace Period Diario):** El sistema valida los ingresos por "días" calendario y no estrictamente por check-in único. Si un cliente agota su última visita hoy (sus días disponibles bajan a 0 hoy en la mañana), su plan dirá "Expirado" en su perfil. Sin embargo, **el escáner de Check-in (`processCheckIn`) detectará de forma nativa que ya registró una asistencia hoy, y le permitirá re-ingresar múltiples veces ese mismo día** mostrando un mensaje verde de "¡Bienvenido!" con balance 0.
- Si llega el día posterior a la expiración de su plan (incluso si tiene visitas sobrantes) o ya usó sus visitas en un día pasado, el escáner lo bloqueará y marcará en ROJO "El plan de este miembro ha expirado".
