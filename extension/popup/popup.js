async function cargarDatos() {
  const resultado = await chrome.storage.local.get(["logActividad", "contadores"]);
  const contadores = resultado.contadores || { bloqueados: 0, cookiesBorradas: 0, popupsBloqueados: 0, storageLimpiado: 0 };
  const log = resultado.logActividad || [];

  document.getElementById("numBloqueados").textContent = contadores.bloqueados;
  document.getElementById("numCookies").textContent = contadores.cookiesBorradas;
  document.getElementById("numPopups").textContent = contadores.popupsBloqueados;
  document.getElementById("numStorage").textContent = contadores.storageLimpiado;

  const iconos = { bloqueo: "🚫", cookie: "🍪", popup: "🪟", storage: "🗑️" };
  const listaLog = document.getElementById("listaLog");
  listaLog.innerHTML = "";

  log.slice(0, 100).forEach(entrada => {
    const hora = new Date(entrada.fecha).toLocaleTimeString();
    const div = document.createElement("div");
    div.className = "entrada-log";
    div.textContent = (iconos[entrada.tipo] || "•") + " [" + hora + "] " + entrada.detalle;
    listaLog.appendChild(div);
  });
}

document.getElementById("btnRegistro").addEventListener("click", () => {
  const panel = document.getElementById("panelRegistro");
  panel.classList.toggle("oculto");
});

cargarDatos();
setInterval(cargarDatos, 2000);
