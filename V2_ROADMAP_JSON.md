# RIO Tools v2 - Roadmap JSON

Este proyecto hermano nace para probar una version de RIO Tools donde los datos operativos puedan vivir en archivos JSON en lugar de depender siempre de Google Sheets.

La copia original quedo intacta en `D:\Damian\Rio-tools`.

## Objetivo

Probar una arquitectura mas liviana para lectura y escritura de datos:

- Menos dependencia de Google Sheets para operaciones internas.
- Archivos mas chicos, rapidos y faciles de respaldar.
- Datos estructurados por entidad: remito, pedido, movimiento, persona, evento.
- Posibilidad de mantener Google Sheets solo como vista, exportacion o respaldo.

## Idea base

En lugar de guardar todo como filas y columnas, cada modulo deberia trabajar con objetos JSON.

Ejemplo:

```text
data-json/
  remitos/
  movimientos/
  pedidos-web/
  asistencia/
  padron/
```

Para no crear archivos gigantes, conviene partir por modulo, fecha, sucursal o estado.

```text
data-json/
  remitos/
    2026-05.json
  pedidos-web/
    pendientes.json
    procesados-2026-05.json
  asistencia/
    eventos-2026-05-22.json
  padron/
    empleados.json
```

## Modulo piloto recomendado

El primer piloto deberia ser uno de estos:

1. `mercaderia-transito`: buen candidato porque tiene estados, remitos, historial y evidencia.
2. `control-remitos-clientes`: buen candidato si queremos probar busqueda y control operativo.
3. `asistencia`: buen candidato si separamos padron estable de eventos diarios.

Mi recomendacion inicial es empezar por `mercaderia-transito`, porque es donde mas se nota la ventaja de guardar objetos con historial.

## Capas propuestas

### 1. Fuente JSON

Archivos locales o servidos desde un endpoint:

```text
data-json/examples/remitos.sample.json
data-json/examples/movimientos.sample.json
data-json/examples/pedidos-web.sample.json
data-json/examples/asistencia.sample.json
```

### 2. Adaptador de datos

Una capa unica por modulo que se encargue de:

- Leer JSON.
- Validar campos minimos.
- Guardar cambios.
- Migrar datos viejos desde Sheets o CSV.

### 3. UI existente

Las pantallas deberian cambiar lo menos posible. La UI pide datos al adaptador, no a Sheets directamente.

### 4. Exportacion opcional

Google Sheets puede seguir existiendo como:

- Exportacion para imprimir.
- Vista para usuarios administrativos.
- Backup manual.
- Reporte consolidado.

Pero no necesariamente como fuente principal.

## Riesgos a resolver antes de usar en produccion

- Escrituras simultaneas: si dos personas guardan a la vez, necesitamos una regla de bloqueo o un backend.
- Backups: definir copia automatica diaria.
- Auditoria: guardar quien hizo cada cambio y cuando.
- Validacion: no aceptar registros incompletos.
- Busqueda: si crece mucho, JSON puede quedar corto y conviene SQLite.

## Decision tecnica probable

Para una prueba local o de bajo volumen:

- JSON por modulo y fecha.
- IDs unicos.
- Historial de eventos.
- Exportacion manual a Sheets si hace falta.

Para una version mas robusta:

- SQLite como almacenamiento principal.
- JSON solo para intercambio, backup o importacion/exportacion.

## Primer experimento sugerido

Crear un lector JSON para `mercaderia-transito` que pueda cargar:

- Remitos activos.
- Movimientos por remito.
- Estado actual calculado desde eventos.
- Busqueda por numero, origen, destino y estado.

Sin tocar todavia Apps Script ni Google Sheets.
