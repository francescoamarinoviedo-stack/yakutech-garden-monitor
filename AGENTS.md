# Project Guidance

## User Preferences

- Interfaz moderna, intuitiva y ecológica con predominio de tonos verdes
- Compatible con Android e iOS (diseño responsivo)
- Debe controlar hardware real por Bluetooth, no simularlo
- Sin conexión, indicar claramente el estado y no mostrar mediciones ficticias
- Arquitectura modular y extensible a más sensores y plantas

## Accepted Requirements

- Conexión Bluetooth con Arduino UNO vía HC-05/HC-06: buscar, listar, seleccionar, conectar y desconectar
- Mostrar estado de conexión y avisar al perder comunicación
- Protocolo serial bidireccional con comandos y respuestas definidos
- Monitoreo en tiempo real de humedad del suelo, temperatura y humedad ambiental (si existen los sensores)
- Estado por planta: saludable, necesita agua o requiere atención
- Mostrar la última actualización recibida por Bluetooth
- Riego automático por umbral de humedad y riego manual on/off
- Botón de emergencia para detener el riego
- Evitar activación simultánea de bomba y electroválvula
- Configurar límite de humedad y duración máxima del riego
- Protección contra riego excesivo y pérdida de conexión
- Registrar varias plantas con nombre, especie, fotografía y necesidades de humedad
- Consultar recomendaciones de cuidado y ver estado individual de cada planta
- Registrar mediciones y eventos de riego
- Gráficos de humedad y temperatura
- Alertas por planta sedienta, fallo de sensor o pérdida de conexión Bluetooth
- Historial guardado localmente para consulta sin Internet
- Pantallas: Inicio, Conexión Bluetooth, Monitoreo, Riego, Mis plantas, Historial y Configuración
- Incluir el código de Arduino y el código de la aplicación
- Manejo de errores, reconexión y validación de datos
- Arquitectura modular y extensible a más sensores y plantas

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Object storage needs both the caffeineai-object-storage mops dependency and include MixinObjectStorage() in src/backend/main.mo; without it, uploads reject with IC0536 (no update method _immutableObjectStorageCreateCertificate).
- Backend timestamps and numeric fields arrive as bigint in the frontend; JSON.stringify throws on bigint, so localStorage snapshots need a tagged-bigint replacer and reviver.
- Generated backend enums (Actuator, IrrigationMode, SensorPresence, PlantStatus) must be value imports from @/backend; string literals fail typecheck.
- Web Bluetooth has no programmatic scan: navigator.bluetooth.getDevices() lists previously-permitted devices while new discovery uses the native requestDevice picker.
- Backend helper functions in lib/ must actually be invoked from a mixin method; a defined-but-uncalled helper means the accepted behavior never runs.
- M0009: lib/ and mixins/ must import shared types as ../types/<domain>, not types/<domain>. M0032: a shared function cannot return a record with var fields; expose an immutable View type.
- A mixin needing actor state must take it as a parameter and the main.mo include must pass the same bindings.
