const RULES_URL = "https://raw.githubusercontent.com/henrylandia/coltan-blocker/main/rules/trackers.json";

let listaDominiosTrackers = [];

async function registrarEvento(tipo, detalle) {
  const resultado = await chrome.storage.local.get(["logActividad", "contadores"]);
  let log = resultado.logActividad || [];
  let contadores = resultado.contadores || { bloqueados: 0, cookiesBorradas: 0, popupsBloqueados: 0, storageLimpiado: 0 };

  log.unshift({
    tipo: tipo,
    detalle: detalle,
    fecha: new Date().toISOString()
  });

  if (log.length > 300) {
    log = log.slice(0, 300);
  }

  if (tipo === "bloqueo") contadores.bloqueados++;
  if (tipo === "cookie") contadores.cookiesBorradas++;
  if (tipo === "popup") contadores.popupsBloqueados++;
  if (tipo === "storage") contadores.storageLimpiado++;

  await chrome.storage.local.set({ logActividad: log, contadores: contadores });
}

async function actualizarReglasDesdeGitHub() {
  try {
    const response = await fetch(RULES_URL, { cache: "no-store" });
    const data = await response.json();
    const dominios = data.trackers;
    listaDominiosTrackers = dominios;

    const nuevasReglas = dominios.map((dominio, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: "||" + dominio,
        resourceTypes: ["xmlhttprequest", "script", "image", "ping", "sub_frame"]
      }
    }));

    const reglasExistentes = await chrome.declarativeNetRequest.getDynamicRules();
    const idsAEliminar = reglasExistentes.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: idsAEliminar,
      addRules: nuevasReglas
    });

    await chrome.storage.local.set({ ultimaActualizacion: new Date().toISOString(), totalDominios: dominios.length });

    console.log("Reglas actualizadas desde GitHub. Total dominios bloqueados:", dominios.length);

    limpiarCookiesDeTrackers();
  } catch (error) {
    console.error("Error actualizando reglas:", error);
  }
}

async function limpiarCookiesDeTrackers() {
  for (const dominio of listaDominiosTrackers) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: dominio });
      for (const cookie of cookies) {
        const url = (cookie.secure ? "https://" : "http://") + cookie.domain.replace(/^\./, "") + cookie.path;
        await chrome.cookies.remove({ url: url, name: cookie.name });
        registrarEvento("cookie", "Cookie de " + dominio + " (" + cookie.name + ") eliminada");
      }
    } catch (e) {
      // dominio sin cookies, seguimos
    }
  }

  const origenes = listaDominiosTrackers.map(d => "https://" + d);
  chrome.browsingData.remove(
    { origins: origenes },
    { localStorage: true, indexedDB: true }
  ).then(() => {
    registrarEvento("storage", "localStorage/IndexedDB de " + listaDominiosTrackers.length + " dominios trackers limpiado");
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension instalada, actualizando reglas por primera vez...");
  actualizarReglasDesdeGitHub();
});

chrome.runtime.onStartup.addListener(() => {
  actualizarReglasDesdeGitHub();
});

chrome.alarms.create("limpiezaPeriodica", { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "limpiezaPeriodica") {
    limpiarCookiesDeTrackers();
  }
});

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log("BLOQUEADO:", info.request.url, "| Regla ID:", info.rule.ruleId);
  registrarEvento("bloqueo", info.request.url);
});

chrome.runtime.onMessage.addListener((mensaje, sender, sendResponse) => {
  if (mensaje.tipo === "popup_bloqueado") {
    registrarEvento("popup", mensaje.detalle);
  }
});
