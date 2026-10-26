document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const tablaBody = $("tablaBody");
    const emptyState = $("emptyState");
    const emptyTitle = $("emptyTitle");
    const emptyDescription = $("emptyDescription");

    const searchInput = $("searchInput");
    const btnLimpiarBusqueda = $("btnLimpiarBusqueda");

    const resultadoTexto = $("resultadoTexto");
    const tableFooterText = $("tableFooterText");

    const panel = $("panel");
    const overlay = $("overlay");
    const pedidoForm = $("pedidoForm");
    const panelTitulo = $("panelTitulo");

    const pedidoId = $("pedidoId");
    const clienteNombre = $("clienteNombre");
    const clienteTelefono = $("clienteTelefono");

    const clientesDisponibles = $("clientesDisponibles");

    const origen = $("origen");
    const estado = $("estado");
    const fechaPedido = $("fechaPedido");

    const productosLista = $("productosLista");
    const productosError = $("productosError");
    const totalPedido = $("totalPedido");

    const notas = $("notas");

    const dialogDetalle = $("dialogDetalle");
    const dialogEliminar = $("dialogEliminar");

    const toast = $("toast");
    const toastMessage = $("toastMessage");
    const toastIcon = $("toastIcon");

    const inputImportar = $("inputImportar");

    let pedidos = cargarPedidos();
    let filtroActual = "todos";

    let pedidoDetalle = null;
    let pedidoAEliminar = null;
    let toastTimeout = null;

    /* =====================================================
       ALMACENAMIENTO
    ===================================================== */

    function cargarPedidos() {
        try {
            const datos = JSON.parse(
                localStorage.getItem("pedidosChiquis") || "[]"
            );

            return Array.isArray(datos) ? datos : [];

        } catch (error) {
            console.error("No fue posible cargar los pedidos.", error);
            return [];
        }
    }

    function guardarPedidos() {
        try {
            localStorage.setItem(
                "pedidosChiquis",
                JSON.stringify(pedidos)
            );

        } catch (error) {
            console.error("No fue posible guardar los pedidos.", error);

            mostrarToast(
                "No se pudieron guardar los cambios en el navegador.",
                "error"
            );
        }
    }

    function cargarClientes() {
        try {
            const clientes = JSON.parse(
                localStorage.getItem("clientesChiquis") || "[]"
            );

            if (!Array.isArray(clientes)) {
                return;
            }

            clientesDisponibles.innerHTML = "";

            clientes.forEach(function (cliente) {
                const opcion = document.createElement("option");

                opcion.value = cliente.nombre || "";
                opcion.dataset.telefono = cliente.telefono || "";

                clientesDisponibles.appendChild(opcion);
            });

        } catch (error) {
            console.error(
                "No fue posible cargar la lista de clientes.",
                error
            );
        }
    }

    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function obtenerIniciales(nombre) {
        const partes = String(nombre || "C")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        return partes
            .slice(0, 2)
            .map(parte => parte[0])
            .join("")
            .toUpperCase();
    }

    function formatearMoneda(valor) {
        return `Q${Number(valor || 0).toLocaleString("es-GT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function formatearFecha(fecha) {
        const objeto = new Date(fecha);

        if (Number.isNaN(objeto.getTime())) {
            return "Sin fecha";
        }

        return objeto.toLocaleString("es-GT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function fechaLocal(fecha = new Date()) {
        const diferencia = fecha.getTimezoneOffset() * 60000;

        return new Date(
            fecha.getTime() - diferencia
        ).toISOString().slice(0, 16);
    }

    function totalDePedido(pedido) {
        return (pedido.productos || []).reduce(
            (suma, producto) =>
                suma +
                Number(producto.cantidad || 0) *
                Number(producto.precio || 0),
            0
        );
    }

    function nombreEstado(valor) {
        return {
            recibido: "Pedido recibido",
            preparacion: "En preparación",
            preparado: "Preparado",
            despachado: "Despachado",
            entrega: "En proceso de entrega",
            entregado: "Entregado"
        }[valor] || "Pedido recibido";
    }

    function historialDe(pedido) {
        if (
            Array.isArray(pedido.historial) &&
            pedido.historial.length
        ) {
            return pedido.historial;
        }

        return [{
            estado: pedido.estado || "recibido",
            fecha: pedido.fecha || pedido.creado
        }];
    }

    function registrarEstado(pedido, nuevoEstado) {
        pedido.historial = historialDe(pedido).slice();

        const ultimo =
            pedido.historial[pedido.historial.length - 1];

        if (!ultimo || ultimo.estado !== nuevoEstado) {
            pedido.historial.push({
                estado: nuevoEstado,
                fecha: new Date().toISOString()
            });
        }
    }

    function iconoOrigen(valor) {
        return {
            telefono: "☎ Teléfono",
            whatsapp: "💬 WhatsApp",
            tienda: "⌂ Tienda"
        }[valor] || "☎ Teléfono";
    }

    function siguienteNumero() {
        const mayor = pedidos.reduce(function (actual, pedido) {
            const numero = Number(
                String(pedido.numero || "").replace(/\D/g, "")
            );

            return Math.max(actual, numero || 0);

        }, 0);

        return `PED-${String(mayor + 1).padStart(4, "0")}`;
    }

    function mostrarToast(mensaje, tipo = "success") {
        clearTimeout(toastTimeout);

        toastMessage.textContent = mensaje;

        toastIcon.textContent =
            tipo === "error" ? "!" : "✓";

        toastIcon.style.background =
            tipo === "error" ? "var(--red)" : "#3e9c68";

        toast.classList.add("show");

        toastTimeout = setTimeout(function () {
            toast.classList.remove("show");
        }, 3200);
    }

    /* =====================================================
       ESTADÍSTICAS
    ===================================================== */

    function actualizarResumen(pedidosVisibles) {
        const recibidos = pedidos.filter(
            pedido => pedido.estado === "recibido"
        ).length;

        const enPreparacion = pedidos.filter(
            pedido => pedido.estado === "preparacion"
        ).length;

        const preparados = pedidos.filter(
            pedido => pedido.estado === "preparado"
        ).length;

        const despachados = pedidos.filter(
            pedido => pedido.estado === "despachado"
        ).length;

        const enEntrega = pedidos.filter(
            pedido => pedido.estado === "entrega"
        ).length;

        const entregados = pedidos.filter(
            pedido => pedido.estado === "entregado"
        ).length;

        const ventas = pedidos.reduce(
            (suma, pedido) => suma + totalDePedido(pedido),
            0
        );

        $("statTotal").textContent = pedidos.length;
        $("statRecibidos").textContent = recibidos;
        $("statEntregados").textContent = entregados;
        $("statVentas").textContent = formatearMoneda(ventas);

        $("countTodos").textContent = pedidos.length;
        $("countRecibidos").textContent = recibidos;
        $("countPreparacion").textContent = enPreparacion;
        $("countPreparados").textContent = preparados;
        $("countDespachados").textContent = despachados;
        $("countEnEntrega").textContent = enEntrega;
        $("countEntregados").textContent = entregados;

        tableFooterText.textContent =
            pedidosVisibles === 1
                ? "1 pedido visible"
                : `${pedidosVisibles} pedidos visibles`;
    }

    /* =====================================================
       BÚSQUEDA Y TABLA
    ===================================================== */

    function obtenerPedidosFiltrados() {
        const busqueda = searchInput.value
            .toLowerCase()
            .trim();

        return pedidos.filter(function (pedido) {
            const coincideEstado =
                filtroActual === "todos" ||
                pedido.estado === filtroActual;

            const texto = [
                pedido.numero,
                pedido.cliente,
                pedido.telefono,
                pedido.origen,
                pedido.estado,
                ...(pedido.productos || []).map(
                    producto => producto.nombre
                )
            ].join(" ").toLowerCase();

            return coincideEstado && texto.includes(busqueda);
        });
    }

    function mostrarPedidos() {
        const filtrados = obtenerPedidosFiltrados();

        tablaBody.innerHTML = "";

        emptyState.hidden = filtrados.length !== 0;

        if (!filtrados.length) {
            const noHayPedidos = pedidos.length === 0;

            emptyTitle.textContent = noHayPedidos
                ? "No hay pedidos registrados"
                : "No encontramos pedidos";

            emptyDescription.textContent = noHayPedidos
                ? "Comienza registrando el primer pedido."
                : "Prueba cambiando la búsqueda o seleccionando otro filtro.";
        }

        filtrados.forEach(function (pedido, indice) {
            const fila = document.createElement("tr");

            const productos = pedido.productos || [];

            const unidades = productos.reduce(
                (suma, producto) =>
                    suma + Number(producto.cantidad || 0),
                0
            );

            const descripcion = productos
                .map(producto => producto.nombre)
                .filter(Boolean)
                .join(", ");

            fila.style.animationDelay = `${indice * 0.03}s`;

            fila.innerHTML = `
                <td>
                    <span class="pedido-number">
                        ${escaparHTML(pedido.numero)}
                    </span>

                    <span class="pedido-origin">
                        ${escaparHTML(iconoOrigen(pedido.origen))}
                    </span>
                </td>

                <td>
                    <div class="pedido-client">

                        <div class="pedido-avatar">
                            ${escaparHTML(obtenerIniciales(pedido.cliente))}
                        </div>

                        <div>
                            <strong>${escaparHTML(pedido.cliente)}</strong>
                            <small>${escaparHTML(pedido.telefono)}</small>
                        </div>

                    </div>
                </td>

                <td>
                    <div class="products-summary">
                        <strong>
                            ${unidades}
                            ${unidades === 1 ? "producto" : "productos"}
                        </strong>

                        <small title="${escaparHTML(descripcion)}">
                            ${escaparHTML(descripcion || "Sin productos")}
                        </small>
                    </div>
                </td>

                <td class="pedido-total">
                    ${formatearMoneda(totalDePedido(pedido))}
                </td>

                <td>${formatearFecha(pedido.fecha)}</td>

                <td>
                    <span class="order-status status-${escaparHTML(pedido.estado)}">
                        ${escaparHTML(nombreEstado(pedido.estado))}
                    </span>
                </td>

                <td>
                    <div class="acciones">

                        <button
                            type="button"
                            class="btn-accion"
                            data-accion="ver"
                            data-id="${escaparHTML(pedido.id)}"
                            title="Ver pedido">

                            👁
                        </button>

                        <button
                            type="button"
                            class="btn-accion"
                            data-accion="editar"
                            data-id="${escaparHTML(pedido.id)}"
                            title="Editar pedido">

                            ✎
                        </button>

                        <button
                            type="button"
                            class="btn-accion"
                            data-accion="pdf"
                            data-id="${escaparHTML(pedido.id)}"
                            title="Descargar PDF">

                            📄
                        </button>

                        <button
                            type="button"
                            class="btn-accion eliminar"
                            data-accion="eliminar"
                            data-id="${escaparHTML(pedido.id)}"
                            title="Eliminar pedido">

                            ×
                        </button>

                    </div>
                </td>
            `;

            tablaBody.appendChild(fila);
        });

        const busqueda = searchInput.value.trim();

        resultadoTexto.textContent = busqueda
            ? `${filtrados.length} resultado${filtrados.length === 1 ? "" : "s"} para "${busqueda}"`
            : `Mostrando ${filtrados.length} de ${pedidos.length} pedidos`;

        btnLimpiarBusqueda.classList.toggle(
            "visible",
            Boolean(busqueda)
        );

        actualizarResumen(filtrados.length);
    }

    /* =====================================================
       FORMULARIO DE PRODUCTOS
    ===================================================== */

    function crearFilaProducto(producto = {}) {
        const fila = document.createElement("div");

        fila.className = "product-row";

        fila.innerHTML = `
            <div class="product-field">
                <label>Producto</label>

                <input
                    class="producto-nombre"
                    type="text"
                    maxlength="100"
                    placeholder="Nombre del producto"
                    value="${escaparHTML(producto.nombre || "")}">
            </div>

            <div class="product-field">
                <label>Cantidad</label>

                <input
                    class="producto-cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value="${Math.max(1, Number(producto.cantidad) || 1)}">
            </div>

            <div class="product-field">
                <label>Precio unitario</label>

                <input
                    class="producto-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${Math.max(0, Number(producto.precio) || 0)}">
            </div>

            <div>
                <label class="product-total-label">Subtotal</label>
                <div class="line-total">Q0.00</div>
            </div>

            <button
                class="remove-product"
                type="button"
                title="Quitar producto">

                ×
            </button>
        `;

        productosLista.appendChild(fila);

        actualizarTotalFormulario();
    }

    function leerProductos() {
        return [
            ...productosLista.querySelectorAll(".product-row")
        ].map(function (fila) {
            return {
                nombre: fila.querySelector(
                    ".producto-nombre"
                ).value.trim(),

                cantidad: Math.max(
                    1,
                    Math.floor(
                        Number(
                            fila.querySelector(
                                ".producto-cantidad"
                            ).value
                        ) || 1
                    )
                ),

                precio: Math.max(
                    0,
                    Number(
                        fila.querySelector(
                            ".producto-precio"
                        ).value
                    ) || 0
                )
            };

        }).filter(producto => producto.nombre);
    }

    function actualizarTotalFormulario() {
        let total = 0;

        productosLista.querySelectorAll(
            ".product-row"
        ).forEach(function (fila) {
            const cantidad = Math.max(
                0,
                Number(
                    fila.querySelector(
                        ".producto-cantidad"
                    ).value
                ) || 0
            );

            const precio = Math.max(
                0,
                Number(
                    fila.querySelector(
                        ".producto-precio"
                    ).value
                ) || 0
            );

            const subtotal = cantidad * precio;

            fila.querySelector(
                ".line-total"
            ).textContent = formatearMoneda(subtotal);

            total += subtotal;
        });

        totalPedido.textContent = formatearMoneda(total);
    }

    function limpiarErrores() {
        pedidoForm.querySelectorAll(".error").forEach(
            elemento => elemento.classList.remove("error")
        );

        pedidoForm.querySelectorAll(".error-message").forEach(
            elemento => elemento.remove()
        );

        productosError.hidden = true;
    }

    function marcarError(elemento, mensaje) {
        elemento.classList.add("error");

        const aviso = document.createElement("div");

        aviso.className = "error-message";
        aviso.textContent = mensaje;

        elemento.parentElement.appendChild(aviso);
    }

    function validarFormulario() {
        limpiarErrores();

        let valido = true;

        if (clienteNombre.value.trim().length < 3) {
            marcarError(
                clienteNombre,
                "Ingresa el nombre del cliente."
            );

            valido = false;
        }

        if (
            clienteTelefono.value.replace(/\D/g, "").length < 8
        ) {
            marcarError(
                clienteTelefono,
                "Ingresa un teléfono válido."
            );

            valido = false;
        }

        if (!fechaPedido.value) {
            marcarError(
                fechaPedido,
                "Selecciona la fecha del pedido."
            );

            valido = false;
        }

        const productos = leerProductos();

        if (!productos.length) {
            productosError.hidden = false;
            valido = false;
        }

        const filasProducto = [
            ...productosLista.querySelectorAll(".product-row")
        ];

        filasProducto.forEach(function (fila) {
            const nombre = fila.querySelector(
                ".producto-nombre"
            ).value.trim();

            const cantidad = Number(
                fila.querySelector(
                    ".producto-cantidad"
                ).value
            );

            const precio = Number(
                fila.querySelector(
                    ".producto-precio"
                ).value
            );

            if (
                nombre &&
                (
                    !Number.isFinite(cantidad) ||
                    cantidad < 1 ||
                    !Number.isInteger(cantidad)
                )
            ) {
                marcarError(
                    fila.querySelector(".producto-cantidad"),
                    "La cantidad debe ser un entero mayor que cero."
                );

                valido = false;
            }

            if (
                nombre &&
                (
                    !Number.isFinite(precio) ||
                    precio < 0
                )
            ) {
                marcarError(
                    fila.querySelector(".producto-precio"),
                    "Ingresa un precio válido."
                );

                valido = false;
            }
        });

        if (!valido) {
            mostrarToast(
                "Revisa los campos marcados.",
                "error"
            );
        }

        return valido;
    }

    /* =====================================================
       PANEL NUEVO / EDITAR
    ===================================================== */

    function abrirPanel(modo, pedido = null) {
        pedidoForm.reset();

        limpiarErrores();

        productosLista.innerHTML = "";

        pedidoId.value = "";

        fechaPedido.value = fechaLocal();

        estado.value = "recibido";

        if (modo === "editar" && pedido) {
            panelTitulo.textContent = "Editar pedido";

            pedidoId.value = pedido.id;

            clienteNombre.value = pedido.cliente || "";
            clienteTelefono.value = pedido.telefono || "";

            origen.value = pedido.origen || "telefono";
            estado.value = pedido.estado || "recibido";

            fechaPedido.value = fechaLocal(
                new Date(pedido.fecha)
            );

            notas.value = pedido.notas || "";

            (pedido.productos || []).forEach(
                crearFilaProducto
            );

        } else {
            panelTitulo.textContent = "Nuevo pedido";

            crearFilaProducto();
        }

        if (!productosLista.children.length) {
            crearFilaProducto();
        }

        overlay.hidden = false;

        panel.classList.add("is-open");

        panel.setAttribute("aria-hidden", "false");

        setTimeout(function () {
            clienteNombre.focus();
        }, 300);
    }

    function cerrarPanel() {
        panel.classList.remove("is-open");

        panel.setAttribute("aria-hidden", "true");

        setTimeout(function () {
            overlay.hidden = true;
        }, 350);
    }

    /* =====================================================
       DETALLE DEL PEDIDO
    ===================================================== */

    function abrirDetalle(pedido) {
        pedidoDetalle = pedido;

        $("detalleNumero").textContent = pedido.numero;

        $("detalleCliente").textContent = pedido.cliente;

        $("detalleTelefono").textContent = pedido.telefono;

        $("detalleOrigen").textContent = iconoOrigen(
            pedido.origen
        );

        $("detalleFecha").textContent = formatearFecha(
            pedido.fecha
        );

        $("detalleTotal").textContent = formatearMoneda(
            totalDePedido(pedido)
        );

        $("detalleEstado").textContent = nombreEstado(
            pedido.estado
        );

        $("detalleEstado").className =
            `order-status status-${pedido.estado}`;

        $("detalleNotas").textContent =
            pedido.notas || "Sin observaciones.";

        $("detalleProductos").innerHTML =
            (pedido.productos || []).map(function (producto) {
                const cantidad = Number(producto.cantidad) || 0;
                const precio = Number(producto.precio) || 0;

                return `
                    <div class="detail-product-row">
                        <div>
                            <strong>${escaparHTML(producto.nombre)}</strong>
                            <br>
                            <small>
                                ${cantidad} × ${formatearMoneda(precio)}
                            </small>
                        </div>

                        <strong>
                            ${formatearMoneda(cantidad * precio)}
                        </strong>
                    </div>
                `;
            }).join("");

        $("detalleHistorial").innerHTML =
            historialDe(pedido).map(function (item) {
                return `
                    <div class="detail-product-row">

                        <span class="order-status status-${escaparHTML(item.estado)}">
                            ${escaparHTML(nombreEstado(item.estado))}
                        </span>

                        <small>
                            ${formatearFecha(item.fecha)}
                        </small>

                    </div>
                `;
            }).join("");

        $("btnAvanzarEstado").disabled =
            pedido.estado === "entregado";

        dialogDetalle.showModal();
    }

    /* =====================================================
       AVANZAR ESTADO
    ===================================================== */

    function avanzarEstado(pedido) {
        const siguiente = {
            recibido: "preparacion",
            preparacion: "preparado",
            preparado: "despachado",
            despachado: "entrega",
            entrega: "entregado"
        };

        if (!siguiente[pedido.estado]) {
            mostrarToast(
                `${pedido.numero} ya fue entregado.`,
                "error"
            );

            return;
        }

        const nuevoEstado = siguiente[pedido.estado];

        registrarEstado(pedido, nuevoEstado);

        pedido.estado = nuevoEstado;

        guardarPedidos();

        mostrarPedidos();

        mostrarToast(
            `${pedido.numero} cambió a ${nombreEstado(pedido.estado).toLowerCase()}.`
        );
    }

       /* =====================================================
       GENERACIÓN DE PDF - VERSIÓN CORREGIDA
    ===================================================== */

    let promesaBibliotecaPDF = null;

    function cargarBibliotecaPDF() {
        // Si jsPDF ya está cargado, utilizarlo.
        if (
            window.jspdf &&
            typeof window.jspdf.jsPDF === "function"
        ) {
            return Promise.resolve(window.jspdf.jsPDF);
        }

        // Evitar cargar la biblioteca varias veces.
        if (promesaBibliotecaPDF) {
            return promesaBibliotecaPDF;
        }

        const fuentes = [
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
            "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
            "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
        ];

        promesaBibliotecaPDF = new Promise(function (
            resolver,
            rechazar
        ) {
            let indice = 0;

            function intentarCarga() {
                if (
                    window.jspdf &&
                    typeof window.jspdf.jsPDF === "function"
                ) {
                    resolver(window.jspdf.jsPDF);
                    return;
                }

                if (indice >= fuentes.length) {
                    promesaBibliotecaPDF = null;

                    rechazar(
                        new Error(
                            "No se pudo cargar jsPDF desde ninguna fuente."
                        )
                    );

                    return;
                }

                const url = fuentes[indice++];

                const script = document.createElement("script");

                script.src = url;
                script.async = true;

                script.onload = function () {
                    if (
                        window.jspdf &&
                        typeof window.jspdf.jsPDF === "function"
                    ) {
                        resolver(window.jspdf.jsPDF);
                    } else {
                        script.remove();
                        intentarCarga();
                    }
                };

                script.onerror = function () {
                    script.remove();
                    intentarCarga();
                };

                document.head.appendChild(script);
            }

            intentarCarga();
        });

        return promesaBibliotecaPDF;
    }

    function textoPDF(valor) {
        return String(valor ?? "")
            .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function nombreArchivoSeguro(valor) {
        return String(valor || "pedido")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .replace(/_+/g, "_");
    }

    function escribirTextoPDF(
        doc,
        texto,
        x,
        y,
        ancho,
        interlineado = 5
    ) {
        const lineas = doc.splitTextToSize(
            textoPDF(texto),
            ancho
        );

        doc.text(lineas, x, y);

        return y + lineas.length * interlineado;
    }

    function agregarPiePDF(doc, pagina, totalPaginas) {
        const alto = doc.internal.pageSize.getHeight();
        const ancho = doc.internal.pageSize.getWidth();

        doc.setDrawColor(220, 220, 220);

        doc.line(15, alto - 16, ancho - 15, alto - 16);

        doc.setTextColor(70, 70, 70);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        doc.text(
            "Variedades Chiquis | Reporte generado por el sistema",
            15,
            alto - 10
        );

        doc.text(
            `Página ${pagina} de ${totalPaginas}`,
            ancho - 15,
            alto - 10,
            { align: "right" }
        );
    }

    function dibujarEncabezadoPDF(doc, subtitulo) {
        const ancho = doc.internal.pageSize.getWidth();

        doc.setFillColor(42, 52, 65);

        doc.rect(0, 0, ancho, 36, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19);

        doc.text("VARIEDADES CHIQUIS", 15, 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(textoPDF(subtitulo), 15, 25);

        doc.setTextColor(35, 35, 35);
    }

    function asegurarEspacioPDF(doc, y, espacioNecesario) {
        const alto = doc.internal.pageSize.getHeight();

        if (y + espacioNecesario > alto - 22) {
            doc.addPage();
            return 18;
        }

        return y;
    }

    /* =====================================================
       PDF INDIVIDUAL DE UN PEDIDO
    ===================================================== */

    async function generarPDFPedido(pedido) {
        if (!pedido) {
            mostrarToast(
                "No se encontró el pedido.",
                "error"
            );

            return;
        }

        try {
            mostrarToast("Preparando el PDF...");

            const jsPDF = await cargarBibliotecaPDF();

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const ancho = doc.internal.pageSize.getWidth();

            dibujarEncabezadoPDF(
                doc,
                `Comprobante de pedido ${pedido.numero || ""}`
            );

            let y = 47;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);

            doc.text("DATOS DEL PEDIDO", 15, y);

            y += 8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const datos = [
                ["Número:", pedido.numero || "Sin número"],
                ["Cliente:", pedido.cliente || "Sin nombre"],
                ["Teléfono:", pedido.telefono || "Sin teléfono"],
                ["Fecha:", formatearFecha(pedido.fecha)],
                ["Origen:", iconoOrigen(pedido.origen)],
                ["Estado:", nombreEstado(pedido.estado)]
            ];

            datos.forEach(function ([etiqueta, valor]) {
                doc.setFont("helvetica", "bold");
                doc.text(etiqueta, 15, y);

                doc.setFont("helvetica", "normal");

                const lineas = doc.splitTextToSize(
                    textoPDF(valor),
                    ancho - 57
                );

                doc.text(lineas, 43, y);

                y += Math.max(6, lineas.length * 5);
            });

            y += 5;

            y = asegurarEspacioPDF(doc, y, 25);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);

            doc.text("DETALLE DE PRODUCTOS", 15, y);

            y += 7;

            const xProducto = 17;
            const xCantidad = 115;
            const xPrecio = 143;
            const xSubtotal = ancho - 17;

            function encabezadoTabla() {
                doc.setFillColor(235, 239, 243);

                doc.rect(
                    15,
                    y - 5,
                    ancho - 30,
                    9,
                    "F"
                );

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);

                doc.text("Producto", xProducto, y);

                doc.text(
                    "Cant.",
                    xCantidad,
                    y,
                    { align: "right" }
                );

                doc.text(
                    "Precio",
                    xPrecio,
                    y,
                    { align: "right" }
                );

                doc.text(
                    "Subtotal",
                    xSubtotal,
                    y,
                    { align: "right" }
                );

                y += 8;
            }

            encabezadoTabla();

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);

            const productos = Array.isArray(pedido.productos)
                ? pedido.productos
                : [];

            productos.forEach(function (producto) {
                const cantidad = Number(producto.cantidad) || 0;
                const precio = Number(producto.precio) || 0;
                const subtotal = cantidad * precio;

                const nombre = textoPDF(
                    producto.nombre || "Producto"
                );

                const lineas = doc.splitTextToSize(
                    nombre,
                    88
                );

                const alturaFila = Math.max(
                    7,
                    lineas.length * 4.5
                );

                const altoPagina =
                    doc.internal.pageSize.getHeight();

                if (y + alturaFila + 5 > altoPagina - 22) {
                    doc.addPage();

                    y = 18;

                    encabezadoTabla();

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                }

                doc.text(lineas, xProducto, y);

                doc.text(
                    String(cantidad),
                    xCantidad,
                    y,
                    { align: "right" }
                );

                doc.text(
                    formatearMoneda(precio),
                    xPrecio,
                    y,
                    { align: "right" }
                );

                doc.text(
                    formatearMoneda(subtotal),
                    xSubtotal,
                    y,
                    { align: "right" }
                );

                y += alturaFila;

                doc.setDrawColor(225, 225, 225);

                doc.line(
                    15,
                    y - 2,
                    ancho - 15,
                    y - 2
                );

                y += 2;
            });

            y += 5;

            y = asegurarEspacioPDF(doc, y, 25);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);

            doc.text(
                `TOTAL: ${formatearMoneda(totalDePedido(pedido))}`,
                ancho - 15,
                y,
                { align: "right" }
            );

            y += 12;

            if (pedido.notas) {
                y = asegurarEspacioPDF(doc, y, 22);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);

                doc.text("OBSERVACIONES", 15, y);

                y += 6;

                doc.setFont("helvetica", "normal");

                y = escribirTextoPDF(
                    doc,
                    pedido.notas,
                    15,
                    y,
                    ancho - 30,
                    5
                );
            }

            y = asegurarEspacioPDF(doc, y, 20);

            y += 8;

            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);

            doc.text(
                "Gracias por tu preferencia.",
                ancho / 2,
                y,
                { align: "center" }
            );

            const totalPaginas =
                doc.internal.getNumberOfPages();

            for (
                let pagina = 1;
                pagina <= totalPaginas;
                pagina++
            ) {
                doc.setPage(pagina);

                agregarPiePDF(
                    doc,
                    pagina,
                    totalPaginas
                );
            }

            const archivo = [
                "Variedades_Chiquis",
                nombreArchivoSeguro(pedido.numero)
            ].join("_") + ".pdf";

            doc.save(archivo);

            mostrarToast(
                `PDF de ${pedido.numero} generado correctamente.`
            );

        } catch (error) {
            console.error(
                "Error al generar el PDF del pedido:",
                error
            );

            mostrarToast(
                "No se pudo generar el PDF. Comprueba tu conexión a Internet y vuelve a intentarlo.",
                "error"
            );
        }
    }

    /* =====================================================
       PDF GENERAL DE PEDIDOS
    ===================================================== */

    async function generarPDFGeneral(
        listaPedidos,
        titulo = "Reporte de pedidos"
    ) {
        if (
            !Array.isArray(listaPedidos) ||
            listaPedidos.length === 0
        ) {
            mostrarToast(
                "No hay pedidos para generar el PDF.",
                "error"
            );

            return;
        }

        try {
            mostrarToast("Preparando el reporte PDF...");

            const jsPDF = await cargarBibliotecaPDF();

            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

            const ancho = doc.internal.pageSize.getWidth();

            const totalVentas = listaPedidos.reduce(
                (suma, pedido) =>
                    suma + totalDePedido(pedido),
                0
            );

            const fechaGeneracion = formatearFecha(
                new Date().toISOString()
            );

            let y = 45;

            function encabezadoPagina() {
                dibujarEncabezadoPDF(doc, titulo);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);

                doc.text(
                    `Fecha de generación: ${fechaGeneracion}`,
                    15,
                    43
                );

                doc.text(
                    `Pedidos incluidos: ${listaPedidos.length}`,
                    ancho - 15,
                    43,
                    { align: "right" }
                );

                y = 54;

                doc.setFillColor(235, 239, 243);

                doc.rect(
                    12,
                    y - 5,
                    ancho - 24,
                    9,
                    "F"
                );

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);

                doc.text("Número", 14, y);
                doc.text("Cliente", 38, y);
                doc.text("Teléfono", 91, y);
                doc.text("Fecha", 125, y);
                doc.text("Estado", 161, y);
                doc.text("Unidades", 207, y);

                doc.text(
                    "Total",
                    ancho - 15,
                    y,
                    { align: "right" }
                );

                y += 9;
            }

            encabezadoPagina();

            listaPedidos.forEach(function (pedido) {
                const altoPagina =
                    doc.internal.pageSize.getHeight();

                if (y > altoPagina - 23) {
                    doc.addPage();
                    encabezadoPagina();
                }

                const unidades = (
                    pedido.productos || []
                ).reduce(
                    (suma, producto) =>
                        suma + Number(producto.cantidad || 0),
                    0
                );

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);

                doc.text(
                    textoPDF(pedido.numero || "-").slice(0, 15),
                    14,
                    y
                );

                doc.text(
                    textoPDF(pedido.cliente || "-").slice(0, 30),
                    38,
                    y
                );

                doc.text(
                    textoPDF(pedido.telefono || "-").slice(0, 18),
                    91,
                    y
                );

                doc.text(
                    formatearFecha(pedido.fecha).slice(0, 16),
                    125,
                    y
                );

                doc.text(
                    textoPDF(
                        nombreEstado(pedido.estado)
                    ).slice(0, 22),
                    161,
                    y
                );

                doc.text(
                    String(unidades),
                    207,
                    y
                );

                doc.text(
                    formatearMoneda(totalDePedido(pedido)),
                    ancho - 15,
                    y,
                    { align: "right" }
                );

                y += 7;

                doc.setDrawColor(225, 225, 225);

                doc.line(
                    12,
                    y - 3,
                    ancho - 12,
                    y - 3
                );
            });

            y += 6;

            if (
                y >
                doc.internal.pageSize.getHeight() - 22
            ) {
                doc.addPage();
                y = 25;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);

            doc.text(
                `TOTAL GENERAL: ${formatearMoneda(totalVentas)}`,
                ancho - 15,
                y,
                { align: "right" }
            );

            const totalPaginas =
                doc.internal.getNumberOfPages();

            for (
                let pagina = 1;
                pagina <= totalPaginas;
                pagina++
            ) {
                doc.setPage(pagina);

                agregarPiePDF(
                    doc,
                    pagina,
                    totalPaginas
                );
            }

            const fechaArchivo = new Date()
                .toISOString()
                .slice(0, 10);

            doc.save(
                `Variedades_Chiquis_Reporte_${fechaArchivo}.pdf`
            );

            mostrarToast(
                `Reporte PDF generado con ${listaPedidos.length} pedidos.`
            );

        } catch (error) {
            console.error(
                "Error al generar el reporte PDF:",
                error
            );

            mostrarToast(
                "No se pudo generar el reporte. Comprueba tu conexión a Internet y vuelve a intentarlo.",
                "error"
            );
        }
    }
    /* =====================================================
       GUARDAR PEDIDOS
    ===================================================== */

    pedidoForm.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        const id = pedidoId.value ||
            `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

        const existente = pedidos.find(
            pedido => String(pedido.id) === String(id)
        );

        const datos = {
            id,

            numero: existente
                ? existente.numero
                : siguienteNumero(),

            cliente: clienteNombre.value.trim(),

            telefono: clienteTelefono.value.trim(),

            origen: origen.value,

            estado: estado.value,

            fecha: new Date(
                fechaPedido.value
            ).toISOString(),

            productos: leerProductos(),

            notas: notas.value.trim(),

            creado: existente
                ? existente.creado
                : new Date().toISOString(),

            historial: existente
                ? historialDe(existente).slice()
                : []
        };

        registrarEstado(datos, datos.estado);

        if (existente) {
            const indice = pedidos.findIndex(
                pedido => String(pedido.id) === String(id)
            );

            pedidos[indice] = datos;

            mostrarToast(
                "Pedido actualizado correctamente."
            );

        } else {
            pedidos.push(datos);

            mostrarToast(
                "Pedido registrado correctamente."
            );
        }

        guardarPedidos();

        mostrarPedidos();

        cerrarPanel();
    });

    /* =====================================================
       EVENTOS DE PRODUCTOS
    ===================================================== */

    productosLista.addEventListener(
        "input",
        actualizarTotalFormulario
    );

    productosLista.addEventListener("click", function (evento) {
        const boton = evento.target.closest(".remove-product");

        if (!boton) {
            return;
        }

        if (productosLista.children.length === 1) {
            mostrarToast(
                "El pedido necesita al menos un producto.",
                "error"
            );

            return;
        }

        boton.closest(".product-row").remove();

        actualizarTotalFormulario();
    });

    $("btnAgregarProducto").addEventListener(
        "click",
        () => crearFilaProducto()
    );

    /* =====================================================
       EVENTOS DE LA TABLA
    ===================================================== */

    tablaBody.addEventListener("click", function (evento) {
        const boton = evento.target.closest(".btn-accion");

        if (!boton) {
            return;
        }

        const pedido = pedidos.find(
            item => String(item.id) === String(boton.dataset.id)
        );

        if (!pedido) {
            return;
        }

        const accion = boton.dataset.accion;

        if (accion === "ver") {
            abrirDetalle(pedido);
        }

        if (accion === "editar") {
            abrirPanel("editar", pedido);
        }

        if (accion === "pdf") {
            generarPDFPedido(pedido);
        }

        if (accion === "eliminar") {
            pedidoAEliminar = pedido;

            $("dialogNumeroPedido").textContent = pedido.numero;

            dialogEliminar.showModal();
        }
    });

    /* =====================================================
       FILTROS
    ===================================================== */

    document.querySelectorAll(".filter-button").forEach(
        function (boton) {
            boton.addEventListener("click", function () {
                document.querySelectorAll(
                    ".filter-button"
                ).forEach(function (item) {
                    item.classList.remove("active");
                });

                boton.classList.add("active");

                filtroActual = boton.dataset.filter;

                mostrarPedidos();
            });
        }
    );

    /* =====================================================
       BOTONES PRINCIPALES
    ===================================================== */

    [
        $("btnNuevo"),
        $("btnNuevoToolbar"),
        $("btnNuevoVacio"),
        $("btnFloating")
    ].forEach(function (boton) {
        boton.addEventListener(
            "click",
            () => abrirPanel("nuevo")
        );
    });

    $("btnCerrarPanel").addEventListener(
        "click",
        cerrarPanel
    );

    $("btnCancelar").addEventListener(
        "click",
        cerrarPanel
    );

    overlay.addEventListener(
        "click",
        cerrarPanel
    );

    searchInput.addEventListener(
        "input",
        mostrarPedidos
    );

    btnLimpiarBusqueda.addEventListener("click", function () {
        searchInput.value = "";

        mostrarPedidos();

        searchInput.focus();
    });

    /* =====================================================
       AUTOCOMPLETAR CLIENTES EXISTENTES
    ===================================================== */

    clienteNombre.addEventListener("change", function () {
        const nombreBuscado = clienteNombre.value.trim().toLowerCase();

        const clientes = JSON.parse(
            localStorage.getItem("clientesChiquis") || "[]"
        );

        const clienteRegistrado = Array.isArray(clientes)
            ? clientes.find(
                cliente =>
                    String(cliente.nombre || "")
                        .trim()
                        .toLowerCase() === nombreBuscado
            )
            : null;

        if (clienteRegistrado) {
            if (!clienteTelefono.value) {
                clienteTelefono.value =
                    clienteRegistrado.telefono || "";
            }
        }
    });

    /* =====================================================
       DETALLE DEL PEDIDO
    ===================================================== */

    $("btnCerrarDetalle").addEventListener(
        "click",
        () => dialogDetalle.close()
    );

    $("btnEditarDetalle").addEventListener("click", function () {
        if (!pedidoDetalle) {
            return;
        }

        dialogDetalle.close();

        abrirPanel("editar", pedidoDetalle);
    });

    $("btnPDFDetalle").addEventListener("click", function () {
        if (!pedidoDetalle) {
            return;
        }

        generarPDFPedido(pedidoDetalle);
    });

    $("btnAvanzarEstado").addEventListener("click", function () {
        if (!pedidoDetalle) {
            return;
        }

        avanzarEstado(pedidoDetalle);

        dialogDetalle.close();
    });

    /* =====================================================
       ELIMINAR PEDIDOS
    ===================================================== */

    $("btnCancelarEliminar").addEventListener(
        "click",
        () => dialogEliminar.close()
    );

    $("btnConfirmarEliminar").addEventListener(
        "click",
        function () {
            if (!pedidoAEliminar) {
                return;
            }

            const numero = pedidoAEliminar.numero;

            pedidos = pedidos.filter(
                pedido => pedido !== pedidoAEliminar
            );

            pedidoAEliminar = null;

            guardarPedidos();

            mostrarPedidos();

            dialogEliminar.close();

            mostrarToast(`${numero} fue eliminado.`);
        }
    );

    /* =====================================================
       EXPORTAR E IMPORTAR JSON
    ===================================================== */

    function exportarPedidos() {
        if (!pedidos.length) {
            mostrarToast(
                "No hay pedidos para exportar.",
                "error"
            );

            return;
        }

        const archivo = new Blob(
            [JSON.stringify(pedidos, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(archivo);

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = "pedidos-variedades-chiquis.json";

        document.body.appendChild(enlace);

        enlace.click();

        enlace.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        mostrarToast(
            "Pedidos exportados correctamente."
        );
    }

    function abrirImportador() {
        inputImportar.click();
    }

    $("btnExportar").addEventListener(
        "click",
        exportarPedidos
    );

    $("btnExportarNav").addEventListener(
        "click",
        exportarPedidos
    );

    $("btnImportarNav").addEventListener(
        "click",
        abrirImportador
    );

    inputImportar.addEventListener("change", function () {
        const archivo = inputImportar.files[0];

        if (!archivo) {
            return;
        }

        const lector = new FileReader();

        lector.onload = function (evento) {
            try {
                const datos = JSON.parse(
                    evento.target.result
                );

                if (!Array.isArray(datos)) {
                    throw new Error(
                        "El archivo debe contener una lista de pedidos."
                    );
                }

                pedidos = datos.filter(function (pedido) {
                    return pedido &&
                        pedido.cliente &&
                        Array.isArray(pedido.productos);
                });

                guardarPedidos();

                mostrarPedidos();

                mostrarToast(
                    `${pedidos.length} pedidos importados.`
                );

            } catch (error) {
                console.error(error);

                mostrarToast(
                    "No se pudo importar el archivo.",
                    "error"
                );
            }
        };

        lector.readAsText(archivo);

        inputImportar.value = "";
    });

    /* =====================================================
       GENERACIÓN DE REPORTES PDF
    ===================================================== */

    $("btnPDFTodos").addEventListener("click", function () {
        generarPDFGeneral(
            pedidos,
            "Reporte general de pedidos"
        );
    });

    $("btnPDFFiltrados").addEventListener("click", function () {
        const filtrados = obtenerPedidosFiltrados();

        const titulo = filtroActual === "todos"
            ? "Reporte de pedidos encontrados"
            : `Pedidos: ${nombreEstado(filtroActual)}`;

        generarPDFGeneral(filtrados, titulo);
    });

    /* =====================================================
       TEMA VISUAL
    ===================================================== */

    function actualizarTema() {
        const oscuro = document.body.classList.contains("dark");

        $("themeIcon").textContent = oscuro ? "☀" : "☾";

        $("btnTemaDesktop").textContent = oscuro ? "☀" : "☾";
    }

    function cambiarTema() {
        document.body.classList.toggle("dark");

        localStorage.setItem(
            "temaChiquis",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );

        actualizarTema();
    }

    if (localStorage.getItem("temaChiquis") === "dark") {
        document.body.classList.add("dark");
    }

    $("btnTema").addEventListener(
        "click",
        cambiarTema
    );

    $("btnTemaDesktop").addEventListener(
        "click",
        cambiarTema
    );

    $("btnMenu").addEventListener("click", function () {
        $("sidebar").classList.toggle("open");
    });

    $("btnNavEstadisticas").addEventListener(
        "click",
        function () {
            $("estadisticas").scrollIntoView({
                behavior: "smooth"
            });
        }
    );

    /* =====================================================
       ATAJOS DE TECLADO
    ===================================================== */

    document.addEventListener("keydown", function (evento) {
        if (
            evento.ctrlKey &&
            evento.key.toLowerCase() === "n"
        ) {
            evento.preventDefault();

            abrirPanel("nuevo");
        }

        if (
            evento.ctrlKey &&
            evento.key.toLowerCase() === "k"
        ) {
            evento.preventDefault();

            searchInput.focus();
        }

        if (
            evento.key === "Escape" &&
            panel.classList.contains("is-open")
        ) {
            cerrarPanel();
        }
    });

    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    cargarClientes();

    actualizarTema();

    mostrarPedidos();

});