document.addEventListener("DOMContentLoaded", () => {
  // Capturar las siglas desde la URL (ej: universidad.html?siglas=UNAP)
  const params = new URLSearchParams(window.location.search);
  const siglas = params.get("siglas");

  if (!siglas) {
    alert("No se especificó ninguna universidad.");
    window.location.href = "admin.html";
    return;
  }

  // Buscar los datos en la base de datos local
  const db = JSON.parse(localStorage.getItem("academiaDB")) || { universidades: {} };
  const uni = db.universidades[siglas];

  if (!uni) {
    alert("La universidad seleccionada no existe o fue eliminada.");
    window.location.href = "admin.html";
    return;
  }

  // Pintar los datos en la interfaz
  document.getElementById("uni-siglas").innerText = siglas;
  document.getElementById("uni-nombre").innerText = uni.nombreCompleto || "Universidad Nacional";
  
  const logoImg = document.getElementById("uni-logo");
  if (uni.logo) {
    logoImg.src = uni.logo;
  } else {
    logoImg.src = "https://via.placeholder.com/80?text=LOGO";
  }
});