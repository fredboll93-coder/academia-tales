// src/main.js

// Credenciales del Administrador
const ADMIN_CODE = "48177869";


// Referencias a los elementos del DOM
const form = document.getElementById("login-form");
const grupoDni = document.getElementById("grupo-dni");
const grupoPassword = document.getElementById("grupo-password");
const inputDni = document.getElementById("dni");
const inputPassword = document.getElementById("password");
const btnContinuar = document.getElementById("btn-continuar");
const mensajeEstado = document.getElementById("mensaje-estado");

let pasoActual = 1; // 1: Pedir código, 2: Pedir contraseña de admin

form.addEventListener("submit", (e) => {
  e.preventDefault();
  mensajeEstado.textContent = "";

  if (pasoActual === 1) {
    const codigoIngresado = inputDni.value.trim();

    // 1. Verificar si es el Código de Administrador
    if (codigoIngresado === ADMIN_CODE) {
      pasoActual = 2;
      grupoDni.style.display = "none";
      grupoPassword.style.display = "block";
      inputPassword.focus();
      btnContinuar.textContent = "Verificar Contraseña";
      return;
    }

    // 2. Obtener la Base de Datos dinámica desde localStorage
    let db = JSON.parse(localStorage.getItem("academiaDB"));
    
    if (!db) {
      db = { universidades: {}, simulacros: {} };
      localStorage.setItem("academiaDB", JSON.stringify(db));
    }

    let alumnoEncontrado = null;
    let universidadEncontrada = "";

    if (db.universidades) {
      for (let uni in db.universidades) {
        const universidadObj = db.universidades[uni];
        if (universidadObj.alumnos && Array.isArray(universidadObj.alumnos)) {
          const encontrado = universidadObj.alumnos.find(al => al.codigo === codigoIngresado);
          if (encontrado) {
            alumnoEncontrado = encontrado;
            universidadEncontrada = uni;
            break;
          }
        }
      }
    }

    if (!alumnoEncontrado && db.simulacros) {
      for (let sim in db.simulacros) {
        const lista = db.simulacros[sim];
        if (Array.isArray(lista) && lista.includes(codigoIngresado)) {
          alumnoEncontrado = { codigo: codigoIngresado, nombres: "Alumno Simulacro", carrera: "General" };
          break;
        }
      }
    }

    if (alumnoEncontrado) {
      if (alumnoEncontrado.activo === false) {
        mensajeEstado.style.color = "#f87171";
        mensajeEstado.textContent = "Tu cuenta se encuentra deshabilitada. Comunícate con administración.";
        return;
      }

      mensajeEstado.style.color = "#4ade80";
      
      let infoExtra = `Código: ${alumnoEncontrado.codigo} | Alumno: ${alumnoEncontrado.nombres} | Carrera: ${alumnoEncontrado.carrera}`;
      if (universidadEncontrada) {
        infoExtra += ` | Universidad: ${universidadEncontrada}`;
      }

      mensajeEstado.innerHTML = `¡Acceso concedido!<br><span style="font-size:12px; color:#38bdf8;">${infoExtra}</span><br>Redirigiendo...`;
      
      localStorage.setItem("usuarioLogueado", JSON.stringify({ 
        tipo: "alumno", 
        codigo: alumnoEncontrado.codigo,
        nombres: alumnoEncontrado.nombres,
        carrera: alumnoEncontrado.carrera,
        universidad: universidadEncontrada
      }));

      setTimeout(() => {
        // window.location.href = "student.html"; 
      }, 2000);

    } else {
      mensajeEstado.style.color = "#f87171";
      mensajeEstado.innerHTML = `El código ingresado no se encuentra registrado. <br>Comunícate con soporte vía <a href="https://wa.me/" target="_blank" class="whatsapp-link">WhatsApp</a>.`;
    }

  } else if (pasoActual === 2) {
    // 3. Validar la contraseña del Administrador leyendo la clave personalizada
    const passwordIngresada = inputPassword.value.trim();
    const adminPassActual = localStorage.getItem("adminPasswordCustom") || "clave";

    if (passwordIngresada === adminPassActual) {
      mensajeEstado.style.color = "#4ade80";
      mensajeEstado.textContent = "¡Bienvenido, Administrador! Entrando...";
      
      localStorage.setItem("usuarioLogueado", JSON.stringify({ tipo: "admin" }));
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1500);

    } else {
      mensajeEstado.style.color = "#f87171";
      mensajeEstado.textContent = "Contraseña de administrador incorrecta.";
    }
  }
});