(function() {
  function ruidoEntero(rango) {
    return Math.floor(Math.random() * rango) - Math.floor(rango / 2);
  }

  const getImageDataOriginal = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const datos = getImageDataOriginal.apply(this, args);
    for (let i = 0; i < datos.data.length; i += 4) {
      datos.data[i]     = Math.min(255, Math.max(0, datos.data[i]     + ruidoEntero(4)));
      datos.data[i + 1] = Math.min(255, Math.max(0, datos.data[i + 1] + ruidoEntero(4)));
      datos.data[i + 2] = Math.min(255, Math.max(0, datos.data[i + 2] + ruidoEntero(4)));
    }
    return datos;
  };

  const toDataURLOriginal = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext("2d");
    if (ctx && this.width > 0 && this.height > 0) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      ctx.fillStyle = "rgba(" + Math.floor(Math.random()*255) + "," + Math.floor(Math.random()*255) + "," + Math.floor(Math.random()*255) + ",1)";
      ctx.fillRect(x, y, 1, 1);
    }
    return toDataURLOriginal.apply(this, args);
  };

  const getChannelDataOriginal = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(...args) {
    const datos = getChannelDataOriginal.apply(this, args);
    for (let i = 0; i < datos.length; i += 100) {
      datos[i] = datos[i] + (Math.random() - 0.5) * 0.0001;
    }
    return datos;
  };

  let huboClickReciente = false;
  document.addEventListener("click", () => {
    huboClickReciente = true;
    setTimeout(() => { huboClickReciente = false; }, 1000);
  }, true);

  const windowOpenOriginal = window.open;
  window.open = function(...args) {
    if (huboClickReciente) {
      return windowOpenOriginal.apply(window, args);
    } else {
      console.log("POPUP BLOQUEADO:", args[0]);
      try {
        chrome.runtime.sendMessage({ tipo: "popup_bloqueado", detalle: (args[0] || "sin URL") + " en " + window.location.hostname });
      } catch(e) {}
      return null;
    }
  };

  console.log("Anti-fingerprinting y anti-popup activos en esta pagina");
})();
