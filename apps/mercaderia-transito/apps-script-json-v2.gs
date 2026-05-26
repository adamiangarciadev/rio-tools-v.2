/************************************************************
 * MERCADERIA EN TRANSITO · JSON BACKEND · v2 draft
 *
 * Objetivo:
 * - Mantener la misma API que usa apps/mercaderia-transito/app.js.
 * - Leer y escribir en un archivo JSON de Google Drive.
 * - Dejar Google Sheets solo como fuente inicial de migracion/importacion.
 *
 * Acciones compatibles:
 * GET  ?accion=sucursales
 * GET  ?accion=listar&sucursal=SARMIENTO
 * POST { accion:"actualizarEstado", remito, nuevoEstado, codigoPersonal }
 * POST { accion:"confirmarOk", remito, codigoPersonal }
 * POST { accion:"guardarDiferencias", remito, observacion, archivos, codigoPersonal }
 ************************************************************/

const CONFIG_JSON = {
  // Carpeta de Drive donde se guardara el archivo JSON.
  // Crear una carpeta nueva tipo "RIO Tools v2 / mercaderia-transito-json"
  // y pegar aca el ID de esa carpeta.
  JSON_FOLDER_ID: "PEGAR_ID_CARPETA_JSON",

  STORE_FILE_NAME: "mercaderia-transito-store.json",

  // Solo para migrar desde la hoja actual si queremos poblar el JSON inicial.
  SPREADSHEET_ID: "1SRFGiSCUx0VyyV57MmMCUznounukfsS4vN99JUs5_Vk",
  SHEET_MAIN: "SEGUIMIENTO_REMITOS",

  DRIVE_DIFERENCIAS_ROOT_ID: "1uNUDMtZCMUVExUELEWcK7pSBLch4J8lv",
  TIMEZONE: "America/Argentina/Buenos_Aires",

  SUCURSALES: [
    "SARMIENTO",
    "NAZCA",
    "AVELLANEDA 2",
    "CORRIENTES",
    "CASTELLI",
    "MORENO",
    "QUILMES",
    "LAMARCA",
    "DEPOSITO",
    "PUEYRREDON"
  ]
};

const COL_JSON = {
  FECHA: 1,
  REMITO: 2,
  DESDE: 3,
  HACIA: 4,
  COD_CLIENTE_DESTINO: 5,
  VENDEDOR: 6,
  TOTAL_PRENDAS: 7,
  ARCHIVO: 8,
  FILE_ID: 9,
  CARPETA_MES: 10,
  FECHA_IMPORTACION: 11,
  TEXTO_DESTINO_ORIGINAL: 12,
  ESTADO: 13,
  OBSERVACIONES: 14,
  LINK_CARPETA: 15,
  COD_RECIBE_SARMIENTO: 16,
  COD_ENVIA_SARMIENTO: 17,
  COD_RECIBE_SUCURSAL: 18,
  COD_CIERRE: 19,
  TIPO_CIERRE: 20
};

const SARMIENTO_JSON = "SARMIENTO";
const GRUPO_1_JSON = ["AVELLANEDA 2", "NAZCA", "LAMARCA"];
const GRUPO_2_JSON = ["CORRIENTES", "CASTELLI", "PUEYRREDON"];
const SIEMPRE_SARMIENTO_JSON = ["QUILMES"];

/************************************************************
 * API WEB
 ************************************************************/
function doGet(e) {
  const accion = String((e && e.parameter && e.parameter.accion) || "").trim();

  try {
    if (accion === "sucursales") {
      return jsonOutput_({
        ok: true,
        sucursales: obtenerSucursalesWeb_()
      });
    }

    if (accion === "listar") {
      const sucursal = canonSucursal_((e.parameter.sucursal || ""));
      return jsonOutput_({
        ok: true,
        remitos: listarRemitosWeb_(sucursal)
      });
    }

    if (accion === "debugStore") {
      return jsonOutput_({
        ok: true,
        store: readStore_()
      });
    }

    return jsonOutput_({ ok: false, error: "Accion GET no valida" });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const accion = String(data.accion || "").trim();

    if (accion === "actualizarEstado") return actualizarEstadoApi_(data);
    if (accion === "confirmarOk") return confirmarOkApi_(data);
    if (accion === "guardarDiferencias") return guardarDiferenciasApi_(data);

    return jsonOutput_({ ok: false, error: "Accion POST no valida" });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/************************************************************
 * LECTURA WEB
 ************************************************************/
function obtenerSucursalesWeb_() {
  const store = readStore_();
  const set = {};

  CONFIG_JSON.SUCURSALES.forEach(s => {
    const nom = canonSucursal_(s);
    if (nom) set[nom] = true;
  });

  store.remitos.forEach(r => {
    const hacia = canonSucursal_(r.hacia);
    if (hacia) set[hacia] = true;
  });

  set[SARMIENTO_JSON] = true;
  return Object.keys(set).sort((a, b) => a.localeCompare(b, "es"));
}

function listarRemitosWeb_(sucursalSeleccionada) {
  const store = readStore_();

  return store.remitos
    .map(toWebRemito_)
    .filter(r => remitoDebeMostrarseEnSucursal_(r, sucursalSeleccionada))
    .filter(r => canonEstado_(r.estado) !== "CONFIRMADO OK")
    .sort(ordenarRemitosWeb_);
}

function toWebRemito_(r) {
  return {
    id: String(r.id || "").trim(),
    fecha: formatFechaWeb_(r.fecha),
    remito: String(r.remito || "").trim(),
    desde: canonSucursal_(r.desde),
    hacia: canonSucursal_(r.hacia),
    cod_cliente_destino: String(r.cod_cliente_destino || "").trim(),
    vendedor: String(r.vendedor || "").trim(),
    total_prendas: String(r.total_prendas || "").trim(),
    archivo: String(r.archivo || "").trim(),
    file_id: String(r.file_id || "").trim(),
    carpeta_mes: String(r.carpeta_mes || "").trim(),
    estado: canonEstado_(r.estado),
    observacion: String(r.observacion || "").trim(),
    carpeta_url: String(r.carpeta_url || "").trim(),
    cod_recibe_sarmiento: String(r.cod_recibe_sarmiento || "").trim(),
    cod_envia_sarmiento: String(r.cod_envia_sarmiento || "").trim(),
    cod_recibe_sucursal: String(r.cod_recibe_sucursal || "").trim(),
    cod_cierre: String(r.cod_cierre || "").trim(),
    tipo_cierre: String(r.tipo_cierre || "").trim()
  };
}

/************************************************************
 * ESCRITURA WEB
 ************************************************************/
function actualizarEstadoApi_(data) {
  const remito = String(data.remito || "").trim();
  const nuevoEstado = canonEstado_(data.nuevoEstado || "");
  const codigoPersonal = normalizarCodigoPersonal_(data.codigoPersonal || data.codigo_personal || "");

  if (!remito) return jsonOutput_({ ok: false, error: "Falta remito" });
  if (!nuevoEstado) return jsonOutput_({ ok: false, error: "Falta nuevoEstado" });
  if (!codigoPersonal) return jsonOutput_({ ok: false, error: "Falta codigo de personal" });

  return withStoreLock_(store => {
    const r = findRemito_(store, remito);
    if (!r) return { ok: false, error: "No se encontro el remito" };

    r.estado = nuevoEstado;
    guardarCodigoSegunEstado_(r, nuevoEstado, codigoPersonal);
    appendEvento_(r, {
      tipo: "actualizar_estado",
      estado: nuevoEstado,
      codigoPersonal: codigoPersonal
    });

    return { ok: true };
  });
}

function confirmarOkApi_(data) {
  const remito = String(data.remito || "").trim();
  const codigoPersonal = normalizarCodigoPersonal_(data.codigoPersonal || data.codigo_personal || "");

  if (!remito) return jsonOutput_({ ok: false, error: "Falta remito" });
  if (!codigoPersonal) return jsonOutput_({ ok: false, error: "Falta codigo de personal" });

  return withStoreLock_(store => {
    const r = findRemito_(store, remito);
    if (!r) return { ok: false, error: "No se encontro el remito" };

    r.estado = "CONFIRMADO OK";
    r.cod_cierre = codigoPersonal;
    r.tipo_cierre = "CONFIRMADO OK";
    appendEvento_(r, {
      tipo: "confirmar_ok",
      estado: "CONFIRMADO OK",
      codigoPersonal: codigoPersonal
    });

    return { ok: true };
  });
}

function guardarDiferenciasApi_(data) {
  const remito = String(data.remito || "").trim();
  const observacion = String(data.observacion || "").trim();
  const archivos = Array.isArray(data.archivos) ? data.archivos : [];
  const codigoPersonal = normalizarCodigoPersonal_(data.codigoPersonal || data.codigo_personal || "");

  if (!remito) return jsonOutput_({ ok: false, error: "Falta remito" });
  if (!codigoPersonal) return jsonOutput_({ ok: false, error: "Falta codigo de personal" });

  const folder = crearOObtenerCarpetaDiferencias_(remito);
  guardarArchivosEnCarpeta_(folder, archivos);

  return withStoreLock_(store => {
    const r = findRemito_(store, remito);
    if (!r) return { ok: false, error: "No se encontro el remito" };

    r.estado = "DIFERENCIAS";
    r.observacion = observacion;
    r.carpeta_url = folder.getUrl();
    r.cod_cierre = codigoPersonal;
    r.tipo_cierre = "DIFERENCIAS";
    appendEvento_(r, {
      tipo: "guardar_diferencias",
      estado: "DIFERENCIAS",
      observacion: observacion,
      carpetaUrl: folder.getUrl(),
      archivos: archivos.map(a => ({ name: a.name || "", mimeType: a.mimeType || "" })),
      codigoPersonal: codigoPersonal
    });

    return {
      ok: true,
      carpeta_url: folder.getUrl()
    };
  });
}

function guardarCodigoSegunEstado_(r, estado, codigoPersonal) {
  const e = canonEstado_(estado);
  if (e === "RECIBIDO EN SARMIENTO") r.cod_recibe_sarmiento = codigoPersonal;
  if (e === "ENVIADO A DESTINO") r.cod_envia_sarmiento = codigoPersonal;
  if (e === "RECIBIDO EN SUCURSAL") r.cod_recibe_sucursal = codigoPersonal;
}

function appendEvento_(r, extra) {
  if (!Array.isArray(r.eventos)) r.eventos = [];
  r.eventos.push({
    fechaHora: new Date().toISOString(),
    ...extra
  });
}

/************************************************************
 * STORE JSON EN DRIVE
 ************************************************************/
function readStore_() {
  const file = getOrCreateStoreFile_();
  const text = file.getBlob().getDataAsString("UTF-8");
  if (!String(text || "").trim()) return emptyStore_();

  const store = JSON.parse(text);
  if (!store || typeof store !== "object") return emptyStore_();
  if (!Array.isArray(store.remitos)) store.remitos = [];
  if (!Array.isArray(store.control_archivos)) store.control_archivos = [];
  if (!store.version) store.version = 1;
  return store;
}

function saveStore_(store) {
  store.version = store.version || 1;
  store.actualizadoEn = new Date().toISOString();
  getOrCreateStoreFile_().setContent(JSON.stringify(store, null, 2));
}

function withStoreLock_(mutator) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const store = readStore_();
    const result = mutator(store) || { ok: true };
    if (result.ok !== false) saveStore_(store);
    return jsonOutput_(result);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateStoreFile_() {
  const folder = DriveApp.getFolderById(CONFIG_JSON.JSON_FOLDER_ID);
  const files = folder.getFilesByName(CONFIG_JSON.STORE_FILE_NAME);
  if (files.hasNext()) return files.next();

  const file = folder.createFile(
    CONFIG_JSON.STORE_FILE_NAME,
    JSON.stringify(emptyStore_(), null, 2),
    MimeType.PLAIN_TEXT
  );
  return file;
}

function emptyStore_() {
  return {
    version: 1,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    remitos: [],
    control_archivos: []
  };
}

function findRemito_(store, remito) {
  const buscado = String(remito || "").trim();
  for (let i = store.remitos.length - 1; i >= 0; i--) {
    if (String(store.remitos[i].remito || "").trim() === buscado) {
      return store.remitos[i];
    }
  }
  return null;
}

/************************************************************
 * MIGRACION INICIAL DESDE GOOGLE SHEETS
 ************************************************************/
function migrarSheetActualAJson() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(CONFIG_JSON.SPREADSHEET_ID);
    const sh = ss.getSheetByName(CONFIG_JSON.SHEET_MAIN);
    if (!sh) throw new Error("No existe la hoja " + CONFIG_JSON.SHEET_MAIN);

    const lastRow = sh.getLastRow();
    if (lastRow < 2) {
      saveStore_(emptyStore_());
      Logger.log("JSON inicial creado sin remitos.");
      return;
    }

    const numCols = Math.max(sh.getLastColumn(), COL_JSON.TIPO_CIERRE);
    const values = sh.getRange(2, 1, lastRow - 1, numCols).getValues();

    const store = emptyStore_();
    store.remitos = values
      .map((r, idx) => remitoFromSheetRow_(r, idx + 2))
      .filter(r => r.remito);

    saveStore_(store);
    Logger.log("Migrados a JSON: " + store.remitos.length + " remitos.");
  } finally {
    lock.releaseLock();
  }
}

function remitoFromSheetRow_(r, rowIndex) {
  const remito = String(r[COL_JSON.REMITO - 1] || "").trim();
  return {
    id: "rem-" + sanitizeId_(remito || ("row-" + rowIndex)),
    row_index_origen: rowIndex,
    fecha: toIsoDateOrText_(r[COL_JSON.FECHA - 1]),
    remito: remito,
    desde: canonSucursal_(r[COL_JSON.DESDE - 1]),
    hacia: canonSucursal_(r[COL_JSON.HACIA - 1]),
    cod_cliente_destino: String(r[COL_JSON.COD_CLIENTE_DESTINO - 1] || "").trim(),
    vendedor: String(r[COL_JSON.VENDEDOR - 1] || "").trim(),
    total_prendas: String(r[COL_JSON.TOTAL_PRENDAS - 1] || "").trim(),
    archivo: String(r[COL_JSON.ARCHIVO - 1] || "").trim(),
    file_id: String(r[COL_JSON.FILE_ID - 1] || "").trim(),
    carpeta_mes: String(r[COL_JSON.CARPETA_MES - 1] || "").trim(),
    fecha_importacion: toIsoDateOrText_(r[COL_JSON.FECHA_IMPORTACION - 1]),
    texto_destino_original: String(r[COL_JSON.TEXTO_DESTINO_ORIGINAL - 1] || "").trim(),
    estado: canonEstado_(r[COL_JSON.ESTADO - 1]) || "ENVIADO A SUCURSAL",
    observacion: String(r[COL_JSON.OBSERVACIONES - 1] || "").trim(),
    carpeta_url: String(r[COL_JSON.LINK_CARPETA - 1] || "").trim(),
    cod_recibe_sarmiento: String(r[COL_JSON.COD_RECIBE_SARMIENTO - 1] || "").trim(),
    cod_envia_sarmiento: String(r[COL_JSON.COD_ENVIA_SARMIENTO - 1] || "").trim(),
    cod_recibe_sucursal: String(r[COL_JSON.COD_RECIBE_SUCURSAL - 1] || "").trim(),
    cod_cierre: String(r[COL_JSON.COD_CIERRE - 1] || "").trim(),
    tipo_cierre: String(r[COL_JSON.TIPO_CIERRE - 1] || "").trim(),
    eventos: [
      {
        tipo: "migrado_desde_sheet",
        fechaHora: new Date().toISOString(),
        rowIndex: rowIndex
      }
    ]
  };
}

/************************************************************
 * VISIBILIDAD Y ORDEN
 ************************************************************/
function remitoDebeMostrarseEnSucursal_(r, sucursalSeleccionada) {
  const suc = canonSucursal_(sucursalSeleccionada);
  const origen = canonSucursal_(r.desde);
  const destino = canonSucursal_(r.hacia);
  const estado = canonEstado_(r.estado);
  const usaSarmiento = requiereSarmiento_(origen, destino);

  if (!suc) return false;
  if (estado === "CONFIRMADO OK") return false;

  if (!usaSarmiento) return suc === destino;

  if (suc === SARMIENTO_JSON) {
    return ["", "ENVIADO A SUCURSAL", "RECIBIDO EN SARMIENTO"].includes(estado);
  }

  if (suc === destino) {
    return ["ENVIADO A DESTINO", "RECIBIDO EN SUCURSAL", "DIFERENCIAS"].includes(estado);
  }

  return false;
}

function ordenarRemitosWeb_(a, b) {
  function prioridad_(estado) {
    const e = canonEstado_(estado);
    if (e === "DIFERENCIAS") return 1;
    if (e === "RECIBIDO EN SUCURSAL") return 2;
    if (e === "ENVIADO A DESTINO") return 3;
    if (e === "RECIBIDO EN SARMIENTO") return 4;
    if (e === "ENVIADO A SUCURSAL" || e === "") return 5;
    return 9;
  }

  const pa = prioridad_(a.estado);
  const pb = prioridad_(b.estado);
  if (pa !== pb) return pa - pb;
  return String(b.remito).localeCompare(String(a.remito), "es", { numeric: true });
}

function requiereSarmiento_(origen, destino) {
  const o = canonSucursal_(origen);
  const d = canonSucursal_(destino);

  if (!o || !d) return false;
  if (o === SARMIENTO_JSON || d === SARMIENTO_JSON) return false;
  if (o === "DEPOSITO" || d === "DEPOSITO") return false;
  if (SIEMPRE_SARMIENTO_JSON.indexOf(o) >= 0 || SIEMPRE_SARMIENTO_JSON.indexOf(d) >= 0) return true;

  const ambosGrupo1 = GRUPO_1_JSON.indexOf(o) >= 0 && GRUPO_1_JSON.indexOf(d) >= 0;
  const ambosGrupo2 = GRUPO_2_JSON.indexOf(o) >= 0 && GRUPO_2_JSON.indexOf(d) >= 0;
  if (ambosGrupo1 || ambosGrupo2) return false;

  return true;
}

/************************************************************
 * DIFERENCIAS / ARCHIVOS
 ************************************************************/
function crearOObtenerCarpetaDiferencias_(remito) {
  const root = DriveApp.getFolderById(CONFIG_JSON.DRIVE_DIFERENCIAS_ROOT_ID);
  const folderName = "DIF_" + remito;
  const it = root.getFoldersByName(folderName);
  if (it.hasNext()) return it.next();
  return root.createFolder(folderName);
}

function guardarArchivosEnCarpeta_(folder, archivos) {
  archivos.forEach(file => {
    const nombre = String(file.name || "archivo");
    const mimeType = String(file.mimeType || "application/octet-stream");
    const base64 = String(file.base64 || "");
    if (!base64) return;

    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, nombre);
    folder.createFile(blob);
  });
}

/************************************************************
 * HELPERS
 ************************************************************/
function canonSucursal_(valor) {
  const v = norm_(valor);
  const alias = {
    "AVELLANEDA": "AVELLANEDA 2",
    "AVELLANEDA2": "AVELLANEDA 2",
    "AV 2": "AVELLANEDA 2",
    "AV2": "AVELLANEDA 2",
    "NAZCA": "NAZCA",
    "LAMARCA": "LAMARCA",
    "CORRIENTES": "CORRIENTES",
    "CORRIENTES 1": "CORRIENTES",
    "CASTELLI": "CASTELLI",
    "PUEY": "PUEYRREDON",
    "PUEYRREDON": "PUEYRREDON",
    "SARMIENTO": "SARMIENTO",
    "MORENO": "MORENO",
    "QUILMES": "QUILMES",
    "DEPOSITO": "DEPOSITO"
  };
  return alias[v] || v;
}

function canonEstado_(valor) {
  const v = norm_(valor);
  if (v === "RECIBIDO") return "RECIBIDO EN SUCURSAL";
  return v;
}

function norm_(str) {
  return String(str || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarCodigoPersonal_(valor) {
  return String(valor || "").trim();
}

function toIsoDateOrText_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, CONFIG_JSON.TIMEZONE, "yyyy-MM-dd");
  }
  return String(value || "").trim();
}

function formatFechaWeb_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, CONFIG_JSON.TIMEZONE, "dd/MM/yyyy");
  }

  const s = String(value || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];
  return s;
}

function sanitizeId_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
