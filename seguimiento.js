// =====================================================
// SEGUIMIENTO DE PEDIDO (vista del cliente)
// Lee los pedidos de localStorage ("pedidosChiquis"), los mismos
// que registra el catálogo y administra pedidos.html.
// =====================================================

const ESTADOS = [
    { clave: "recibido",    nombre: "Pedido recibido",       mensaje: "Recibimos tu pedido. Pronto comenzaremos a prepararlo." },
    { clave: "preparacion", nombre: "En preparación",        mensaje: "Estamos reuniendo los productos de tu pedido." },
    { clave: "preparado",   nombre: "Preparado",             mensaje: "Tu pedido está listo y empacado. Será despachado en breve." },
    { clave: "despachado",  nombre: "Despachado",            mensaje: "Tu pedido salió de nuestra bodega." },
    { clave: "entrega",     nombre: "En proceso de entrega", mensaje: "Tu pedido va en camino a la dirección indicada." },
    { clave: "entregado",   nombre: "Entregado",             mensaje: "¡Tu pedido fue entregado! Gracias por comprar con nosotros." }
];

const formConsulta = document.getElementById("formConsulta");
const numeroPedido = document.getElementById("numeroPedido");
const telefonoPedido = document.getElementById("telefonoPedido");
const mensajeError = document.getElementById("mensajeError");
const resultado = document.getElementById("resultado");

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cargarPedidos() {
    try {
        const datos = JSON.parse(localStorage.getItem("pedidosChiquis") || "[]");
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        return [];
    }
}

function soloDigitos(texto) {
    return String(texto || "").replace(/\D/g, "");
}

// Acepta "ped-1", "PED-0001", "1", etc.
function normalizarNumero(texto) {
    const digitos = soloDigitos(texto);
    return digitos ? Number(digitos) : null;
}

function formatearMoneda(valor) {
    return `Q${Number(valor || 0).toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatearFecha(fecha) {
    const f = new Date(fecha);
    if (Number.isNaN(f.getTime())) return "";
    return f.toLocaleString("es-GT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function historialDe(pedido) {
    if (Array.isArray(pedido.historial) && pedido.historial.length) return pedido.historial;
    return [{ estado: pedido.estado || "recibido", fecha: pedido.fecha || pedido.creado }];
}

function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
    resultado.hidden = true;
}

function buscarPedido(numero, telefono) {
    return cargarPedidos().find(pedido =>
        normalizarNumero(pedido.numero) === numero &&
        soloDigitos(pedido.telefono) === telefono
    );
}

function mostrarPedido(pedido) {
    const indiceActual = Math.max(0, ESTADOS.findIndex(e => e.clave === pedido.estado));
    const estadoActual = ESTADOS[indiceActual];
    const historial = historialDe(pedido);

    document.getElementById("resNumero").textContent = pedido.numero;
    document.getElementById("resCliente").textContent = pedido.cliente;

    const etiquetaEstado = document.getElementById("resEstado");
    etiquetaEstado.textContent = estadoActual.nombre;
    etiquetaEstado.classList.toggle("completo", pedido.estado === "entregado");

    // Línea de progreso con la fecha de cada paso alcanzado
    document.getElementById("progreso").innerHTML = ESTADOS.map((estado, i) => {
        const clase = i < indiceActual ? "hecho" : i === indiceActual ? "actual" : "";
        const registro = historial.find(h => h.estado === estado.clave);
        const fecha = registro && i <= indiceActual ? formatearFecha(registro.fecha) : "";
        const icono = i < indiceActual ? "✓" : i + 1;
        return `
            <li class="paso ${clase}">
                <div class="paso-icono">${icono}</div>
                <div>${escaparHTML(estado.nombre)}${fecha ? `<small>${escaparHTML(fecha)}</small>` : ""}</div>
            </li>`;
    }).join("");

    document.getElementById("resMensaje").textContent = estadoActual.mensaje;

    // Historial (más reciente primero)
    document.getElementById("resHistorial").innerHTML = historial.slice().reverse().map(item => {
        const e = ESTADOS.find(x => x.clave === item.estado);
        return `<li><span>${escaparHTML(e ? e.nombre : item.estado)}</span><span>${escaparHTML(formatearFecha(item.fecha))}</span></li>`;
    }).join("");

    // Productos y total
    const productos = pedido.productos || [];
    document.getElementById("resProductos").innerHTML = productos.map(p => `
        <div class="producto-fila">
            <div>${escaparHTML(p.nombre)}<small>${Number(p.cantidad)} × ${formatearMoneda(p.precio)}</small></div>
            <strong>${formatearMoneda(Number(p.cantidad) * Number(p.precio))}</strong>
        </div>`).join("");

    const total = productos.reduce((s, p) => s + Number(p.cantidad || 0) * Number(p.precio || 0), 0);
    document.getElementById("resTotal").textContent = formatearMoneda(total);

    // Notas / dirección de entrega
    const bloqueNotas = document.getElementById("bloqueNotas");
    bloqueNotas.hidden = !pedido.notas;
    document.getElementById("resNotas").textContent = pedido.notas || "";

    mensajeError.hidden = true;
    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: "smooth", block: "start" });
}

formConsulta.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const numero = normalizarNumero(numeroPedido.value);
    const telefono = soloDigitos(telefonoPedido.value);

    if (!numero) {
        mostrarError("Ingresa tu número de pedido (por ejemplo, PED-0001).");
        return;
    }

    if (telefono.length < 8) {
        mostrarError("Ingresa el teléfono con el que realizaste el pedido.");
        return;
    }

    const pedido = buscarPedido(numero, telefono);

    if (!pedido) {
        mostrarError("No encontramos un pedido con esos datos. Revisa el número y el teléfono.");
        return;
    }

    mostrarPedido(pedido);
});

// Permite llegar desde el catálogo con ?pedido=PED-0001
const parametros = new URLSearchParams(window.location.search);
if (parametros.get("pedido")) {
    numeroPedido.value = parametros.get("pedido");
    telefonoPedido.focus();
}