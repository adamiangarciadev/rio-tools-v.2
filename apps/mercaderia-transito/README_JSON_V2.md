# Mercaderia en Transito - JSON v2

Esta carpeta tiene un borrador de Apps Script paralelo para probar la app contra JSON en Google Drive, sin tocar el backend actual de Google Sheets.

Archivo principal:

```text
apps-script-json-v2.gs
```

## Como se probaria

1. Crear en Google Drive una carpeta nueva, por ejemplo:

```text
RIO Tools v2 / mercaderia-transito-json
```

2. Copiar el ID de esa carpeta y pegarlo en:

```javascript
CONFIG_JSON.JSON_FOLDER_ID
```

3. Crear un Apps Script nuevo y pegar el contenido de `apps-script-json-v2.gs`.

4. Ejecutar una vez:

```javascript
migrarSheetActualAJson()
```

Eso lee la hoja actual `SEGUIMIENTO_REMITOS` y crea/reescribe:

```text
mercaderia-transito-store.json
```

5. Publicar el Apps Script como Web App.

6. En el proyecto v2, cambiar temporalmente la constante `API_URL` de:

```javascript
apps/mercaderia-transito/app.js
```

para que apunte al Web App nuevo.

## Que acciones ya soporta

- `GET ?accion=sucursales`
- `GET ?accion=listar&sucursal=...`
- `POST actualizarEstado`
- `POST confirmarOk`
- `POST guardarDiferencias`

La UI actual deberia poder consumir este backend con el mismo formato de respuesta.

## Que cambia internamente

Antes:

```text
App web -> Apps Script -> Google Sheets
```

Ahora:

```text
App web -> Apps Script -> archivo JSON en Drive
```

El JSON guarda cada remito como objeto y agrega historial en `eventos`.

## Punto clave

El script usa `LockService` para evitar que dos escrituras simultaneas pisen el archivo JSON. Esto es importante porque el guardado funciona leyendo el archivo completo, modificandolo y volviendolo a escribir.

## Pendiente para una segunda vuelta

- Decidir si el importador OCR de PDFs tambien debe escribir directo al JSON.
- Partir el JSON por mes si el archivo crece mucho.
- Agregar backups automaticos antes de cada migracion masiva.
- Agregar validaciones mas estrictas por estado/circuito.
