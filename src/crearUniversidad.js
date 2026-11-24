// src/crearUniversidad.js
import { supabase } from '../supabaseClient.js';

export function inicializarCrearUniversidad(onUniversidadGuardada) {
  let tempUniData = {
    siglas: "",
    nombreCompleto: "",
    logoUrl: "",
    areas: [],
    grupos: {},
    carreras: [],
    alumnos: []
  };
  let editIndexKey = null;

  // Inyectar el modal completo en el DOM si no existe
  if (!document.getElementById("modal-config-uni")) {
    const modalHTML = `
      <div id="modal-config-uni" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(10px); z-index: 2000; justify-content: center; align-items: center; overflow-y: auto; padding: 20px;">
        <div style="background: rgba(11, 18, 32, 0.95); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 24px; padding: 35px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.7); color: #f8fafc;">
          
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin: 0;">2. Áreas y Estructura de Preguntas</h3>
              <button type="button" id="cfg-btn-add-area" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; padding: 5px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600;">+ Agregar Área</button>
            </div>
            <div id="cfg-container-areas" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Se llena dinámicamente -->
            </div>
          </div>

          <!-- 3. CARRERAS -->
          <div style="margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="font-size: 14px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin: 0;">3. Carreras Profesionales</h3>
              <button type="button" id="cfg-btn-add-carrera" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; padding: 5px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600;">+ Agregar Carrera</button>
            </div>
            <div id="cfg-container-carreras" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Se llena dinámicamente -->
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

    // Eventos del modal
    document.getElementById("btn-cerrar-config").addEventListener("click", cerrarModal);
    document.getElementById("btn-cancelar-config").addEventListener("click", cerrarModal);

    document.getElementById("cfg-btn-add-area").addEventListener("click", () => {
      tempUniData.areas.push({ nombre: "Nueva Área", desde: 1, hasta: 10 });
      renderizarAreasModal(tempUniData.areas);
    });

    document.getElementById("cfg-btn-add-carrera").addEventListener("click", () => {
      tempUniData.carreras.push({ nombre: "", grupo: "A" });
      renderizarCarrerasModal(tempUniData.carreras);
    });

    document.getElementById("btn-guardar-universidad").addEventListener("click", async () => {
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

        // Recoger datos actualizados de los inputs visuales del modal
        const areasActualizadas = [];
        document.querySelectorAll(".item-area-row").forEach(row => {
          const nombre = row.querySelector(".input-area-nombre").value;
          const desde = parseInt(row.querySelector(".input-area-desde").value) || 1;
          const hasta = parseInt(row.querySelector(".input-area-hasta").value) || 10;
          areasActualizadas.push({ nombre, desde, hasta });
        });

        const carrerasActualizadas = [];
        document.querySelectorAll(".item-carrera-row").forEach(row => {
          const nombre = row.querySelector(".input-carrera-nombre").value;
          const grupo = row.querySelector(".input-carrera-grupo").value;
          carrerasActualizadas.push({ nombre, grupo });
        });

        const datosUniBD = {
          siglas: siglas,
          nombre_completo: nombreCompleto || siglas,
          logo_url: logoUrl,
          areas: areasActualizadas,
          grupos: tempUniData.grupos || {},
          carreras: carrerasActualizadas,
          alumnos: tempUniData.alumnos || []
        };

        const { error: upsertError } = await supabase
          .from('universidades')
          .upsert([datosUniBD], { onConflict: ['siglas'] });

        if (upsertError) throw upsertError;

        cerrarModal();
        alert("¡Universidad guardada con éxito en Supabase!");
        if (typeof onUniversidadGuardada === "function") {
          onUniversidadGuardada();
        }
      } catch (e) {
        console.error("Error al guardar universidad:", e);
        alert("Hubo un error al guardar la universidad en la base de datos.");
      }
    });
  }

  function cerrarModal() {
    const modal = document.getElementById("modal-config-uni");
    if (modal) modal.style.display = "none";
  }

  function renderizarAreasModal(areas) {
    const container = document.getElementById("cfg-container-areas");
    container.innerHTML = areas.map((area, idx) => `
      <div class="item-area-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
        <input type="text" value="${area.nombre}" placeholder="Nombre del área" class="input-area-nombre" style="padding: 6px 10px; background: rgba(2,6,23,0.6); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
        <input type="number" value="${area.desde}" placeholder="Desde" class="input-area-desde" style="padding: 6px 10px; background: rgba(2,6,23,0.6); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
        <input type="number" value="${area.hasta}" placeholder="Hasta" class="input-area-hasta" style="padding: 6px 10px; background: rgba(2,6,23,0.6); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
        <button type="button" onclick="window.eliminarAreaModal(${idx})" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">✕</button>
      </div>
    `).join("");
  }

  function renderizarCarrerasModal(carreras) {
    const container = document.getElementById("cfg-container-carreras");
    container.innerHTML = carreras.map((car, idx) => `
      <div class="item-carrera-row" style="display: grid; grid-template-columns: 3fr 1fr auto; gap: 10px; align-items: center; background: rgba(30, 41, 59, 0.4); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
        <input type="text" value="${car.nombre}" placeholder="Nombre de la carrera" class="input-carrera-nombre" style="padding: 6px 10px; background: rgba(2,6,23,0.6); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; color: #fff; font-size: 13px; outline: none;">
        <input type="text" value="${car.grupo || 'A'}" placeholder="Grupo" class="input-carrera-grupo" style="padding: 6px 10px; background: rgba(2,6,23,0.6); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; color: #fff; font-size: 13px; text-align: center; outline: none;">
        <button type="button" onclick="window.eliminarCarreraModal(${idx})" style="background: rgba(239, 68, 68, 0.2); border: none; color: #f87171; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">✕</button>
      </div>
    `).join("");
  }

  window.eliminarAreaModal = function(idx) {
    tempUniData.areas.splice(idx, 1);
    renderizarAreasModal(tempUniData.areas);
  };

  window.eliminarCarreraModal = function(idx) {
    tempUniData.carreras.splice(idx, 1);
    renderizarCarrerasModal(tempUniData.carreras);
  };

  // Función de apertura exportada
  return async function abrirModalUniversidad(siglasExistente = null) {
    editIndexKey = siglasExistente;
    const modal = document.getElementById("modal-config-uni");
    if (!modal) return;

    if (editIndexKey) {
      document.getElementById("modal-titulo-uni").innerText = `EDITAR UNIVERSIDAD: ${editIndexKey}`;
      document.getElementById("cfg-siglas").value = editIndexKey;
      document.getElementById("cfg-siglas").disabled = true;

      // Cargar datos reales desde Supabase si se está editando
      try {
        const { data: uniData, error } = await supabase
          .from('universidades')
          .select('*')
          .ilike('siglas', editIndexKey)
          .single();

        if (uniData) {
          tempUniData = {
            siglas: uniData.siglas,
            nombreCompleto: uniData.nombre_completo || '',
            logoUrl: uniData.logo_url || '',
            areas: uniData.areas || [],
            grupos: uniData.grupos || {},
            carreras: uniData.carreras || [],
            alumnos: uniData.alumnos || []
          };
          document.getElementById("cfg-nombre-completo").value = tempUniData.nombreCompleto;
        }
      } catch (err) {
        console.error("Error al cargar universidad para editar:", err);
      }
    } else {
      document.getElementById("modal-titulo-uni").innerText = "CREAR NUEVA UNIVERSIDAD";
      document.getElementById("cfg-siglas").value = "";
      document.getElementById("cfg-siglas").disabled = false;
      document.getElementById("cfg-nombre-completo").value = "";
      document.getElementById("cfg-logo").value = "";
      tempUniData = { siglas: "", nombreCompleto: "", logoUrl: "", areas: [], grupos: {}, carreras: [], alumnos: [] };
    }

    renderizarAreasModal(tempUniData.areas);
    renderizarCarrerasModal(tempUniData.carreras);
    modal.style.display = "flex";
  };
}