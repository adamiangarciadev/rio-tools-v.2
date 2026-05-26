# Shared frontend layer

Esta carpeta queda como base para la migracion gradual de RIO Tools hacia una arquitectura mas mantenible.

Uso recomendado:

- `components/`: piezas reutilizables de interfaz, como topbars, filtros, tablas y mensajes de estado.
- `data/`: adaptadores para leer CSV, JSON y endpoints de Apps Script.
- `utils/`: funciones puras compartidas entre modulos.
- `styles/`: tokens y estilos especificos que luego puedan complementar `assets/rio-theme.css`.

La regla de migracion es simple: cada herramienta puede seguir funcionando con su HTML/CSS/JS actual, y solo se mueve codigo a `src/shared/` cuando ya se repite en dos o mas modulos.
