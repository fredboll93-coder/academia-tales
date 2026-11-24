document.addEventListener("DOMContentLoaded", async () => {
  // Capturar las siglas desde la URL (ej: universidad.html?siglas=UNAP)
  const params = new URLSearchParams(window.location.search);
  const siglas = (params.get("siglas") || "").trim().toUpperCase();

  if (!siglas) {
    alert("No se especificó ninguna universidad.");
    window.location.href = "admin.html";
    return;
  }

  // Buscar los datos en Supabase en lugar de localStorage
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const SUPABASE_URL = window.SUPABASE_URL || "https://veoyldrbaypjllzzkovc.supabase.co";
  const SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    "sb_publishable_w8bSgcq_28dQ3rh6Ki0RPA_-vC-iMv6";
  const supabase = window.supabaseClient || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: uni, error } = await supabase
    .from("universidades")
    .select("*")
    .eq("siglas", siglas)
    .maybeSingle();

  if (error || !uni) {
    alert("La universidad seleccionada no existe o fue eliminada.");
    window.location.href = "admin.html";
    return;
  }

  // Pintar los datos en la interfaz
  document.getElementById("uni-siglas").innerText = uni.siglas || siglas;
  document.getElementById("uni-nombre").innerText =
    uni.nombreCompleto || uni.nombre_completo || uni.nombre || "Universidad Nacional";

  const logoImg = document.getElementById("uni-logo");
  const logoUrl = uni.logo || uni.logo_url || "";
  if (logoUrl) {
    logoImg.src = logoUrl;
  } else {
    logoImg.src = "https://via.placeholder.com/80?text=LOGO";
  }
});
