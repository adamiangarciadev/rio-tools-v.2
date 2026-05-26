# schemas

Contratos minimos para validar datos JSON antes de usarlos en las apps.

La idea no es hacer burocracia: es evitar datos rotos, estados mal escritos o registros sin ID.

## Contrato minimo por entidad

### Remito

- `id`
- `numero`
- `fecha`
- `origen`
- `destino`
- `estado`
- `items[]`
- `eventos[]`

### Movimiento

- `id`
- `fechaHora`
- `tipo`
- `origen`
- `destino`
- `referenciaTipo`
- `referenciaId`
- `items[]`

### Pedido web

- `id`
- `numero`
- `canal`
- `fecha`
- `cliente`
- `estado`
- `items[]`
- `historial[]`

### Asistencia

- `id`
- `empleadoId`
- `fechaHora`
- `tipo`
- `sucursal`

### Padron

- `id`
- `legajo`
- `nombre`
- `sucursal`
- `activo`
