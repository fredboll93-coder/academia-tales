// src/admin.js
import { supabase } from '../supabaseClient.js';

let tempUniData = {
  siglas: "",
  nombreCompleto: "",
  logoUrl: "",
  cartillaUrl: "",
  cartillaNombre: "",
  areas: [],
  grupos: {}, 
  carreras: [], 
  alumnos: [] 
};
let editIndexKey = null;
let filtroBusquedaAlumno = "";

function obtenerClaveCartillaUni(siglas) {
  return `tales_cartilla_uni_${String(siglas || "").trim().toUpperCase()}`;
}

function leerCartillaUniLocal(siglas) {
  try {
    return localStorage.getItem(obtenerClaveCartillaUni(siglas)) || "";
  } catch (e) {
    return "";
  }
}

function guardarCartillaUniLocal(siglas, valor) {
  try {
    const key = obtenerClaveCartillaUni(siglas);
    if (valor) {
      localStorage.setItem(key, valor);
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {}
}

function base64DataUrlAArchivo(dataUrl, nombreArchivo = "cartilla_universidad.pdf") {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return null;
  }
  const partes = dataUrl.split(",");
  if (partes.length < 2) return null;
  const mimeMatch = partes[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
  const binStr = atob(partes[1]);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new File([bytes], nombreArchivo, { type: mime });
}

async function subirCartillaUniASupabase(siglas, urlActual, nombreActual) {
  let archivo = typeof window.obtenerCartillaUniversidadFile === "function"
    ? window.obtenerCartillaUniversidadFile()
    : null;

  let nombreArchivo = typeof window.obtenerCartillaUniversidadNombre === "function"
    ? window.obtenerCartillaUniversidadNombre()
    : (nombreActual || "cartilla_universidad.pdf");

  const base64Actual = typeof window.obtenerCartillaUniversidadBase64 === "function"
    ? window.obtenerCartillaUniversidadBase64()
    : "";

  if (!archivo && base64Actual && base64Actual.startsWith("data:")) {
    archivo = base64DataUrlAArchivo(base64Actual, nombreArchivo || `${siglas}_cartilla.pdf`);
  }

  if (!archivo) {
    const urlFinal = base64Actual && /^https?:\/\//i.test(base64Actual)
      ? base64Actual
      : (urlActual || null);
    return {
      url: urlFinal,
      nombre: urlFinal ? (nombreArchivo || `${siglas}_cartilla.pdf`) : null
    };
  }

  const nombreLimpio = (nombreArchivo || archivo.name || "cartilla.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const ruta = `cartillas_universidades/${siglas}_${Date.now()}_${nombreLimpio}`;

  const { error: uploadError } = await supabase.storage
    .from("simulacros")
    .upload(ruta, archivo, {
      upsert: true,
      contentType: archivo.type || "application/pdf",
      cacheControl: "3600"
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("simulacros")
    .getPublicUrl(ruta);

  return {
    url: publicUrlData?.publicUrl || null,
    nombre: nombreArchivo || archivo.name || "cartilla.pdf"
  };
}

// Función auxiliar para formatear la carrera (ej: primera letra de cada palabra en mayúscula, resto minúsculas)
function formatearCarrera(texto) {
  if (!texto) return "";
  return texto.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Verificar sesión de administrador
  const esAdminSesion = localStorage.getItem("adminSesion") === "true" || sessionStorage.getItem("adminSesion") === "true";
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "null");
  const esAdminUsuario = usuarioLogueado && usuarioLogueado.tipo === "admin";

  if (!esAdminSesion && !esAdminUsuario && window.location.pathname.includes("admin.html")) {
    window.location.href = "index.html";
    return;
  }

  // 2. Inyectar el modal rediseñado en el DOM si no existe
  if (!document.getElementById("modal-config-uni")) {
    const modalHTML = `
      <div id="modal-config-uni" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(10px); z-index: 2000; justify-content: center; align-items: center; overflow-y: auto; padding: 20px;">
        <div style="background: rgba(11, 18, 32, 0.95); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 24px; padding: 35px; width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.7); color: #f8fafc;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid rgba(148,163,184,0.15); padding-bottom: 15px;">
            <h2 id="modal-titulo-uni" style="font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #f8fafc;">CONFIGURAR UNIVERSIDAD</h2>
            <button id="btn-cerrar-config" type="button" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">&times;</button>
          </div>

          <!-- 1. DATOS BÁSICOS -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #38bdf8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">1. Información General</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px;">
              <div>
                <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Siglas (Ej: UNAP, UNI)</label>
                <input type="text" id="cfg-siglas" placeholder="Ej. UNAP" style="width: 100%; padding: 10px 14px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: #fff; outline: none;">
              </div>
              <div>
                <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Logo de Universidad</label>
                <input type="file" id="cfg-logo" accept="image/*" style="width: 100%; padding: 7px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: #94a3b8; font-size: 12px;">
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Nombre Completo</label>
              <input type="text" id="cfg-nombre-completo" placeholder="Ej. Universidad Nacional de la Amazonía Peruana" style="width: 100%; padding: 10px 14px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: #fff; outline: none;">
            </div>
          </div>

          <!-- 2. ÁREAS Y RANGOS DE PREGUNTAS -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">2. Áreas y Estructura de Preguntas</h3>
            
            <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 15px; margin-bottom: 15px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Nombre del Área</label>
                  <input type="text" id="input-nuevo-area-nombre" placeholder="Ej. Aptitud Académica" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Desde Pregunta</label>
                  <input type="number" id="input-nuevo-area-desde" placeholder="Ej. 1" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Hasta Pregunta</label>
                  <input type="number" id="input-nuevo-area-hasta" placeholder="Ej. 10" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
                </div>
              </div>
              <button type="button" id="cfg-btn-add-area" style="background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); border: none; color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 700;">+ Agregar Área</button>
            </div>

            <div id="cfg-container-areas" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Se lista dinámicamente -->
            </div>
          </div>

          <!-- 3. CREACIÓN DE GRUPOS Y PUNTUACIÓN POR ÁREA -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">3. Grupos y Puntuación por Pregunta</h3>
            
            <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 15px; margin-bottom: 15px;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Nombre del Grupo</label>
                <input type="text" id="input-nuevo-grupo-nombre" placeholder="Ej. A, B, C" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
              </div>
              <button type="button" id="cfg-btn-add-grupo" style="background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); border: none; color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 700;">+ Agregar Grupo</button>
            </div>

            <div id="cfg-container-grupos" style="display: flex; flex-direction: column; gap: 15px;">
              <!-- Se lista dinámicamente -->
            </div>
          </div>

          <!-- 4. CARRERAS PROFESIONALES -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">4. Carreras Profesionales</h3>
            
            <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 15px; margin-bottom: 15px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 12px; align-items: start;">
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Carrera o Lista de Carreras (una por línea)</label>
                  <textarea id="input-nuevo-carrera-nombre" rows="3" placeholder="Ej. Medicina Humana&#10;Ingeniería Civil&#10;Derecho" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none; resize: vertical; font-family: inherit;"></textarea>
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Grupo al que pertenece</label>
                  <input type="text" id="input-nuevo-carrera-grupo" placeholder="Ej. A" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Posición (Opcional)</label>
                  <input type="number" id="input-nuevo-carrera-posicion" min="1" placeholder="Al final" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
                </div>
              </div>
              <button type="button" id="cfg-btn-add-carrera" style="background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); border: none; color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 700;">+ Agregar Carrera</button>
            </div>

            <div id="cfg-container-carreras" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Se lista dinámicamente enumerada -->
            </div>
          </div>

          <!-- 5. ALUMNOS MATRICULADOS -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">5. Alumnos Matriculados</h3>
            
            <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 15px; margin-bottom: 15px;">
              <div style="display: grid; grid-template-columns: 1fr 2fr 1.2fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Código</label>
                  <input type="text" id="input-alumno-codigo" placeholder="Ej. 202601" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Apellidos y Nombres</label>
                  <input type="text" id="input-alumno-nombre" placeholder="Ej. Pérez Gómez, Juan Carlos" style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Carrera</label>
                  <select id="input-alumno-carrera" style="width: 100%; padding: 8px 12px; background: #09101f; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none; cursor: pointer;">
                    <option value="">-- Seleccionar Carrera --</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px;">O pegar lista masiva desde Excel (Código \t Apellidos y Nombres \t Carrera por línea):</label>
                <textarea id="input-alumno-excel" rows="2" placeholder="Pega aquí los datos copiados de tu Excel..." style="width: 100%; padding: 8px 12px; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none; resize: vertical; font-family: inherit;"></textarea>
              </div>

              <button type="button" id="cfg-btn-add-alumno" style="background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); border: none; color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 700;">+ Agregar Alumno(s)</button>
            </div>

            <!-- Buscador de alumnos -->
            <div style="margin-bottom: 12px;">
              <input type="text" id="input-buscar-alumno" placeholder="🔍 Buscar alumno por código, nombre o carrera..." style="width: 100%; padding: 8px 12px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
            </div>

            <div id="cfg-container-alumnos" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
              <!-- Se lista dinámicamente -->
            </div>
          </div>

          <!-- BOTONES FINALES -->
          <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button id="btn-cancelar-config" type="button" style="padding: 12px 24px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 12px; font-weight: 700; cursor: pointer;">Cancelar</button>
            <button id="btn-guardar-universidad" type="button" style="padding: 12px 28px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border: none; color: #fff; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4);">Guardar Universidad</button>
          </div>

        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById("btn-cerrar-config").addEventListener("click", cerrarModal);
    document.getElementById("btn-cancelar-config").addEventListener("click", cerrarModal);

    // Evento Agregar Área
    document.getElementById("cfg-btn-add-area").addEventListener("click", () => {
      const nombreInput = document.getElementById("input-nuevo-area-nombre");
      const desdeInput = document.getElementById("input-nuevo-area-desde");
      const hastaInput = document.getElementById("input-nuevo-area-hasta");

      const nombre = nombreInput.value.trim();
      const desde = parseInt(desdeInput.value);
      const hasta = parseInt(hastaInput.value);

      if (!nombre || isNaN(desde) || isNaN(hasta)) {
        alert("Por favor complete el nombre del área y los valores del rango.");
        return;
      }

      sincronizarPuntajesDesdeDOM();
      tempUniData.areas.push({ nombre, desde, hasta });

      Object.keys(tempUniData.grupos).forEach(g => {
        if (tempUniData.grupos[g][nombre] === undefined) {
          tempUniData.grupos[g][nombre] = 0;
        }
      });

      nombreInput.value = "";
      desdeInput.value = "";
      hastaInput.value = "";

      renderizarAreasModal();
      renderizarGruposModal();
    });

    // Evento Agregar Grupo
    document.getElementById("cfg-btn-add-grupo").addEventListener("click", () => {
      const nombreInput = document.getElementById("input-nuevo-grupo-nombre");
      const nombreGrupo = nombreInput.value.trim();

      if (!nombreGrupo) {
        alert("Por favor ingrese el nombre del grupo.");
        return;
      }

      sincronizarPuntajesDesdeDOM();
      const keyGrupo = nombreGrupo.toUpperCase();
      
      if (!tempUniData.grupos[keyGrupo]) {
        tempUniData.grupos[keyGrupo] = {};
        tempUniData.areas.forEach(a => {
          tempUniData.grupos[keyGrupo][a.nombre] = 0;
        });
      }

      nombreInput.value = "";
      renderizarGruposModal();
    });

    // Evento Agregar Carrera(s)
    document.getElementById("cfg-btn-add-carrera").addEventListener("click", () => {
      const carrerasInput = document.getElementById("input-nuevo-carrera-nombre");
      const grupoInput = document.getElementById("input-nuevo-carrera-grupo");
      const posicionInput = document.getElementById("input-nuevo-carrera-posicion");

      const textoCarreras = carrerasInput.value.trim();
      const grupoIngresado = grupoInput.value.trim().toUpperCase();
      const posVal = posicionInput.value.trim();

      if (!textoCarreras) {
        alert("Por favor ingrese al menos una carrera.");
        return;
      }

      const gruposCreados = Object.keys(tempUniData.grupos);
      if (gruposCreados.length === 0) {
        alert("Primero debes crear al menos un grupo en la Opción 3 antes de agregar carreras.");
        return;
      }

      if (!grupoIngresado) {
        alert("Por favor especifique el grupo al que pertenece(n) la(s) carrera(s).");
        return;
      }

      if (!gruposCreados.includes(grupoIngresado)) {
        alert(`El grupo "${grupoIngresado}" no existe.\nGrupos válidos creados: ${gruposCreados.join(", ")}`);
        return;
      }

      const listaNuevas = textoCarreras
        .split(/\r?\n/)
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0)
        .map(nombreCarrera => ({
          nombre: formatearCarrera(nombreCarrera),
          grupo: grupoIngresado
        }));

      if (listaNuevas.length === 0) return;

      if (posVal !== "" && !isNaN(parseInt(posVal))) {
        const posNum = parseInt(posVal);
        if (posNum < 1) {
          alert("La posición debe ser un número mayor o igual a 1.");
          return;
        }
        const indiceInsercion = Math.min(posNum - 1, tempUniData.carreras.length);
        tempUniData.carreras.splice(indiceInsercion, 0, ...listaNuevas);
      } else {
        tempUniData.carreras.push(...listaNuevas);
      }

      carrerasInput.value = "";
      grupoInput.value = "";
      posicionInput.value = "";

      renderizarCarrerasModal();
    });

    // Evento Agregar Alumnos (Manual o Masivo Excel con formato aplicado)
    document.getElementById("cfg-btn-add-alumno").addEventListener("click", () => {
      const codInput = document.getElementById("input-alumno-codigo");
      const nomInput = document.getElementById("input-alumno-nombre");
      const carSelect = document.getElementById("input-alumno-carrera");
      const excelInput = document.getElementById("input-alumno-excel");

      const codigoManual = codInput.value.trim();
      const nombreManual = nomInput.value.trim().toUpperCase(); // Nombres en MAYÚSCULAS
      const carreraManual = carSelect.value;
      const textoExcel = excelInput.value.trim();

      let nuevosAlumnos = [];

      if (codigoManual || nombreManual || carreraManual) {
        if (!codigoManual || !nombreManual || !carreraManual) {
          alert("Para agregar un alumno manualmente, completa Código, Apellidos y Nombres, y selecciona una Carrera.");
          return;
        }
        nuevosAlumnos.push({
          codigo: codigoManual,
          nombre: nombreManual,
          carrera: formatearCarrera(carreraManual), // Carrera formateada
          estado: true
        });
      }

      if (textoExcel) {
        const lineas = textoExcel.split(/\r?\n/);
        lineas.forEach(linea => {
          const partes = linea.split(/\t|;|\|/).map(p => p.trim());
          if (partes.length >= 3) {
            nuevosAlumnos.push({
              codigo: partes[0],
              nombre: partes[1].toUpperCase(), // Nombres en MAYÚSCULAS
              carrera: formatearCarrera(partes[2]), // Carrera formateada
              estado: true
            });
          }
        });
      }

      if (nuevosAlumnos.length === 0) {
        alert("Por favor ingresa los datos de un alumno o pega una lista desde Excel.");
        return;
      }

      nuevosAlumnos.forEach(nuevo => {
        const existe = tempUniData.alumnos.some(a => a.codigo === nuevo.codigo);
        if (!existe) {
          tempUniData.alumnos.push(nuevo);
        }
      });

      codInput.value = "";
      nomInput.value = "";
      carSelect.value = "";
      excelInput.value = "";

      renderizarAlumnosModal();
    });

    // Evento Buscador de Alumnos
    document.getElementById("input-buscar-alumno").addEventListener("input", (e) => {
      filtroBusquedaAlumno = e.target.value.toLowerCase().trim();
      renderizarAlumnosModal();
    });

    // Evento Guardar Universidad
    document.getElementById("btn-guardar-universidad").addEventListener("click", async () => {
      sincronizarPuntajesDesdeDOM();
      const siglas = document.getElementById("cfg-siglas").value.trim().toUpperCase();
      const nombreCompleto = document.getElementById("cfg-nombre-completo").value.trim();
      const fileInput = document.getElementById("cfg-logo");

      if (!siglas) {
        alert("Las siglas de la universidad son obligatorias.");
        return;
      }

      let logoUrl = tempUniData.logoUrl;

      try {
        if (fileInput.files[0]) {
          const file = fileInput.files[0];
          const fileName = `${siglas}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          
          const { error: uploadError } = await supabase.storage
            .from('logos-universidades')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('logos-universidades')
            .getPublicUrl(fileName);

          logoUrl = publicUrlData.publicUrl;
        }

        const cartillaSubida = await subirCartillaUniASupabase(
          siglas,
          tempUniData.cartillaUrl,
          tempUniData.cartillaNombre
        );

        tempUniData.cartillaUrl = cartillaSubida.url || "";
        tempUniData.cartillaNombre = cartillaSubida.nombre || "";

        const datosUniBD = {
          siglas: siglas,
          nombre_completo: nombreCompleto || siglas,
          logo_url: logoUrl,
          cartilla_url: cartillaSubida.url,
          cartilla_nombre: cartillaSubida.nombre,
          areas: tempUniData.areas || [],
          grupos: tempUniData.grupos || {},
          carreras: tempUniData.carreras || [],
          alumnos: tempUniData.alumnos || []
        };

        const { error: upsertError } = await supabase
          .from('universidades')
          .upsert([datosUniBD], { onConflict: 'siglas' });

        if (upsertError) {
          if (editIndexKey) {
            const { error: updateError } = await supabase
              .from('universidades')
              .update(datosUniBD)
              .eq('siglas', siglas);
            if (updateError) throw updateError;
          } else {
            throw upsertError;
          }
        }

        if (typeof window.obtenerCartillaUniversidadBase64 === "function") {
          guardarCartillaUniLocal(siglas, window.obtenerCartillaUniversidadBase64());
        }

        cerrarModal();
        alert("¡Universidad guardada con éxito en Supabase!");
        cargarUniversidadesCreadas();
      } catch (e) {
        console.error("Error al guardar universidad:", e);
        alert("Hubo un error al guardar la universidad en la base de datos: " + (e?.message || e));
      }
    });
  }

  // 3. Vincular botón principal
  const btnCrearTop = document.getElementById("btn-crear-universidad-top");
  if (btnCrearTop) {
    btnCrearTop.addEventListener("click", () => {
      abrirModalUniversidad();
    });
  }

  cargarUniversidadesCreadas();
});

function sincronizarPuntajesDesdeDOM() {
  document.querySelectorAll(".grupo-card").forEach(card => {
    const nombreGrupo = card.getAttribute("data-grupo");
    if (!tempUniData.grupos[nombreGrupo]) {
      tempUniData.grupos[nombreGrupo] = {};
    }
    
    card.querySelectorAll(".input-puntaje-area").forEach(input => {
      const nombreArea = input.getAttribute("data-area");
      const valor = parseFloat(input.value);
      tempUniData.grupos[nombreGrupo][nombreArea] = isNaN(valor) ? 0 : valor;
    });
  });
}

function cerrarModal() {
  const modal = document.getElementById("modal-config-uni");
  if (modal) modal.style.display = "none";
}

function abrirModalUniversidad(siglasExistente = null) {
  editIndexKey = siglasExistente;
  const modal = document.getElementById("modal-config-uni");
  if (!modal) return;

  filtroBusquedaAlumno = "";
  const inputBuscar = document.getElementById("input-buscar-alumno");
  if (inputBuscar) inputBuscar.value = "";

  if (editIndexKey) {
    document.getElementById("modal-titulo-uni").innerText = `EDITAR UNIVERSIDAD: ${editIndexKey}`;
    document.getElementById("cfg-siglas").value = editIndexKey;
    document.getElementById("cfg-siglas").disabled = true;

    supabase.from('universidades').select('*').eq('siglas', editIndexKey).single().then(({ data }) => {
      if (data) {
        tempUniData = {
          siglas: data.siglas,
          nombreCompleto: data.nombre_completo || '',
          logoUrl: data.logo_url || '',
          cartillaUrl: data.cartilla_url || '',
          cartillaNombre: data.cartilla_nombre || '',
          areas: data.areas || [],
          grupos: data.grupos || {},
          carreras: data.carreras || [],
          alumnos: data.alumnos || []
        };
        document.getElementById("cfg-nombre-completo").value = tempUniData.nombreCompleto;
        if (typeof window.establecerCartillaUniversidadBase64 === "function") {
          window.establecerCartillaUniversidadBase64(tempUniData.cartillaUrl || leerCartillaUniLocal(data.siglas));
        }
        renderizarAreasModal();
        renderizarGruposModal();
        renderizarCarrerasModal();
        renderizarAlumnosModal();
      }
    });
  } else {
    document.getElementById("modal-titulo-uni").innerText = "CREAR NUEVA UNIVERSIDAD";
    document.getElementById("cfg-siglas").value = "";
    document.getElementById("cfg-siglas").disabled = false;
    document.getElementById("cfg-nombre-completo").value = "";
    document.getElementById("cfg-logo").value = "";
    if (typeof window.establecerCartillaUniversidadBase64 === "function") {
      window.establecerCartillaUniversidadBase64("");
    }
    tempUniData = { siglas: "", nombreCompleto: "", logoUrl: "", cartillaUrl: "", cartillaNombre: "", areas: [], grupos: {}, carreras: [], alumnos: [] };
    renderizarAreasModal();
    renderizarGruposModal();
    renderizarCarrerasModal();
    renderizarAlumnosModal();
  }

  modal.style.display = "flex";
}

function renderizarAreasModal() {
  const container = document.getElementById("cfg-container-areas");
  if (!container) return;
  
  if (tempUniData.areas.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">No hay áreas agregadas todavía.</p>`;
    return;
  }

  container.innerHTML = tempUniData.areas.map((area, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
      <div>
        <span style="font-size: 13px; color: #f8fafc; font-weight: 600;">${area.nombre}</span>
        <span style="font-size: 12px; color: #94a3b8; margin-left: 10px;">(Preguntas: ${area.desde} al ${area.hasta})</span>
      </div>
      <button type="button" onclick="window.eliminarAreaModal(${idx})" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">Eliminar</button>
    </div>
  `).join("");
}

function renderizarGruposModal() {
  const container = document.getElementById("cfg-container-grupos");
  if (!container) return;

  const gruposKeys = Object.keys(tempUniData.grupos);
  if (gruposKeys.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">No hay grupos creados todavía.</p>`;
    return;
  }

  container.innerHTML = gruposKeys.map(grupo => {
    const areasObj = tempUniData.grupos[grupo] || {};
    const tituloGrupo = grupo.startsWith("GRUPO ") ? grupo : `Grupo ${grupo}`;
    
    let htmlAreasPuntaje = "";
    if (tempUniData.areas.length === 0) {
      htmlAreasPuntaje = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">Primero debes crear áreas en la Opción 2.</p>`;
    } else {
      htmlAreasPuntaje = tempUniData.areas.map(area => {
        const puntajeActual = areasObj[area.nombre] !== undefined ? areasObj[area.nombre] : 0;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(2, 6, 23, 0.4); padding: 6px 10px; border-radius: 8px; margin-bottom: 6px;">
            <span style="font-size: 13px; color: #cbd5e1; font-weight: 500;">${area.nombre}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: #94a3b8;">Pts/Pregunta:</span>
              <input type="number" step="any" value="${puntajeActual}" data-area="${area.nombre}" class="input-puntaje-area" style="width: 80px; padding: 4px 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; color: #fff; font-size: 13px; text-align: center; outline: none;">
            </div>
          </div>
        `;
      }).join("");
    }

    return `
      <div class="grupo-card" data-grupo="${grupo}" style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(148,163,184,0.1); padding-bottom: 8px;">
          <h4 style="font-size: 14px; color: #38bdf8; font-weight: 700; margin: 0;">${tituloGrupo}</h4>
          <button type="button" onclick="window.eliminarGrupoModal('${grupo}')" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold;">Eliminar</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${htmlAreasPuntaje}
        </div>
      </div>
    `;
  }).join("");
}

function renderizarCarrerasModal() {
  const container = document.getElementById("cfg-container-carreras");
  if (!container) return;

  actualizarSelectorCarrerasAlumnos();

  if (tempUniData.carreras.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">No hay carreras agregadas todavía.</p>`;
    return;
  }

  container.innerHTML = tempUniData.carreras.map((car, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 6px; min-width: 28px; text-align: center;">${idx + 1}</span>
        <span style="font-size: 13px; color: #f8fafc; font-weight: 600;">${car.nombre}</span>
        <span style="font-size: 11px; background: rgba(148, 163, 184, 0.15); color: #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: 600;">Grupo: ${car.grupo}</span>
      </div>
      <button type="button" onclick="window.eliminarCarreraModal(${idx})" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">Eliminar</button>
    </div>
  `).join("");
}

function actualizarSelectorCarrerasAlumnos() {
  const selectCarrera = document.getElementById("input-alumno-carrera");
  if (!selectCarrera) return;

  const valorPrevio = selectCarrera.value;
  
  if (tempUniData.carreras.length === 0) {
    selectCarrera.innerHTML = `<option value="">-- Primero agregue carreras en Opción 4 --</option>`;
    return;
  }

  selectCarrera.innerHTML = `<option value="">-- Seleccionar Carrera --</option>` + 
    tempUniData.carreras.map(car => `<option value="${car.nombre}">${car.nombre}</option>`).join("");

  if (tempUniData.carreras.some(c => c.nombre === valorPrevio)) {
    selectCarrera.value = valorPrevio;
  }
}

function renderizarAlumnosModal() {
  const container = document.getElementById("cfg-container-alumnos");
  if (!container) return;

  if (tempUniData.alumnos.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">No hay alumnos matriculados todavía.</p>`;
    return;
  }

  const alumnosFiltrados = tempUniData.alumnos.map((alum, realIdx) => ({ ...alum, realIdx })).filter(alum => {
    if (!filtroBusquedaAlumno) return true;
    return (
      alum.codigo.toLowerCase().includes(filtroBusquedaAlumno) ||
      alum.nombre.toLowerCase().includes(filtroBusquedaAlumno) ||
      alum.carrera.toLowerCase().includes(filtroBusquedaAlumno)
    );
  });

  if (alumnosFiltrados.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8; font-size: 12px; font-style: italic;">No se encontraron alumnos con ese criterio de búsqueda.</p>`;
    return;
  }

  container.innerHTML = alumnosFiltrados.map(alum => {
    const estadoHabilitado = alum.estado !== false;
    const bgEstado = estadoHabilitado ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";
    const colorEstado = estadoHabilitado ? "#34d399" : "#f87171";
    const textoEstado = estadoHabilitado ? "Habilitado" : "Deshabilitado";

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
        <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
          <span style="font-size: 12px; color: #38bdf8; font-weight: 700; min-width: 60px;">[${alum.codigo}]</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 13px; color: #f8fafc; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">${alum.nombre}</span>
            <span style="font-size: 11px; color: #94a3b8;">${alum.carrera}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" onclick="window.toggleEstadoAlumno(${alum.realIdx})" style="background: ${bgEstado}; border: none; color: ${colorEstado}; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold;">${textoEstado}</button>
          <button type="button" onclick="window.eliminarAlumnoModal(${alum.realIdx})" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold;">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

window.eliminarAreaModal = function(idx) {
  sincronizarPuntajesDesdeDOM();
  const nombreArea = tempUniData.areas[idx].nombre;
  tempUniData.areas.splice(idx, 1);
  
  Object.keys(tempUniData.grupos).forEach(g => {
    delete tempUniData.grupos[g][nombreArea];
  });

  renderizarAreasModal();
  renderizarGruposModal();
};

window.eliminarGrupoModal = function(nombreGrupo) {
  sincronizarPuntajesDesdeDOM();
  delete tempUniData.grupos[nombreGrupo];
  renderizarGruposModal();
};

window.eliminarCarreraModal = function(idx) {
  tempUniData.carreras.splice(idx, 1);
  renderizarCarrerasModal();
};

window.toggleEstadoAlumno = function(realIdx) {
  if (tempUniData.alumnos[realIdx]) {
    tempUniData.alumnos[realIdx].estado = tempUniData.alumnos[realIdx].estado === false ? true : false;
    renderizarAlumnosModal();
  }
};

window.eliminarAlumnoModal = function(realIdx) {
  tempUniData.alumnos.splice(realIdx, 1);
  renderizarAlumnosModal();
};

async function cargarUniversidadesCreadas() {
  let contenedor = document.getElementById("contenedor-universidades-creadas");
  if (!contenedor) return;

  contenedor.style.display = "flex";
  contenedor.style.flexWrap = "wrap";
  contenedor.style.justifyContent = "center";
  contenedor.style.alignItems = "flex-start";
  contenedor.style.gap = "40px";

  try {
    const { data: universidades, error } = await supabase
      .from('universidades')
      .select('*');

    if (error) throw error;

    if (!universidades || universidades.length === 0) {
      contenedor.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; padding: 20px;">No hay universidades creadas aún.</p>`;
      return;
    }

    contenedor.innerHTML = universidades.map(uni => {
      const siglas = uni.siglas;
      const nombreCompleto = uni.nombre_completo || siglas;
      const logoSrc = uni.logo_url || "https://via.placeholder.com/80?text=LOGO";

      return `
        <div class="uni-item" onclick="window.location.href='universidad.html?siglas=${siglas}'" style="display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; width: 180px;">
          
          <div class="uni-logo-wrapper" 
               style="position: relative; width: 100px; height: 100px; background: transparent; border: none; box-shadow: none; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; transition: transform 0.3s ease, filter 0.3s ease;"
               onmouseover="this.style.transform='translateY(-6px)'; this.style.filter='drop-shadow(0 10px 15px rgba(59, 130, 246, 0.4))'; this.querySelector('.uni-actions').style.opacity='1'; this.querySelector('.uni-actions').style.visibility='visible';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.filter='none'; this.querySelector('.uni-actions').style.opacity='0'; this.querySelector('.uni-actions').style.visibility='hidden';">
            
            <img src="${logoSrc}" alt="${siglas}" class="uni-logo-img" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));">

            <!-- Botones flotantes (Editar y Eliminar) -->
            <div class="uni-actions" style="position: absolute; top: -6px; right: -6px; opacity: 0; visibility: hidden; transition: all 0.2s ease; display: flex; gap: 4px; background: rgba(15, 23, 42, 0.95); padding: 4px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); z-index: 10;">
              <button type="button" onclick="event.stopPropagation(); window.editarUniversidad('${siglas}')" title="Editar Universidad" style="background: none; border: none; color: #38bdf8; cursor: pointer; padding: 2px 4px; font-size: 14px;">✏️</button>
              <button type="button" onclick="event.stopPropagation(); window.eliminarUniversidad('${siglas}')" title="Eliminar Universidad" style="background: none; border: none; color: #fff; cursor: pointer; padding: 2px 4px; font-size: 14px;">🗑️</button>
            </div>

          </div>

          <h3 class="uni-siglas" style="font-size: 18px; font-weight: 800; color: #f8fafc; margin-bottom: 4px; letter-spacing: 0.5px;">${siglas}</h3>
          <p class="uni-nombre-largo" style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0;">${nombreCompleto}</p>

        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Error al cargar universidades:", err);
    contenedor.innerHTML = `<p style="color: #f87171; text-align: center; width: 100%; padding: 20px;">Error al conectar con la base de datos.</p>`;
  }
}

window.editarUniversidad = async function(siglas) {
  const modal = document.getElementById("modal-config-uni");
  if (!modal) return;

  editIndexKey = siglas;
  document.getElementById("modal-titulo-uni").innerText = `EDITAR UNIVERSIDAD: ${siglas}`;
  const inputSiglas = document.getElementById("cfg-siglas");
  inputSiglas.value = siglas;
  inputSiglas.disabled = true;

  try {
    const { data, error } = await supabase
      .from('universidades')
      .select('*')
      .eq('siglas', siglas)
      .single();

    if (error) throw error;

    if (data) {
      tempUniData = {
        siglas: data.siglas,
        nombreCompleto: data.nombre_completo || '',
        logoUrl: data.logo_url || '',
        cartillaUrl: data.cartilla_url || '',
        cartillaNombre: data.cartilla_nombre || '',
        areas: data.areas || [],
        grupos: data.grupos || {},
        carreras: data.carreras || [],
        alumnos: data.alumnos || []
      };

      document.getElementById("cfg-nombre-completo").value = tempUniData.nombreCompleto;
      document.getElementById("cfg-logo").value = "";
      if (typeof window.establecerCartillaUniversidadBase64 === "function") {
        window.establecerCartillaUniversidadBase64(tempUniData.cartillaUrl || leerCartillaUniLocal(data.siglas));
      }

      renderizarAreasModal();
      renderizarGruposModal();
      renderizarCarrerasModal();
      renderizarAlumnosModal();

      modal.style.display = "flex";
    }
  } catch (err) {
    console.error("Error al cargar datos para editar:", err);
    alert("No se pudieron cargar los datos de la universidad para editar.");
  }
};

window.eliminarUniversidad = async function(siglas) {
  if (confirm(`¿Estás seguro de eliminar completamente la universidad ${siglas} y todos sus datos de Supabase?`)) {
    try {
      const { error } = await supabase
        .from('universidades')
        .delete()
        .eq('siglas', siglas);

      if (error) throw error;

      guardarCartillaUniLocal(siglas, "");
      cargarUniversidadesCreadas();
      alert(`Universidad ${siglas} eliminada correctamente.`);
    } catch (err) {
      console.error("Error al eliminar universidad:", err);
      alert("Hubo un error al intentar eliminar la universidad.");
    }
  }
};