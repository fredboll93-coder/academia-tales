const urlParams = new URLSearchParams(window.location.search);
const siglas = urlParams.get('siglas');

const tituloUni = document.getElementById('uni-siglas-title');
if (tituloUni) {
  tituloUni.textContent = siglas || 'General';
}

const btnVolver = document.getElementById('btn-volver');
if (btnVolver) {
  btnVolver.onclick = () => {
    window.location.href = `universidad.html?siglas=${siglas}`;
  };
}

function cargarSimulacros() {
  const container = document.getElementById('simulacros-container');
  if (!container) return;

  const db = JSON.parse(localStorage.getItem('academiaDB')) || { universidades: [] };
  const universidad = db.universidades.find(u => u.siglas === siglas);
  const simulacros = universidad && universidad.simulacros ? universidad.simulacros : [];

  if (simulacros.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <p style="font-size: 15px; color: #94a3b8;">Aún no hay ningún simulacro creado.</p>
        <p onclick="crearSimulacro()" style="font-size: 14px; color: #60a5fa; cursor: pointer; text-decoration: underline; font-weight: 500;">Crea tu primer simulacro aquí</p>
      </div>
    `;
  } else {
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    simulacros.forEach((sim) => {
      html += `
        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); padding: 16px 20px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">${sim.titulo}</h4>
            <p style="font-size: 12px; color: #94a3b8;">Preguntas: ${sim.preguntas || 0} • Duración: ${sim.duracion || '60'} mins</p>
          </div>
          <button style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">Ver Detalles</button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }
}

window.crearSimulacro = function() {
  const db = JSON.parse(localStorage.getItem('academiaDB')) || { universidades: [] };
  let universidad = db.universidades.find(u => u.siglas === siglas);

  if (!universidad) {
    // Si la universidad no existe todavía en la BD, la inicializamos de forma segura
    universidad = { siglas: siglas, simulacros: [] };
    db.universidades.push(universidad);
  }

  if (!universidad.simulacros) {
    universidad.simulacros = [];
  }

  universidad.simulacros.push({
    titulo: `Simulacro de Admisión N° ${universidad.simulacros.length + 1}`,
    preguntas: 50,
    duracion: 120
  });

  localStorage.setItem('academiaDB', JSON.stringify(db));
  cargarSimulacros();
}

cargarSimulacros();