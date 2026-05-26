# data-json

Carpeta de trabajo para probar el modelo de datos JSON de RIO Tools v2.

Por ahora esto es solo diseno y datos de ejemplo. No reemplaza ninguna integracion existente.

## Principios

- Un archivo JSON no deberia mezclar dominios distintos.
- Cada entidad importante necesita un `id` unico y estable.
- Los cambios importantes deberian registrarse como eventos, no solo pisando el ultimo estado.
- Los archivos grandes deberian partirse por mes, dia, sucursal o estado.
- Google Sheets puede quedar como exportacion, no como origen obligatorio.

## Carpetas

```text
data-json/
  examples/   Datos de ejemplo para pensar estructuras.
  schemas/    Contratos minimos esperados para cada tipo de dato.
```

## Convenciones sugeridas

- Fechas: `YYYY-MM-DD`.
- Fecha y hora: ISO con zona horaria, por ejemplo `2026-05-22T10:30:00-03:00`.
- Estados: texto corto en minuscula con guion bajo, por ejemplo `en_transito`.
- IDs: prefijo por tipo, por ejemplo `rem-20260522-0001`.
