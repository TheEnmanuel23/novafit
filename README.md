
# Nova Fit App

Applicación web progresiva (PWA) diseñada para tablets, enfocada en el control de asistencia offline-first para el gimnasio Nova Fit.

## Tecnologías

- **Next.js 14+ (App Router)**: Framework principal.
- **Tailwind CSS**: Estilizado utility-first con diseño "Glassmorphism" premium.
- **Dexie.js**: Wrapper de IndexedDB para almacenamiento offline robusto.
- **Framer Motion**: Animaciones fluidas.
- **Lucide React**: Iconografía moderna.

## Características

1.  **Check-In Rápido**:
    - Buscador optimizado para tablets (teclado numérico o nombre).
    - Feedback visual inmediato (Pantalla verde/roja).
    - Validación automática de vigencia de membresía (30 días o 15 días).

2.  **Gestión Offline**:
    - Todos los datos se guardan localmente en el dispositivo.
    - Funciona perfectamente sin internet.

3.  **Sincronización Inteligente**:
    - Botón de exportación/sincronización en el header.
    - Si hay internet: Simula envío a API.
    - Si no hay internet: Genera y descarga backup JSON automáticamente.

4.  **Diseño Premium**:
    - Modo oscuro por defecto.
    - Botones grandes y accesibles.
    - Feedback visual claro (Verde = Activo, Rojo = Vencido).

## Instalación y Uso

1.  Instalar dependencias:
    ```bash
    npm install
    ```

2.  Correr en modo desarrollo:
    ```bash
    npm run dev
    ```

3.  Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

- `src/lib/db.ts`: Configuración de la base de datos local (Dexie).
- `src/components/checkin/`: Componentes de la vista principal.
- `src/components/admin/`: Formulario de registro.
- `src/components/ui/`: Componentes base reutilizables (Botones, Inputs, Cards).

## Notas

- La base de datos se inicializa con 3 miembros de prueba si está vacía.
- Para probar el modo offline, puedes desconectar el Wi-Fi o usar las DevTools del navegador (Network > Offline).
