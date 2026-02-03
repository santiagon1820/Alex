const PAGE_H_PX = 1056;
let CONTENT_START = 175; // Ahora dinámico
let MARGIN_BOTTOM = 220; // Aumentado para más espacio al final de la página
function getMaxH() {
  return PAGE_H_PX - CONTENT_START - MARGIN_BOTTOM;
}
let MAX_H = getMaxH();

const LIMIT_LINES = 10;
const LIMIT_CHARS = 400;

// --- FUNCIÓN PARA FORMATO DE FECHA (ej: 30 de Enero del 2026) ---
function getFormattedDate() {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const d = new Date();
  return `${d.getDate()} de ${months[d.getMonth()]} del ${d.getFullYear()}`;
}

let appData = {
  header: {
    fecha: getFormattedDate(),
    numero: "Cargando...",
    dependencia: "",
    asunto: "A quién corresponda",
  },
  rows: [],
  footer: {
    cantidadLetra: "",
    condiciones: `• CONDICION DE PAGO: 30  Días hábiles
• VIGENCIA DE COTIZACION: 60 Días naturales
• GARANTIA:
• TIEMPO DE ENTREGA:
• COTIZACION EXPRESADA EN MONEDA NACIONAL
• ORIGEN DEL BIEN: EXTRANJERO`,
  },
};

let renderTimeout;
let savedFocusId = null;

window.onload = function () {
  fetchFolio();
  appData.rows.push(createNewRowObj());
  render();
  // Calcular letra inicial
  updateVisualsOnly(appData.rows[0].id);
};

const companyConfig = {
  interlab: {
    nombre: "INTERLAB DIGITAL S.A DE C.V",
    logo: "interlabSign.png",
    headerLogo: "interlab.png",
    firma: "Karla Fabiola Moron Tobon",
    prefix: "InterlabCot",
    margins: { top: 175, bottom: 220 },
    rfc: "IDI240301NS2",
    rupc: "P38684",
  },
  davana: {
    nombre: "DAVANA S.A DE C.V",
    logo: "davanaSign.png",
    headerLogo: "davana.png",
    firma: "Juan Daniel Dives Barragán",
    prefix: "DavanaCot",
    margins: { top: 110, bottom: 145 }, // Reducido top para menos espacio entre logo y cotización
    rfc: "IDA220310C28",
    rupc: "P38543",
  },
};

let currentCompany = "interlab";

async function fetchFolio() {
  try {
    const response = await fetch(
      `/api/cotizaciones/folio?empresa=${currentCompany}`,
    );
    const data = await response.json();
    appData.header.numero = data.folio;
    render();
  } catch (error) {
    console.error("Error al obtener el folio:", error);
  }
}

function changeCompany(companyName) {
  // Si viene onClick desde el sidebar
  if (companyName) {
    currentCompany = companyName;
    // Update hidden select
    const select = document.getElementById("empresaSelect");
    if (select) select.value = companyName;
  } else {
    // Si viene desde el select (fallback)
    const select = document.getElementById("empresaSelect");
    currentCompany = select.value;
  }

  // Update Margins based on company
  if (companyConfig[currentCompany]) {
    CONTENT_START = companyConfig[currentCompany].margins.top;
    MARGIN_BOTTOM = companyConfig[currentCompany].margins.bottom;
    MAX_H = getMaxH();
  }

  // Update Sidebar UI
  document.querySelectorAll(".company-card").forEach((card) => {
    card.classList.remove("active");
  });
  const activeCard = document.getElementById(`card-${currentCompany}`);
  if (activeCard) activeCard.classList.add("active");

  // Update Topbar Title
  const titleEl = document.getElementById("editor-title");
  if (titleEl) {
    // Capitalize Text
    const name =
      currentCompany.charAt(0).toUpperCase() + currentCompany.slice(1);
    titleEl.textContent = `Editor ${name}`;
  }

  fetchFolio();
}

function createNewRowObj() {
  return {
    id: "row_" + Date.now() + Math.random().toString(36).substr(2, 9),
    pn: "",
    descripcion: "",
    cantidad: 1,
    um: "PZA",
    precio: 0,
  };
}

function addNewRow() {
  appData.rows.push(createNewRowObj());
  render();
  if (appData.rows.length > 0) updateVisualsOnly(appData.rows[0].id);
}

function deleteRow(id) {
  appData.rows = appData.rows.filter((r) => r.id !== id);
  render();
  if (appData.rows.length > 0) updateVisualsOnly(appData.rows[0].id);
  else {
    document
      .querySelectorAll(".display-subtotal")
      .forEach((el) => (el.textContent = formatMoney(0)));
    document
      .querySelectorAll(".display-iva")
      .forEach((el) => (el.textContent = formatMoney(0)));
    document
      .querySelectorAll(".display-total")
      .forEach((el) => (el.textContent = formatMoney(0)));
    const inputLetra = document.getElementById("f_letra");
    if (inputLetra) inputLetra.value = numeroALetras(0);
    appData.footer.cantidadLetra = numeroALetras(0);
  }
}

function sanitizeInput(text) {
  let lines = text.split("\n");
  if (lines.length > LIMIT_LINES) {
    lines = lines.slice(0, LIMIT_LINES);
    text = lines.join("\n");
  }
  if (text.length > LIMIT_CHARS) {
    text = text.substring(0, LIMIT_CHARS);
  }
  return text;
}

function updateRow(id, field, val, element) {
  const row = appData.rows.find((r) => r.id === id);
  if (row) {
    if (field === "descripcion") {
      const cleanVal = sanitizeInput(val);
      if (val !== cleanVal) {
        val = cleanVal;
        element.value = cleanVal;
      }
    }

    row[field] = val;

    if (field === "descripcion") {
      if (element) {
        element.style.height = "auto";
        element.style.height = element.scrollHeight + "px";

        const pageContent = element.closest(".page-content");
        if (pageContent && pageContent.scrollHeight > MAX_H) {
          render();
          return;
        }
      }
      scheduleRender();
    } else if (field === "cantidad" || field === "precio") {
      updateVisualsOnly(id);
    }
  }
}

function updateVisualsOnly(rowId) {
  const row = appData.rows.find((r) => r.id === rowId);

  if (row) {
    const totalRow = row.cantidad * row.precio;
    const totalCell = document.getElementById("total_cell_" + rowId);
    if (totalCell) totalCell.textContent = formatMoney(totalRow);
  }

  const subtotal = appData.rows.reduce(
    (acc, r) => acc + r.cantidad * r.precio,
    0,
  );
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  document
    .querySelectorAll(".display-subtotal")
    .forEach((el) => (el.textContent = formatMoney(subtotal)));
  document
    .querySelectorAll(".display-iva")
    .forEach((el) => (el.textContent = formatMoney(iva)));
  document
    .querySelectorAll(".display-total")
    .forEach((el) => (el.textContent = formatMoney(total)));

  // Calculamos la letra y actualizamos
  const textoLetra = numeroALetras(total);
  appData.footer.cantidadLetra = textoLetra;

  const inputLetra = document.getElementById("f_letra");
  if (inputLetra) {
    inputLetra.value = textoLetra;
  }
}

function updateHeader(field, val) {
  appData.header[field] = val;
}

function updateFooter(field, val, element) {
  if (field === "condiciones") {
    const cleanVal = sanitizeInput(val);
    if (val !== cleanVal) {
      val = cleanVal;
      element.value = cleanVal;
    }
  }

  appData.footer[field] = val;

  if (field === "condiciones" && element) {
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
    const pageContent = element.closest(".page-content");
    if (pageContent && pageContent.scrollHeight > MAX_H) {
      render();
      return;
    }
    scheduleRender();
  }
}

function scheduleRender(delay = 500) {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    render();
  }, delay);
}

function render() {
  const activeEl = document.activeElement;
  let savedSelectionStart = 0;
  let savedSelectionEnd = 0;

  if (activeEl && activeEl.id) {
    savedFocusId = activeEl.id;
    savedSelectionStart = activeEl.selectionStart;
    savedSelectionEnd = activeEl.selectionEnd;
  }

  const container = document.getElementById("pdf-container");
  container.innerHTML = "";

  let queueRows = [...appData.rows];
  let pageNum = 1;
  let finishedRows = false;
  let finishedFooter = false;

  const subtotal = appData.rows.reduce(
    (acc, r) => acc + r.cantidad * r.precio,
    0,
  );
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  if (!appData.footer.cantidadLetra) {
    appData.footer.cantidadLetra = numeroALetras(total);
  }

  let footerSegments = [
    { html: getTotalesHTML(subtotal, iva, total) },
    { html: getLetraHTML() },
    { html: getCondicionesHTML() },
    { html: getDatosEmpresaHTML() },
    { html: getFirmaHTML() },
  ];
  let footerIndex = 0;

  while (!finishedRows || !finishedFooter) {
    const page = document.createElement("div");
    page.className = "page";
    // Set background image dynamically based on selected company
    const config = companyConfig[currentCompany];
    page.style.backgroundImage = `url("https://s3-mx-1.mglab.com/mglab/${config.headerLogo}")`;

    // Add specific class for CSS styling (colors, borders)
    if (currentCompany === "davana") {
      page.classList.add("davana-mode");
    } else {
      page.classList.add("interlab-mode");
    }

    const content = document.createElement("div");
    content.className = "page-content";
    content.style.top = CONTENT_START + "px"; // Asegurar que el top sea dinámico
    content.style.height = MAX_H + "px";
    page.appendChild(content);
    container.appendChild(page);

    let currentY = 0;

    if (pageNum === 1) {
      const headerEl = appendHTML(content, getHeaderHTML());
      restoreHeaderEvents(headerEl);
      currentY += headerEl.offsetHeight;
    }

    if (queueRows.length > 0) {
      const tableStruct = document.createElement("table");
      tableStruct.className = "table-cotizacion";
      // Headers deben ser iguales para ambas empresas según solicitud
      tableStruct.innerHTML = `<thead><tr>
                        <td style="width:5%">Partida</td><td style="width:8%">Cantidad</td><td style="width:10%">U.M</td>
                        <td style="width:11%">P.N.</td><td style="width:36%">Descripción</td>
                        <td style="width:10%">Precio U.</td>
                        <td style="width:15%">Total</td><td style="width:5%">X</td>
                    </tr></thead><tbody></tbody>`;

      content.appendChild(tableStruct);
      currentY += tableStruct.querySelector("thead").offsetHeight;

      const tbody = tableStruct.querySelector("tbody");

      while (queueRows.length > 0) {
        const rowObj = queueRows[0];
        const tr = createRowTR(rowObj, appData.rows.indexOf(rowObj) + 1);
        tbody.appendChild(tr);

        const ta = tr.querySelector("textarea");
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";

        const rowH = tr.offsetHeight;

        if (currentY + rowH > MAX_H) {
          tbody.removeChild(tr);
          break;
        } else {
          currentY += rowH;
          queueRows.shift();
        }
      }
    }

    if (queueRows.length === 0) {
      finishedRows = true;
      while (footerIndex < footerSegments.length) {
        const segment = footerSegments[footerIndex];
        const div = document.createElement("div");
        div.className = "footer-segment";
        div.innerHTML = segment.html;
        content.appendChild(div);

        const footerTa = div.querySelector("textarea");
        if (footerTa) {
          footerTa.style.height = "auto";
          footerTa.style.height = footerTa.scrollHeight + "px";
        }

        restoreFooterEvents(div);

        const segH = div.offsetHeight;

        if (currentY + segH > MAX_H) {
          content.removeChild(div);
          break;
        } else {
          currentY += segH;
          footerIndex++;
        }
      }
      if (footerIndex >= footerSegments.length) finishedFooter = true;
    }

    pageNum++;
    if (pageNum > 20) break;
  }

  if (savedFocusId) {
    const el = document.getElementById(savedFocusId);
    if (el) {
      el.focus();
      if (
        el.setSelectionRange &&
        (el.tagName === "TEXTAREA" || el.type === "text")
      ) {
        try {
          el.setSelectionRange(savedSelectionStart, savedSelectionEnd);
        } catch (e) {}
      }
    }
  }
}

function createRowTR(data, index) {
  const tr = document.createElement("tr");
  const totalRow = data.cantidad * data.precio;
  const isDavana = currentCompany === "davana";
  const textColor = "#000"; // Siempre negro a solicitud del usuario

  tr.innerHTML = `
                <td class="text-center font-bold" style="color:${textColor};">${index}</td>
                <td><input type="number" id="cant_${data.id}" class="text-center font-bold" style="color:${textColor};" value="${data.cantidad}" oninput="updateRow('${data.id}', 'cantidad', this.value, this)"></td>
                <td>
                    <select onchange="updateRow('${data.id}', 'um', this.value, this)" style="color:${textColor};">
                        <option value="PIEZA" ${data.um === "PZA" || data.um === "PIEZA" ? "selected" : ""}>PIEZA</option>
                        <option value="KG" ${data.um === "KG" ? "selected" : ""}>KG</option>
                        <option value="LT" ${data.um === "LT" ? "selected" : ""}>LT</option>
                        <option value="SRV" ${data.um === "SRV" ? "selected" : ""}>SRV</option>
                        <option value="JGO" ${data.um === "JGO" ? "selected" : ""}>JGO</option>
                    </select>
                </td>
                <td><input id="pn_${data.id}" value="${data.pn}" placeholder="P.N." oninput="updateRow('${data.id}', 'pn', this.value, this)" style="color:${textColor};"></td>
                <td>
                    <textarea id="desc_${data.id}" placeholder="" oninput="updateRow('${data.id}', 'descripcion', this.value, this)" style="color:${textColor};">${data.descripcion}</textarea>
                </td>
                <td><div style="display:flex; align-items:center;"><span style="color:${textColor}; font-weight:bold;">$</span><input type="number" id="prec_${data.id}" class="text-right" style="color:${textColor}; font-weight:bold;" value="${data.precio}" oninput="updateRow('${data.id}', 'precio', this.value, this)"></div></td>
                <td class="text-right font-bold" style="color:${textColor};" id="total_cell_${data.id}">${formatMoney(totalRow)}</td>
                <td class="text-center"><button class="delete-btn" onclick="deleteRow('${data.id}')">🗑</button></td>
            `;
  return tr;
}

function getHeaderHTML() {
  const config = companyConfig[currentCompany];

  if (currentCompany === "davana") {
    return `
            <div style="margin-bottom: 20px;">
                 <table style="width:100%; text-align:center; background-color:#dfe3e6; margin-bottom:5px;">
                    <tr><td style="padding:5px; font-weight:bold; font-size:12px; border:none; color:#333;">COTIZACIÓN</td></tr>
                 </table>
                 
                 <table style="border:1px solid #9daab6;">
                    <tr>
                        <td style="width:15%; background-color:#dfe3e6; font-weight:bold; border-color:#9daab6; color:#333;">Dependencia:</td>
                        <td style="width:45%; border-color:#9daab6; font-weight:bold; color: #333; font-size:13px;">
                            <input id="h_dependencia" value="${appData.header.dependencia}" placeholder="" style="font-weight:bold; color:#333;">
                        </td>
                        <td style="width:15%; background-color:#dfe3e6; font-weight:bold; border-color:#9daab6; color:#333;">Cotización</td>
                        <td style="width:25%; border-color:#9daab6; text-align:center;">
                             <input id="h_numero" class="text-center" value="${appData.header.numero}" readonly style="color:#333;">
                        </td>
                    </tr>
                    <tr>
                         <td style="background-color:#dfe3e6; font-weight:bold; border-color:#9daab6; color:#333;">A quien<br>Corresponda:</td>
                         <td style="border-color:#9daab6;">
                            <input id="h_asunto" value="${appData.header.asunto}" placeholder="Presente" style="color:#333;">
                         </td>
                         <td style="background-color:#dfe3e6; font-weight:bold; border-color:#9daab6; color:#333;">Fecha</td>
                         <td style="border-color:#9daab6; text-align:center; color:#333; font-weight:bold;">
                            <input id="h_fecha" value="${appData.header.fecha}" style="color:#333; text-align:center; font-weight:bold;">
                         </td>
                    </tr>
                 </table>
                 
                 <div style="text-align:center; font-style:italic; font-size:10px; margin-top:10px; color:#666;">
                    Por medio del presente, hacemos llegar la cotización que fue solicitada:
                 </div>
            </div>
        `;
  }

  // INTERLAB (DEFAULT)
  return `
                <div style="margin-bottom: 10px;">
                    <table><tr><td class="bg-blue text-center font-bold">${config.nombre}</td></tr></table>
                    <table style="margin-top: 5px;">
                        <tr>
                            <td class="bg-blue font-bold" style="width:10%">Fecha:</td>
                            <td style="width:30%"><input id="h_fecha" value="${appData.header.fecha}"></td>
                            <td class="bg-blue font-bold" style="width:10%">No.</td>
                            <td style="width:20%"><input id="h_numero" class="text-center" value="${appData.header.numero}" readonly></td>
                            <td class="bg-blue font-bold" style="width:10%">RUPC</td>
                            <td class="text-center" style="width:20%">${config.rupc}</td>
                        </tr>
                    </table>
                    <table style="margin-top: 5px;">
                        <tr><td style="width:20%" class="font-bold">DEPENDENCIA:</td><td><input id="h_dependencia" value="${appData.header.dependencia}"></td></tr>
                        <tr><td class="font-bold">ASUNTO:</td><td><input id="h_asunto" value="${appData.header.asunto}"></td></tr>
                    </table>
                    <table style="margin-top: 5px;">
                        <tr><td style="font-size:11px; padding: 5px;">POR MEDIO DEL PRESENTE SE HACE LLEGAR LA COTIZACIÓN SOLICITADA.</td></tr>
                    </table>
                </div>
            `;
}

function getTotalesHTML(sub, iva, total) {
  return `
                <div style="overflow:auto;">
                    <table class="table-totales">
                        <tr><td class="font-bold">SUBTOTAL:</td><td class="text-right display-subtotal">${formatMoney(sub)}</td></tr>
                        <tr><td class="font-bold">IVA:</td><td class="text-right display-iva">${formatMoney(iva)}</td></tr>
                        <tr><td class="font-bold bg-blue">TOTAL:</td><td class="text-right bg-blue font-bold display-total">${formatMoney(total)}</td></tr>
                    </table>
                </div>
            `;
}

function getLetraHTML() {
  if (currentCompany === "davana") {
    return `<div style="background-color:#dfe3e6; padding:5px; text-align:center; font-weight:bold; font-size:10px; border:1px solid #9daab6; margin-top:10px;">
             <input id="f_letra" value="${appData.footer.cantidadLetra}" readonly style="text-align:center; font-weight:bold;">
            </div>`;
  }
  return `<table>
                <tr><td class="text-center font-bold bg-blue">CANTIDAD CON LETRA</td></tr>
                <tr><td><input id="f_letra" value="${appData.footer.cantidadLetra}" readonly></td></tr>
            </table>`;
}

function getCondicionesHTML() {
  if (currentCompany === "davana") {
    const config = companyConfig[currentCompany];
    // Davana: RFC/RUPC Bar first, then Conditions
    return `
        <!-- RFC Bar -->
        <div style="text-align:center; font-size:10px; font-weight:bold; margin-top:5px; margin-bottom:10px; color:#333; border:1px solid #9daab6; padding:3px; background-color:#dfe3e6;">
           RFC: ${config.rfc} | RUPC: ${config.rupc} | DAVANA MEXICO S DE RL DE CV
        </div>

        <table style="margin-top:0px; border:1px solid #9daab6;">
             <tr>
               <td style="width:25%; background-color:#fff; border-color:#9daab6;">Tiempo de entrega:</td>
               <td style="text-align:center; border-color:#9daab6;">
                  <input value="15 días hábiles" style="color:#000; font-weight:bold; text-align:center;">
               </td>
             </tr>
             <tr>
               <td style="width:25%; background-color:#fff; border-color:#9daab6;">Vigencia de Cotización:</td>
               <td style="text-align:center; border-color:#9daab6;">
                  <input value="90 días naturales" style="text-align:center; color:#000;">
               </td>
             </tr>
             <tr>
               <td style="width:25%; background-color:#fff; border-color:#9daab6;">Crédito:</td>
               <td style="text-align:center; border-color:#9daab6;">
                  <input value="30 días naturales" style="text-align:center; color:#000;">
               </td>
             </tr>
             <tr>
               <td style="width:25%; background-color:#fff; border-color:#9daab6;">Garantía:</td>
               <td style="text-align:center; border-color:#9daab6;">
                  <input value="3 años" style="color:#000; font-weight:bold; text-align:center;">
               </td>
             </tr>
        </table>`;
  }
  return `<table>
                <tr><td class="text-center font-bold bg-blue">CONDICIONES DE PAGO</td></tr>
                <tr><td>
                    <textarea id="f_condiciones" oninput="updateFooter('condiciones', this.value, this)">${appData.footer.condiciones}</textarea>
                </td></tr>
            </table>`;
}

function getDatosEmpresaHTML() {
  const config = companyConfig[currentCompany];
  if (currentCompany === "davana") {
    return ``; // Empty because it's now integrated above
  }
  return `<table><tr><td class="text-center font-bold bg-blue">DATOS DE EMPRESA</td></tr><tr><td class="text-left"><strong>RFC:</strong> ${config.rfc}</td></tr></table>`;
}
function getFirmaHTML() {
  const config = companyConfig[currentCompany];
  // Ajuste de URL de imagen según empresa
  const imgUrl = `https://s3-mx-1.mglab.com/mglab/${config.logo}`;

  if (currentCompany === "davana") {
    return `<div style="text-align:center; margin-top:40px;">
                <div style="font-size:9px; font-weight:bold; color:#666; margin-bottom:10px;">ATENTAMENTE</div>
                <div style="height: 100px; display:flex; align-items:flex-end; justify-content:center;">
                    <img src="${imgUrl}" class="img-firma" style="max-height:100px;">
                </div>
                <div style="width:200px; border-top:1px solid #999; margin:5px auto;"></div>
                <div style="font-size:10px; font-weight:bold;">${config.firma}</div>
                <div style="font-size:9px;">Apoderado Legal</div>
                <div style="background-color:#dfe3e6; color:#333; font-weight:bold; font-size:9px; padding:5px; width:220px; margin:10px auto; border:1px solid #ccc;">DAVANA MEXICO S DE RL DE CV</div>
             </div>`;
  }
  return `<table><tr><td class="text-center font-bold bg-blue">ATENTAMENTE</td></tr><tr><td class="text-center" style="height: 100px; vertical-align: bottom;"><img src="${imgUrl}" class="img-firma"><div class="firma-linea"></div><strong>${config.firma}</strong><br>VENTAS</td></tr></table>`;
}

function appendHTML(parent, html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  const el = div.firstElementChild;
  parent.appendChild(div);
  return div;
}
function formatMoney(amount) {
  return "$" + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

function restoreHeaderEvents(el) {
  el.querySelector("#h_fecha").oninput = (e) =>
    updateHeader("fecha", e.target.value);
  el.querySelector("#h_dependencia").oninput = (e) =>
    updateHeader("dependencia", e.target.value);
  el.querySelector("#h_asunto").oninput = (e) =>
    updateHeader("asunto", e.target.value);
}

function restoreFooterEvents(el) {}

function generatePDF() {
  const opt = {
    margin: 0,
    filename: `${companyConfig[currentCompany].prefix}_${appData.header.numero}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "px", format: [816, 1056], orientation: "portrait" },
  };
  document.body.classList.add("printing");
  const btns = document.querySelectorAll(".delete-btn");
  btns.forEach((b) => (b.style.display = "none"));

  // Ocultar col SKU (4) y col X (8)
  const colsToHide = document.querySelectorAll(
    ".table-cotizacion tr > td:nth-child(4), .table-cotizacion tr > td:nth-child(8)",
  );
  colsToHide.forEach((c) => (c.style.display = "none"));

  // Reemplazar textareas por divs para que html2pdf respete los saltos de línea
  const textareas = document.querySelectorAll("#pdf-container textarea");
  const replacements = [];

  textareas.forEach((ta) => {
    const div = document.createElement("div");
    div.innerText = ta.value; // innerText respeta \n
    const computed = window.getComputedStyle(ta);

    div.style.fontFamily = computed.fontFamily;
    div.style.fontSize = computed.fontSize;
    div.style.lineHeight = computed.lineHeight;
    div.style.color = computed.color;
    div.style.textAlign = computed.textAlign;

    // Mejoras para el wrapping
    div.style.whiteSpace = "pre-wrap";
    div.style.wordBreak = "break-all"; // Fuerza el corte en palabras largas (ej: aaaaa...)
    div.style.overflowWrap = "break-word";

    div.style.padding = computed.padding;
    div.style.minHeight = computed.minHeight;
    div.style.boxSizing = "border-box"; // Asegurar cálculo correcto
    div.style.width = "100%";

    ta.parentNode.insertBefore(div, ta);
    ta.style.display = "none";
    replacements.push({ ta, div });
  });

  html2pdf()
    .set(opt)
    .from(document.getElementById("pdf-container"))
    .output("blob")
    .then((blob) => {
      // 2. Subir al servidor (S3 Minio)
      const formData = new FormData();
      formData.append("folio", appData.header.numero);
      formData.append("empresa", currentCompany);
      formData.append("file", blob, opt.filename);

      fetch("/api/cotizaciones/save", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("PDF subido correctamente:", data);
        })
        .catch((err) => {
          console.error("Error al subir PDF:", err);
        });

      // 1. Alerta Swal
      Swal.fire({
        title: "PDF Generado",
        text: "¿Qué deseas hacer?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Descargar",
        cancelButtonText: "Cerrar",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = opt.filename;
          link.click();
          URL.revokeObjectURL(url);
          window.location.href = "/panel";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          window.location.href = "/panel";
        }
      });

      // 3. Restaurar UI
      btns.forEach((b) => (b.style.display = "inline-block"));
      colsToHide.forEach((c) => (c.style.display = ""));

      // Restaurar textareas
      replacements.forEach((rep) => {
        rep.div.remove();
        rep.ta.style.display = "";
      });

      document.body.classList.remove("printing");
    });
}

// --- ALGORITMO NUMERO A LETRAS (CORREGIDO "PESOS") ---
function numeroALetras(num) {
  if (num < 0) return "MENOS " + numeroALetras(Math.abs(num));

  const enteros = Math.floor(num);
  const centavos = Math.round((num - enteros) * 100);
  const centavosStr = (centavos < 10 ? "0" : "") + centavos + "/100 M.N.";

  if (enteros === 0) return "CERO PESOS " + centavosStr;

  function Unidades(num) {
    switch (num) {
      case 1:
        return "Un";
      case 2:
        return "Dos";
      case 3:
        return "Tres";
      case 4:
        return "Cuatro";
      case 5:
        return "Cinco";
      case 6:
        return "Seis";
      case 7:
        return "Siete";
      case 8:
        return "Ocho";
      case 9:
        return "Nueve";
    }
    return "";
  }

  function Decenas(num) {
    const decena = Math.floor(num / 10);
    const unidad = num - decena * 10;
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0:
            return "Diez";
          case 1:
            return "Once";
          case 2:
            return "Doce";
          case 3:
            return "Trece";
          case 4:
            return "Catorce";
          case 5:
            return "Quince";
          default:
            return "Dieci" + Unidades(unidad).toLowerCase();
        }
      case 2:
        switch (unidad) {
          case 0:
            return "Veinte";
          default:
            return (
              "Veinti" + Unidades(unidad).toLowerCase().replace("un", "ún")
            );
        }
      case 3:
        return DecenasY("Treinta", unidad);
      case 4:
        return DecenasY("Cuarenta", unidad);
      case 5:
        return DecenasY("Cincuenta", unidad);
      case 6:
        return DecenasY("Sesenta", unidad);
      case 7:
        return DecenasY("Setenta", unidad);
      case 8:
        return DecenasY("Ochenta", unidad);
      case 9:
        return DecenasY("Noventa", unidad);
      case 0:
        return Unidades(unidad);
    }
  }

  function DecenasY(strSin, numUnidades) {
    if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
    return strSin;
  }

  function Centenas(num) {
    const centenas = Math.floor(num / 100);
    const decenas = num - centenas * 100;
    switch (centenas) {
      case 1:
        if (decenas > 0) return "Ciento " + Decenas(decenas);
        return "Cien";
      case 2:
        return "Doscientos " + Decenas(decenas);
      case 3:
        return "Trescientos " + Decenas(decenas);
      case 4:
        return "Cuatrocientos " + Decenas(decenas);
      case 5:
        return "Quinientos " + Decenas(decenas);
      case 6:
        return "Seiscientos " + Decenas(decenas);
      case 7:
        return "Setecientos " + Decenas(decenas);
      case 8:
        return "Ochocientos " + Decenas(decenas);
      case 9:
        return "Novecientos " + Decenas(decenas);
    }
    return Decenas(decenas);
  }

  function Seccion(num, divisor, strSingular, strPlural) {
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    let letras = "";
    if (cientos > 0) {
      if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
      else letras = strSingular;
    }
    if (resto > 0) letras += "";
    return letras;
  }

  function Miles(num) {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    let strMiles = Seccion(num, divisor, "UN MIL", "MIL");
    let strCentenas = Centenas(resto);

    if (strMiles === "") strMiles = "MIL";
    if (cientos === 0) strMiles = "";
    else if (cientos === 1) strMiles = "Mil";
    else strMiles = Centenas(cientos) + " Mil";

    if (strMiles !== "" && strCentenas.trim() !== "")
      return strMiles + " " + strCentenas;
    return strMiles + strCentenas;
  }

  function Millones(num) {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    let strMillones = "";
    if (cientos > 0) {
      if (cientos === 1) strMillones = "Un Millón";
      else strMillones = Centenas(cientos) + " Millones";
    }

    let strMiles = Miles(resto);
    if (strMillones !== "" && strMiles.trim() !== "")
      return strMillones + " " + strMiles;
    return strMillones + strMiles;
  }

  let data = "";
  if (enteros === 0) data = "CERO";
  else if (enteros <= 999) data = Centenas(enteros);
  else if (enteros <= 999999) data = Miles(enteros);
  else data = Millones(enteros);

  data = data.replace(/  /g, " ").trim();
  data = data.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  data = data.replace("Veintiun ", "Veintiún ");
  data = data.replace("Veintiun", "Veintiún");

  // AGREGAR LA PALABRA PESOS AQUÍ:
  const moneda = enteros === 1 ? " Peso " : " Pesos ";

  return data + moneda + centavosStr;
}
