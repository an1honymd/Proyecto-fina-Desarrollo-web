// ==========================================
// CATÁLOGO · carrito, pedido y filtros
// Los pedidos se guardan en localStorage ("pedidosChiquis"),
// la misma clave que usan pedidos.html y seguimiento.html.
// ==========================================

let carrito = [];

// ---------- Elementos ----------

const contadorCarrito = document.getElementById("contadorCarrito");
const listaCarrito = document.getElementById("listaCarrito");
const totalCarrito = document.getElementById("totalCarrito");
const productosGrid = document.getElementById("productosGrid");

const formularioPedido = document.getElementById("formularioPedido");
const nombreCliente = document.getElementById("nombreCliente");
const telefonoCliente = document.getElementById("telefonoCliente");
const direccionCliente = document.getElementById("direccionCliente");
const observacionesCliente = document.getElementById("observacionesCliente");
const errorPedido = document.getElementById("errorPedido");
const resumenPedido = document.getElementById("resumenPedido");

const ventanaCarrito = document.getElementById("ventanaCarrito");
const ventanaDatosCliente = document.getElementById("ventanaDatosCliente");
const ventanaExito = document.getElementById("ventanaExito");

const tarjetasProductos = [...document.querySelectorAll(".producto-card")];
const ordenOriginal = [...tarjetasProductos];


// ---------- Utilidades ----------

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function moneda(valor) {
    return `Q${Number(valor || 0).toFixed(2)}`;
}

function totalDelCarrito() {
    return carrito.reduce(
        (suma, producto) => suma + producto.precio * producto.cantidad,
        0
    );
}

// Imagen de cada producto, para mostrarla en el carrito.
const imagenesProductos = {};

tarjetasProductos.forEach(tarjeta => {
    const imagen = tarjeta.querySelector(".producto-imagen img");
    imagenesProductos[tarjeta.dataset.nombre] = imagen ? imagen.getAttribute("src") : "";
});


// ---------- Aviso emergente ----------

const aviso = document.getElementById("aviso");
const avisoTexto = document.getElementById("avisoTexto");
let avisoTimeout = null;

function mostrarAviso(mensaje) {
    clearTimeout(avisoTimeout);
    avisoTexto.textContent = mensaje;
    aviso.classList.add("visible");
    avisoTimeout = setTimeout(() => aviso.classList.remove("visible"), 2200);
}


// ---------- Ventanas (abrir y cerrar) ----------

let elementoAnterior = null;

function abrirVentana(ventana, enfocar) {
    elementoAnterior = document.activeElement;
    ventana.classList.add("abierto");
    ventana.setAttribute("aria-hidden", "false");
    document.body.classList.add("sin-scroll");

    const destino = enfocar || ventana.querySelector("button, input, select, a");
    if (destino) setTimeout(() => destino.focus(), 50);
}

function cerrarVentana(ventana) {
    ventana.classList.remove("abierto");
    ventana.setAttribute("aria-hidden", "true");

    const algunaAbierta = document.querySelector(
        ".ventana-carrito.abierto, .ventana-datos-cliente.abierto, .ventana-exito.abierto"
    );

    if (!algunaAbierta) {
        document.body.classList.remove("sin-scroll");
        if (elementoAnterior && elementoAnterior.focus) elementoAnterior.focus();
    }
}

// Cerrar al hacer clic en el fondo oscuro o con Escape.
[ventanaCarrito, ventanaDatosCliente, ventanaExito].forEach(ventana => {
    ventana.addEventListener("click", evento => {
        if (evento.target === ventana) cerrarVentana(ventana);
    });
});

document.addEventListener("keydown", evento => {
    if (evento.key !== "Escape") return;

    [ventanaExito, ventanaDatosCliente, ventanaCarrito].forEach(ventana => {
        if (ventana.classList.contains("abierto")) cerrarVentana(ventana);
    });
});


// ==========================================
// INTEGRACIÓN CON CLIENTES REGISTRADOS
// ==========================================

// Debe coincidir con la clave utilizada por el módulo de clientes.
const CLAVE_CLIENTES = "clientesChiquis";

let clienteSeleccionadoId = "";
const selectorCliente = document.getElementById("clienteRegistrado");

function obtenerClientesRegistrados() {
    try {
        const datos = localStorage.getItem(CLAVE_CLIENTES);
        if (!datos) return [];

        const clientes = JSON.parse(datos);
        return Array.isArray(clientes) ? clientes : [];

    } catch (error) {
        console.error("No se pudieron cargar los clientes registrados:", error);
        return [];
    }
}

function cargarSelectorClientes() {
    if (!selectorCliente) return;

    const valorAnterior = selectorCliente.value;

    selectorCliente.innerHTML = "";

    const opcionNuevo = document.createElement("option");
    opcionNuevo.value = "nuevo";
    opcionNuevo.textContent = "Comprar como cliente nuevo";
    selectorCliente.appendChild(opcionNuevo);

    obtenerClientesRegistrados()
        .filter(cliente => cliente && cliente.id && cliente.nombre)
        .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"))
        .forEach(cliente => {
            const opcion = document.createElement("option");
            opcion.value = String(cliente.id);
            opcion.textContent =
                cliente.nombre + (cliente.telefono ? " — " + cliente.telefono : "");
            selectorCliente.appendChild(opcion);
        });

    const existeOpcion = [...selectorCliente.options].some(
        opcion => opcion.value === valorAnterior
    );

    selectorCliente.value = existeOpcion ? valorAnterior : "nuevo";

    aplicarClienteSeleccionado();
}

function aplicarClienteSeleccionado() {
    if (!selectorCliente) return;

    const id = selectorCliente.value;

    clienteSeleccionadoId = id && id !== "nuevo" ? id : "";

    const limpiarFormulario = () => {
        nombreCliente.readOnly = false;
        telefonoCliente.readOnly = false;
        nombreCliente.value = "";
        telefonoCliente.value = "";
        direccionCliente.value = "";
    };

    if (!clienteSeleccionadoId) {
        limpiarFormulario();
        return;
    }

    const cliente = obtenerClientesRegistrados().find(
        item => String(item.id) === clienteSeleccionadoId
    );

    // Si el cliente ya no existe, volver a cliente nuevo.
    if (!cliente) {
        clienteSeleccionadoId = "";
        selectorCliente.value = "nuevo";
        limpiarFormulario();
        return;
    }

    nombreCliente.value = cliente.nombre || "";
    telefonoCliente.value = cliente.telefono || "";
    direccionCliente.value = cliente.direccion || "";

    // Evitar modificaciones accidentales del nombre y teléfono.
    nombreCliente.readOnly = true;
    telefonoCliente.readOnly = true;
}

if (selectorCliente) {
    selectorCliente.addEventListener("change", aplicarClienteSeleccionado);
}


// ==========================================
// CARRITO
// ==========================================

// Agregar productos (delegación de eventos sobre la cuadrícula).
productosGrid.addEventListener("click", evento => {

    const boton = evento.target.closest(".btn-agregar");
    if (!boton) return;

    const tarjeta = boton.closest(".producto-card");

    const nombre = tarjeta.dataset.nombre;
    const precio = Number(tarjeta.dataset.precio);

    const productoExistente = carrito.find(producto => producto.nombre === nombre);

    if (productoExistente) {
        productoExistente.cantidad++;
    } else {
        carrito.push({ nombre, precio, cantidad: 1 });
    }

    mostrarCarrito();
    mostrarAviso(`${nombre} se agregó al carrito`);

    // Confirmación en el propio botón.
    const texto = boton.querySelector("span");
    const textoOriginal = texto.innerHTML;

    boton.classList.add("agregado");
    texto.textContent = "Agregado";

    setTimeout(() => {
        boton.classList.remove("agregado");
        texto.innerHTML = textoOriginal;
    }, 1200);

    contadorCarrito.classList.remove("salto");
    void contadorCarrito.offsetWidth;
    contadorCarrito.classList.add("salto");
});

function mostrarCarrito() {

    if (carrito.length === 0) {

        listaCarrito.innerHTML = `
            <div class="carrito-vacio">
                <svg class="ico" aria-hidden="true"><use href="#i-bolsa"/></svg>
                <strong>Tu carrito está vacío</strong>
                <span>Agrega productos del catálogo para empezar tu pedido.</span>
                <button type="button" class="btn btn-oscuro" id="carritoVerCatalogo">Ver el catálogo</button>
            </div>`;

    } else {

        listaCarrito.innerHTML = carrito.map(producto => {

            const nombre = escaparHTML(producto.nombre);
            const imagen = escaparHTML(imagenesProductos[producto.nombre] || "");

            return `
                <div class="carrito-item">

                    <div class="carrito-item-img">
                        ${imagen ? `<img src="${imagen}" alt="" onerror="this.remove()">` : ""}
                    </div>

                    <div class="carrito-item-info">
                        <strong class="carrito-item-nombre">${nombre}</strong>
                        <span class="carrito-item-precio">${moneda(producto.precio)} c/u</span>
                        <button type="button" class="btn-eliminar" data-nombre="${nombre}">Quitar</button>
                    </div>

                    <div class="carrito-item-der">
                        <div class="cantidad-controles">
                            <button type="button" class="btn-cantidad" data-accion="disminuir"
                                data-nombre="${nombre}" aria-label="Quitar una unidad de ${nombre}">
                                <svg class="ico" aria-hidden="true"><use href="#i-menos"/></svg>
                            </button>
                            <span>${producto.cantidad}</span>
                            <button type="button" class="btn-cantidad" data-accion="aumentar"
                                data-nombre="${nombre}" aria-label="Agregar una unidad de ${nombre}">
                                <svg class="ico" aria-hidden="true"><use href="#i-mas"/></svg>
                            </button>
                        </div>
                        <span class="carrito-subtotal">${moneda(producto.precio * producto.cantidad)}</span>
                    </div>

                </div>`;
        }).join("");
    }

    contadorCarrito.textContent = carrito.reduce(
        (total, producto) => total + producto.cantidad,
        0
    );

    totalCarrito.textContent = moneda(totalDelCarrito());

    document.getElementById("continuarPedido").disabled = carrito.length === 0;
}

// Cantidades, quitar productos y botón de carrito vacío.
listaCarrito.addEventListener("click", evento => {

    if (evento.target.closest("#carritoVerCatalogo")) {
        cerrarVentana(ventanaCarrito);
        document.getElementById("catalogo").scrollIntoView();
        return;
    }

    const boton = evento.target.closest("button");
    if (!boton || !boton.dataset.nombre) return;

    const nombre = boton.dataset.nombre;

    if (boton.classList.contains("btn-cantidad")) {

        const producto = carrito.find(p => p.nombre === nombre);
        if (!producto) return;

        if (boton.dataset.accion === "aumentar") {
            producto.cantidad++;
        }

        if (boton.dataset.accion === "disminuir") {
            producto.cantidad--;

            if (producto.cantidad <= 0) {
                carrito = carrito.filter(p => p.nombre !== nombre);
            }
        }

        mostrarCarrito();
        return;
    }

    if (boton.classList.contains("btn-eliminar")) {
        carrito = carrito.filter(p => p.nombre !== nombre);
        mostrarCarrito();
    }
});

// Abrir y cerrar el carrito.
document.querySelector(".btn-carrito").addEventListener("click", () => {
    abrirVentana(ventanaCarrito);
});

document.getElementById("cerrarCarrito").addEventListener("click", () => {
    cerrarVentana(ventanaCarrito);
});


// ==========================================
// FORMULARIO DEL PEDIDO
// ==========================================

function mostrarResumenPedido() {

    const unidades = carrito.reduce((total, p) => total + p.cantidad, 0);

    resumenPedido.innerHTML = `
        <ul>
            ${carrito.map(producto => `
                <li>
                    <span>${producto.cantidad} × ${escaparHTML(producto.nombre)}</span>
                    <span>${moneda(producto.precio * producto.cantidad)}</span>
                </li>`).join("")}
        </ul>
        <div class="resumen-total">
            <span>Total (${unidades} ${unidades === 1 ? "unidad" : "unidades"})</span>
            <span>${moneda(totalDelCarrito())}</span>
        </div>`;
}

function mostrarErrorPedido(mensaje) {
    errorPedido.textContent = mensaje;
    errorPedido.hidden = false;
}

document.getElementById("continuarPedido").addEventListener("click", () => {

    if (carrito.length === 0) return;

    cerrarVentana(ventanaCarrito);

    // Actualizar la lista de clientes antes de mostrar el formulario.
    cargarSelectorClientes();
    mostrarResumenPedido();
    errorPedido.hidden = true;

    abrirVentana(ventanaDatosCliente, selectorCliente);
});

document.getElementById("cerrarDatosCliente").addEventListener("click", () => {
    cerrarVentana(ventanaDatosCliente);
});


// Registrar y guardar el pedido.
formularioPedido.addEventListener("submit", evento => {

    evento.preventDefault();
    errorPedido.hidden = true;

    if (carrito.length === 0) {
        mostrarErrorPedido("Agrega al menos un producto al carrito.");
        return;
    }

    if (nombreCliente.value.trim().length < 3) {
        mostrarErrorPedido("Escribe tu nombre completo.");
        nombreCliente.focus();
        return;
    }

    const telefonoLimpio = telefonoCliente.value.replace(/\D/g, "");

    if (telefonoLimpio.length < 8) {
        mostrarErrorPedido("El teléfono debe tener al menos 8 dígitos.");
        telefonoCliente.focus();
        return;
    }

    if (!direccionCliente.value.trim()) {
        mostrarErrorPedido("Escribe la dirección donde entregaremos tu pedido.");
        direccionCliente.focus();
        return;
    }

    // Obtener los pedidos que ya existen.
    let pedidosGuardados = [];

    try {
        pedidosGuardados = JSON.parse(
            localStorage.getItem("pedidosChiquis") || "[]"
        );
    } catch (error) {
        mostrarErrorPedido("No se pudieron recuperar los pedidos anteriores. Recarga la página e inténtalo de nuevo.");
        return;
    }

    // Generar el siguiente número de pedido.
    const mayor = pedidosGuardados.reduce((max, pedido) => {
        const numero = Number(String(pedido.numero || "").replace(/\D/g, ""));
        return Math.max(max, numero || 0);
    }, 0);

    const nuevoNumero = `PED-${String(mayor + 1).padStart(4, "0")}`;

    // Recuperar el cliente seleccionado.
    let clienteRegistrado = null;

    if (clienteSeleccionadoId) {

        clienteRegistrado = obtenerClientesRegistrados().find(
            cliente => String(cliente.id) === String(clienteSeleccionadoId)
        ) || null;

        if (!clienteRegistrado) {
            mostrarErrorPedido("El cliente seleccionado ya no aparece en los registros. Selecciónalo de nuevo.");
            cargarSelectorClientes();
            return;
        }
    }

    // Crear el nuevo pedido.
    const ahora = new Date();
    const total = totalDelCarrito();

    const nuevoPedido = {

        id: `${Date.now()}${Math.random().toString(36).slice(2, 7)}`,

        numero: nuevoNumero,

        clienteId: clienteRegistrado ? String(clienteRegistrado.id) : null,

        cliente: clienteRegistrado
            ? clienteRegistrado.nombre
            : nombreCliente.value.trim(),

        telefono: clienteRegistrado
            ? clienteRegistrado.telefono
            : telefonoCliente.value.trim(),

        origen: "tienda",

        estado: "recibido",

        fecha: ahora.toISOString(),

        productos: carrito.map(producto => ({ ...producto })),

        notas:
            `Dirección de entrega: ${direccionCliente.value.trim()}` +
            (observacionesCliente.value.trim()
                ? ` | Observaciones: ${observacionesCliente.value.trim()}`
                : ""),

        creado: ahora.toISOString(),

        // Primer paso del seguimiento (lo usa seguimiento.html).
        historial: [{ estado: "recibido", fecha: ahora.toISOString() }]
    };

    // Guardar el pedido.
    try {
        pedidosGuardados.push(nuevoPedido);

        localStorage.setItem("pedidosChiquis", JSON.stringify(pedidosGuardados));

    } catch (error) {
        console.error("Error al guardar el pedido:", error);
        mostrarErrorPedido("No se pudo guardar el pedido. Inténtalo nuevamente.");
        return;
    }

    // Confirmación.
    mostrarExito(nuevoPedido, total);

    // Vaciar el carrito y limpiar el formulario.
    carrito = [];
    mostrarCarrito();

    formularioPedido.reset();
    clienteSeleccionadoId = "";
    cargarSelectorClientes();
});


// ==========================================
// PEDIDO REALIZADO
// ==========================================

function mostrarExito(pedido, total) {

    document.getElementById("exitoNumero").textContent = pedido.numero;

    document.getElementById("exitoDetalle").textContent =
        `Total del pedido: ${moneda(total)}`;

    document.getElementById("exitoNota").textContent =
        `Guárdalo: lo necesitas, junto con el teléfono ${pedido.telefono}, ` +
        "para consultar el estado de tu pedido.";

    document.getElementById("exitoSeguir").href =
        `seguimiento.html?pedido=${encodeURIComponent(pedido.numero)}`;

    cerrarVentana(ventanaDatosCliente);
    abrirVentana(ventanaExito, document.getElementById("exitoSeguir"));
}

document.getElementById("exitoCerrar").addEventListener("click", () => {
    cerrarVentana(ventanaExito);
});

document.getElementById("exitoCopiar").addEventListener("click", () => {

    const numero = document.getElementById("exitoNumero").textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(numero)
            .then(() => mostrarAviso("Número de pedido copiado"))
            .catch(() => mostrarAviso("No se pudo copiar. Anótalo: " + numero));
    } else {
        mostrarAviso("No se pudo copiar. Anótalo: " + numero);
    }
});


// ==========================================
// BÚSQUEDA, CATEGORÍAS Y ORDEN
// ==========================================

const buscadorProductos = document.getElementById("buscadorProductos");
const botonesCategoria = document.querySelectorAll(".btn-categoria");
const ordenProductos = document.getElementById("ordenProductos");
const resultadoTexto = document.getElementById("resultadoTexto");
const sinResultados = document.getElementById("sinResultados");

let categoriaActual = "todos";

const nombresCategoria = {
    casa: "Casa",
    cocina: "Cocina",
    ropa: "Ropa",
    calzado: "Calzado",
    otros: "Otros"
};

// Cantidad de productos por categoría.
botonesCategoria.forEach(boton => {

    const categoria = boton.dataset.categoria;

    const cantidad = categoria === "todos"
        ? tarjetasProductos.length
        : tarjetasProductos.filter(t => t.dataset.categoria === categoria).length;

    boton.querySelector(".cuenta").textContent = cantidad;
});

function filtrarProductos() {

    const textoBusqueda = buscadorProductos.value.toLowerCase().trim();
    let visibles = 0;

    tarjetasProductos.forEach(tarjeta => {

        const nombre = tarjeta.dataset.nombre.toLowerCase();
        const descripcion = tarjeta.querySelector("p").textContent.toLowerCase();

        const coincideCategoria =
            categoriaActual === "todos" ||
            tarjeta.dataset.categoria === categoriaActual;

        const coincideBusqueda =
            nombre.includes(textoBusqueda) ||
            descripcion.includes(textoBusqueda);

        const mostrar = coincideCategoria && coincideBusqueda;

        tarjeta.style.display = mostrar ? "flex" : "none";

        if (mostrar) visibles++;
    });

    sinResultados.hidden = visibles !== 0;

    // Texto de resultados.
    const plural = visibles === 1 ? "producto" : "productos";

    if (textoBusqueda) {
        resultadoTexto.textContent =
            `${visibles} ${visibles === 1 ? "resultado" : "resultados"} para “${buscadorProductos.value.trim()}”`;
    } else if (categoriaActual !== "todos") {
        resultadoTexto.textContent =
            `${visibles} ${plural} en ${nombresCategoria[categoriaActual] || categoriaActual}`;
    } else {
        resultadoTexto.textContent = `Mostrando ${visibles} ${plural}`;
    }
}

function ordenarProductos() {

    const criterio = ordenProductos.value;
    let lista = [...ordenOriginal];

    if (criterio === "precio-asc") {
        lista.sort((a, b) => Number(a.dataset.precio) - Number(b.dataset.precio));
    }

    if (criterio === "precio-desc") {
        lista.sort((a, b) => Number(b.dataset.precio) - Number(a.dataset.precio));
    }

    if (criterio === "nombre") {
        lista.sort((a, b) => a.dataset.nombre.localeCompare(b.dataset.nombre, "es"));
    }

    lista.forEach(tarjeta => productosGrid.appendChild(tarjeta));
}

botonesCategoria.forEach(boton => {
    boton.addEventListener("click", () => {

        categoriaActual = boton.dataset.categoria;

        botonesCategoria.forEach(btn => btn.classList.remove("activo"));
        boton.classList.add("activo");

        filtrarProductos();
    });
});

buscadorProductos.addEventListener("input", filtrarProductos);
ordenProductos.addEventListener("change", ordenarProductos);

document.getElementById("verTodos").addEventListener("click", () => {

    buscadorProductos.value = "";
    categoriaActual = "todos";

    botonesCategoria.forEach(btn => {
        btn.classList.toggle("activo", btn.dataset.categoria === "todos");
    });

    filtrarProductos();
});


// ==========================================
// INICIO
// ==========================================

mostrarCarrito();
cargarSelectorClientes();
filtrarProductos();
