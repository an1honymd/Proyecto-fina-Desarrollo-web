// ==========================================
// CARRITO DE COMPRAS
// ==========================================

let carrito = [];

// Elementos del HTML
const botonesAgregar = document.querySelectorAll(".btn-agregar");
const contadorCarrito = document.getElementById("contadorCarrito");
const listaCarrito = document.getElementById("listaCarrito");
const totalCarrito = document.getElementById("totalCarrito");

// Elementos del formulario del cliente
const formularioPedido = document.getElementById("formularioPedido");
const nombreCliente = document.getElementById("nombreCliente");
const telefonoCliente = document.getElementById("telefonoCliente");
const direccionCliente = document.getElementById("direccionCliente");
const observacionesCliente = document.getElementById("observacionesCliente");

// ==========================================
// INTEGRACIÓN CON CLIENTES REGISTRADOS
// ==========================================

// Debe coincidir con la clave utilizada por el módulo de clientes.
const CLAVE_CLIENTES = "clientesChiquis";

let clienteSeleccionadoId = "";
let selectorCliente = document.getElementById("clienteRegistrado");

// Crear el selector automáticamente para no modificar el HTML.
if (formularioPedido && !selectorCliente && nombreCliente) {
    const campoSelector = document.createElement("div");

    campoSelector.className = "campo-cliente campo-cliente-registrado";

    campoSelector.innerHTML = `
        <label for="clienteRegistrado">
            ¿Ya estás registrado como cliente?
        </label>

        <select id="clienteRegistrado">
            <option value="nuevo">
                Comprar como cliente nuevo
            </option>
        </select>

        <small>
            Selecciona tu nombre para cargar tus datos registrados.
        </small>
    `;

    formularioPedido.insertBefore(
        campoSelector,
        formularioPedido.firstChild
    );

    selectorCliente = document.getElementById("clienteRegistrado");
}


// Obtener los clientes registrados.
function obtenerClientesRegistrados() {

    try {
        const datos = localStorage.getItem(CLAVE_CLIENTES);

        if (!datos) {
            return [];
        }

        const clientes = JSON.parse(datos);

        return Array.isArray(clientes) ? clientes : [];

    } catch (error) {

        console.error(
            "No se pudieron cargar los clientes registrados:",
            error
        );

        return [];
    }
}


// Cargar los clientes en el selector.
function cargarSelectorClientes() {

    if (!selectorCliente) {
        return;
    }

    const clientes = obtenerClientesRegistrados();
    const valorAnterior = selectorCliente.value;

    selectorCliente.innerHTML = `
        <option value="nuevo">
            Comprar como cliente nuevo
        </option>
    `;

    clientes
        .filter(cliente =>
            cliente &&
            cliente.id &&
            cliente.nombre
        )
        .sort((a, b) =>
            String(a.nombre).localeCompare(
                String(b.nombre),
                "es"
            )
        )
        .forEach(cliente => {

            const opcion = document.createElement("option");

            opcion.value = String(cliente.id);

            opcion.textContent =
                `${cliente.nombre}` +
                (
                    cliente.telefono
                        ? " — " + cliente.telefono
                        : ""
                );

            selectorCliente.appendChild(opcion);
        });

    // Conservar el cliente seleccionado si todavía existe.
    const existeOpcion = [
        ...selectorCliente.options
    ].some(opcion => opcion.value === valorAnterior);

    if (existeOpcion) {
        selectorCliente.value = valorAnterior;
    } else {
        selectorCliente.value = "nuevo";
    }

    aplicarClienteSeleccionado();
}


// Aplicar los datos del cliente seleccionado al formulario.
function aplicarClienteSeleccionado() {

    if (!selectorCliente) {
        return;
    }

    const id = selectorCliente.value;

    clienteSeleccionadoId =
        id && id !== "nuevo"
            ? id
            : "";

    // Si selecciona un cliente nuevo, permitir escribir sus datos.
    if (!clienteSeleccionadoId) {

        nombreCliente.readOnly = false;
        telefonoCliente.readOnly = false;

        nombreCliente.value = "";
        telefonoCliente.value = "";
        direccionCliente.value = "";

        nombreCliente.placeholder = "Ingresa tu nombre";
        telefonoCliente.placeholder = "Ingresa tu teléfono";

        return;
    }

    // Buscar al cliente seleccionado.
    const cliente = obtenerClientesRegistrados().find(
        item =>
            String(item.id) === clienteSeleccionadoId
    );

    // Si el cliente ya no existe, regresar a cliente nuevo.
    if (!cliente) {

        clienteSeleccionadoId = "";
        selectorCliente.value = "nuevo";

        nombreCliente.readOnly = false;
        telefonoCliente.readOnly = false;

        nombreCliente.value = "";
        telefonoCliente.value = "";
        direccionCliente.value = "";

        return;
    }

    // Cargar los datos del cliente.
    nombreCliente.value = cliente.nombre || "";
    telefonoCliente.value = cliente.telefono || "";
    direccionCliente.value = cliente.direccion || "";

    // Evitar modificaciones accidentales del nombre y teléfono.
    nombreCliente.readOnly = true;
    telefonoCliente.readOnly = true;
}


// Detectar cuando se selecciona otro cliente.
if (selectorCliente) {

    selectorCliente.addEventListener(
        "change",
        aplicarClienteSeleccionado
    );
}


// ==========================================
// AGREGAR PRODUCTOS AL CARRITO
// ==========================================

botonesAgregar.forEach(boton => {

    boton.addEventListener("click", () => {

        const tarjeta = boton.closest(".producto-card");

        const nombre = tarjeta
            .querySelector("h3")
            .textContent;

        const precioTexto = tarjeta
            .querySelector("strong")
            .textContent;

        const precio = Number(
            precioTexto.replace("Q", "").trim()
        );

        // Comprobar si el producto ya está en el carrito.
        const productoExistente = carrito.find(
            producto => producto.nombre === nombre
        );

        if (productoExistente) {

            productoExistente.cantidad++;

        } else {

            carrito.push({
                nombre: nombre,
                precio: precio,
                cantidad: 1
            });
        }

        mostrarCarrito();
    });
});


// ==========================================
// MOSTRAR PRODUCTOS DEL CARRITO
// ==========================================

function mostrarCarrito() {

    listaCarrito.innerHTML = "";

    if (carrito.length === 0) {

        listaCarrito.innerHTML =
            "<p>Tu carrito está vacío.</p>";
    }

    carrito.forEach(producto => {

        const subtotal =
            producto.precio * producto.cantidad;

        listaCarrito.innerHTML += `
            <div class="carrito-producto">

                <p>
                    <strong>${producto.nombre}</strong>
                </p>

                <p>
                    Precio: Q${producto.precio.toFixed(2)}
                </p>

                <div class="cantidad-controles">

                    <button
                        type="button"
                        class="btn-cantidad"
                        data-accion="disminuir"
                        data-nombre="${producto.nombre}">

                        -
                    </button>

                    <span>
                        Cantidad: ${producto.cantidad}
                    </span>

                    <button
                        type="button"
                        class="btn-cantidad"
                        data-accion="aumentar"
                        data-nombre="${producto.nombre}">

                        +
                    </button>

                </div>

                <p>
                    Subtotal: Q${subtotal.toFixed(2)}
                </p>

                <button
                    type="button"
                    class="btn-eliminar"
                    data-nombre="${producto.nombre}">

                    Eliminar
                </button>

            </div>
        `;
    });

    // Calcular la cantidad total de productos.
    const cantidadTotal = carrito.reduce(
        (total, producto) =>
            total + producto.cantidad,
        0
    );

    contadorCarrito.textContent = cantidadTotal;

    // Calcular el total de la compra.
    const total = carrito.reduce(
        (suma, producto) =>
            suma + (producto.precio * producto.cantidad),
        0
    );

    totalCarrito.textContent =
        `Q${total.toFixed(2)}`;
}


// ==========================================
// CONTROLAR CANTIDADES Y ELIMINAR PRODUCTOS
// ==========================================

listaCarrito.addEventListener("click", evento => {

    const boton = evento.target.closest("button");

    if (!boton) {
        return;
    }

    const nombre = boton.dataset.nombre;

    // Aumentar o disminuir las cantidades.
    if (boton.classList.contains("btn-cantidad")) {

        const producto = carrito.find(
            p => p.nombre === nombre
        );

        if (!producto) {
            return;
        }

        if (boton.dataset.accion === "aumentar") {

            producto.cantidad++;
        }

        if (boton.dataset.accion === "disminuir") {

            producto.cantidad--;

            if (producto.cantidad <= 0) {

                carrito = carrito.filter(
                    p => p.nombre !== nombre
                );
            }
        }

        mostrarCarrito();

        return;
    }

    // Eliminar todas las unidades del producto.
    if (boton.classList.contains("btn-eliminar")) {

        carrito = carrito.filter(
            p => p.nombre !== nombre
        );

        mostrarCarrito();
    }
});


// ==========================================
// REGISTRAR Y GUARDAR EL PEDIDO
// ==========================================

formularioPedido.addEventListener(
    "submit",
    function(evento) {

        evento.preventDefault();

        // Verificar que el carrito tenga productos.
        if (carrito.length === 0) {

            alert(
                "Debes agregar al menos un producto al carrito."
            );

            return;
        }

        // Validar el número de teléfono.
        const telefono = telefonoCliente.value.trim();

        const telefonoLimpio = telefono.replace(
            /\D/g,
            ""
        );

        if (telefonoLimpio.length < 8) {

            alert(
                "El teléfono debe contener al menos 8 dígitos."
            );

            return;
        }

        // Obtener los pedidos que ya existen.
        let pedidosGuardados = [];

        try {

            pedidosGuardados = JSON.parse(
                localStorage.getItem("pedidosChiquis") || "[]"
            );

        } catch (error) {

            alert(
                "No se pudieron recuperar los pedidos anteriores."
            );

            return;
        }

        // Generar el siguiente número de pedido.
        const mayor = pedidosGuardados.reduce(
            (max, pedido) => {

                const numero = Number(
                    String(pedido.numero || "")
                        .replace(/\D/g, "")
                );

                return Math.max(max, numero || 0);
            },
            0
        );

        const nuevoNumero =
            `PED-${String(mayor + 1).padStart(4, "0")}`;

        // Recuperar el cliente seleccionado.
        let clienteRegistrado = null;

        if (clienteSeleccionadoId) {

            clienteRegistrado = obtenerClientesRegistrados().find(
                cliente =>
                    String(cliente.id) ===
                    String(clienteSeleccionadoId)
            ) || null;

            if (!clienteRegistrado) {

                alert(
                    "El cliente seleccionado ya no aparece en los registros. " +
                    "Actualiza la página y vuelve a seleccionarlo."
                );

                cargarSelectorClientes();

                return;
            }
        }

        // Crear el nuevo pedido.
        const ahora = new Date();

        const nuevoPedido = {

            id:
                `${Date.now()}` +
                `${Math.random().toString(36).slice(2, 7)}`,

            numero: nuevoNumero,

            // Guardar el identificador del cliente registrado.
            clienteId: clienteRegistrado
                ? String(clienteRegistrado.id)
                : null,

            // Usar los datos del cliente seleccionado.
            cliente: clienteRegistrado
                ? clienteRegistrado.nombre
                : nombreCliente.value.trim(),

            telefono: clienteRegistrado
                ? clienteRegistrado.telefono
                : telefonoCliente.value.trim(),

            origen: "tienda",

            estado: "recibido",

            fecha: ahora.toISOString(),

            productos: carrito.map(
                producto => ({ ...producto })
            ),

            notas:
                `Dirección de entrega: ${direccionCliente.value.trim()}` +
                (
                    observacionesCliente.value.trim()
                        ? ` | Observaciones: ${observacionesCliente.value.trim()}`
                        : ""
                ),

            creado: ahora.toISOString()
        };

        // Guardar el pedido.
        try {

            pedidosGuardados.push(nuevoPedido);

            localStorage.setItem(
                "pedidosChiquis",
                JSON.stringify(pedidosGuardados)
            );

            alert(
                `¡Pedido ${nuevoNumero} realizado correctamente!\n` +
                "Guarda este número: lo necesitas, junto con tu teléfono, " +
                'para consultar el estado de tu pedido en "Consultar mi pedido".'
            );

            // Vaciar el carrito.
            carrito = [];

            mostrarCarrito();

            // Limpiar el formulario.
            formularioPedido.reset();

            clienteSeleccionadoId = "";

            if (selectorCliente) {
                selectorCliente.value = "nuevo";
            }

            cargarSelectorClientes();

        } catch (error) {

            console.error(
                "Error al guardar el pedido:",
                error
            );

            alert(
                "No se pudo guardar el pedido. Inténtalo nuevamente."
            );
        }
    }
);


// ==========================================
// BÚSQUEDA Y FILTRO DE PRODUCTOS
// ==========================================

const buscadorProductos =
    document.getElementById("buscadorProductos");

const botonesCategoria =
    document.querySelectorAll(".btn-categoria");

const tarjetasProductos =
    document.querySelectorAll(".producto-card");

let categoriaActual = "todos";


// Filtrar productos.
function filtrarProductos() {

    const textoBusqueda = buscadorProductos.value
        .toLowerCase()
        .trim();

    tarjetasProductos.forEach(tarjeta => {

        const categoria = tarjeta.dataset.categoria;

        const nombre = tarjeta
            .querySelector("h3")
            .textContent
            .toLowerCase();

        const descripcion = tarjeta
            .querySelector("p")
            .textContent
            .toLowerCase();

        // Comprobar la categoría.
        const coincideCategoria =
            categoriaActual === "todos" ||
            categoria === categoriaActual;

        // Comprobar el texto de búsqueda.
        const coincideBusqueda =
            nombre.includes(textoBusqueda) ||
            descripcion.includes(textoBusqueda);

        // Mostrar u ocultar el producto.
        if (coincideCategoria && coincideBusqueda) {

            tarjeta.style.display = "flex";

        } else {

            tarjeta.style.display = "none";
        }
    });
}


// Botones de categoría.
botonesCategoria.forEach(boton => {

    boton.addEventListener("click", () => {

        // Obtener la categoría seleccionada.
        categoriaActual = boton.dataset.categoria;

        // Quitar el estado activo de todos los botones.
        botonesCategoria.forEach(btn => {
            btn.classList.remove("activo");
        });

        // Activar el botón seleccionado.
        boton.classList.add("activo");

        // Aplicar el filtro.
        filtrarProductos();
    });
});


// Barra de búsqueda.
buscadorProductos.addEventListener("input", () => {

    filtrarProductos();
});


// ==========================================
// VENTANA LATERAL DEL CARRITO
// ==========================================

const botonCarrito =
    document.querySelector(".btn-carrito");

const ventanaCarrito =
    document.getElementById("ventanaCarrito");

const cerrarCarrito =
    document.getElementById("cerrarCarrito");


// Abrir el carrito.
botonCarrito.addEventListener("click", () => {

    ventanaCarrito.style.display = "flex";
});


// Cerrar el carrito.
cerrarCarrito.addEventListener("click", () => {

    ventanaCarrito.style.display = "none";
});


// ==========================================
// FORMULARIO DEL PEDIDO
// ==========================================

const continuarPedido =
    document.getElementById("continuarPedido");

const ventanaDatosCliente =
    document.getElementById("ventanaDatosCliente");


// Continuar con el pedido.
continuarPedido.addEventListener("click", () => {

    if (carrito.length === 0) {

        alert("Tu carrito está vacío.");

        return;
    }

    ventanaCarrito.style.display = "none";

    // Actualizar la lista de clientes antes de mostrar el formulario.
    cargarSelectorClientes();

    ventanaDatosCliente.style.display = "flex";
});


// Cerrar el formulario del pedido.
const cerrarDatosCliente =
    document.getElementById("cerrarDatosCliente");

cerrarDatosCliente.addEventListener("click", () => {

    ventanaDatosCliente.style.display = "none";
});


// ==========================================
// CARGAR CLIENTES AL INICIAR
// ==========================================

// Cargar los clientes registrados al iniciar el catálogo.
cargarSelectorClientes();