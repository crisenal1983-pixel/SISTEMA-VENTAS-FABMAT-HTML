// ESTADO LOCAL DE LA APLICACIÓN
    let state = {
      tasaCambio: 10.50,
      productos: [],
      carrito: [],
      usuarioActual: "Cristian FabMat"
    };

    // ==========================================
    // INICIALIZACIÓN Y PERSISTENCIA DE SESIÓN
    // ==========================================
    document.addEventListener("DOMContentLoaded", () => {
      // 1. Ocultar la interfaz principal por defecto
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.main-wrapper').style.display = 'none';

      // 2. VERIFICAR SI HAY UNA SESIÓN GUARDADA EN EL NAVEGADOR
      const sesionGuardada = localStorage.getItem('fabmat_sesion');
      if (sesionGuardada) {
        state.usuarioActual = JSON.parse(sesionGuardada);
        iniciarInterfazUsuario(); // Salta el login y entra directo al sistema
      }

      // 3. MOTOR DE ARRASTRE PARA VENTANAS (MODALES)
      const modales = document.querySelectorAll('.modal');
      modales.forEach(modal => {
        const header = modal.querySelector('.modal-header');
        const content = modal.querySelector('.modal-content');
        if (!header || !content) return;

        header.style.cursor = 'move';
        let isDragging = false;
        let startX, startY, initialX, initialY;

        modal.addEventListener('hidden.bs.modal', () => {
          content.style.transform = 'translate(0px, 0px)';
          content.dataset.x = 0;
          content.dataset.y = 0;
        });

        header.addEventListener('mousedown', e => {
          if (e.target.classList.contains('btn-close')) return;
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          initialX = parseFloat(content.dataset.x) || 0;
          initialY = parseFloat(content.dataset.y) || 0;
          document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const newX = initialX + dx;
          const newY = initialY + dy;
          content.style.transition = 'none'; 
          content.style.transform = `translate(${newX}px, ${newY}px)`;
          content.dataset.x = newX;
          content.dataset.y = newY;
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
          document.body.style.userSelect = '';
        });
      });
    });

    // Función auxiliar para arrancar la interfaz visual
    function iniciarInterfazUsuario() {
      document.getElementById('login-wrapper').style.display = 'none';
      
      document.querySelector('.sidebar').style.display = ''; 
      document.querySelector('.main-wrapper').style.display = 'block';

      document.getElementById('user-display').innerText = state.usuarioActual.nombre;
      aplicarPermisosSegunRol(state.usuarioActual.rol);
      
      cargarDashboard();
      cargarTipoCambio();
      cargarLicitaciones();
    }

    async function procesarLogin() {
      const user = document.getElementById('login-user').value.trim();
      const pass = document.getElementById('login-pass').value;
      const errorBox = document.getElementById('login-error');
      
      errorBox.style.display = 'none';

      const res = await apiPost('login', { usuario: user, password: pass });

      if (res.success) {
        state.usuarioActual = res.user;
        
        // GUARDAR LA SESIÓN EN EL NAVEGADOR
        localStorage.setItem('fabmat_sesion', JSON.stringify(res.user));
        
        iniciarInterfazUsuario();
        mostrarAlerta(`Bienvenido/a, ${state.usuarioActual.nombre}`, 'success');
      } else {
        errorBox.innerText = res.message;
        errorBox.style.display = 'block';
      }
    }

    function cerrarSesion() {
      state.usuarioActual = null;
      
      // BORRAR LA SESIÓN DEL NAVEGADOR AL SALIR
      localStorage.removeItem('fabmat_sesion');
      
      document.getElementById('form-login').reset();
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.main-wrapper').style.display = 'none';
      document.getElementById('login-wrapper').style.display = 'flex';
    }

    function toggleSpinner(show) {
      document.getElementById('spinner-overlay').style.display = show ? 'flex' : 'none';
    }

    function mostrarAlerta(mensaje, tipo = 'success') {
      const alertBox = document.getElementById('alert-box');
      alertBox.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
          ${mensaje}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
    }

    // ==========================================
    // ARQUITECTURA DE NAVEGACIÓN Y MANEJO DE ESTADO
    // ==========================================
    
    let vistaPendiente = null;
    let elementoPendiente = null;

    function agendarCambioVista(vista, element) {
      if (window.innerWidth < 992) {
        vistaPendiente = vista;
        elementoPendiente = element;
      } else {
        cambiarVista(vista, element);
      }
    }

    document.addEventListener('hidden.bs.offcanvas', function (event) {
      if (event.target.id === 'sidebarOffcanvas' && vistaPendiente !== null) {
        cambiarVista(vistaPendiente, elementoPendiente);
        vistaPendiente = null;
        elementoPendiente = null;
      }
    });

    function ejecutarNavegacion(vista, elemento) {
      cambiarVista(vista, elemento);
      if (window.innerWidth < 992) {
        setTimeout(() => {
          const botonCerrar = document.querySelector('#sidebarOffcanvas .btn-close');
          if (botonCerrar) { botonCerrar.click(); }
        }, 150);
      }
    }

    function cambiarVista(vista, element) {
      try {
        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
        if (element) { element.classList.add('active'); }

        const vistas = ['dashboard', 'productos', 'ventas', 'categorias', 'inventario', 'combos', 'compras', 'clientes', 'proveedores', 'reportes', 'usuarios', 'tipo_cambio', 'cotizaciones', 'licitaciones'];
        
        vistas.forEach(v => {
          const div = document.getElementById(`vista-${v}`);
          if (div) div.style.display = 'none';
        });

        const titulos = {
          'dashboard': 'Dashboard', 'categorias': 'Categorías', 'productos': 'Productos',
          'inventario': 'Inventario', 'ventas': 'Ventas', 'combos': 'Combos de productos',
          'compras': 'Compras y Abastecimiento', 'clientes': 'Clientes', 'proveedores': 'Proveedores',
          'reportes': 'Reportes y Ganancias', 'usuarios': 'Usuarios y Roles', 
          'tipo_cambio': 'Tipo de Cambio USD/BOB', 'cotizaciones': 'Cotizaciones',
          'licitaciones': 'Licitaciones'
        };

        const tituloElemento = document.getElementById('seccion-titulo');
        if (tituloElemento && titulos[vista]) { tituloElemento.innerText = titulos[vista]; }

        const vistaActiva = document.getElementById(`vista-${vista}`);
        if (vistaActiva) vistaActiva.style.display = 'block';

        if (vista === 'dashboard') { cargarDashboard(); } 
        else if (vista === 'productos') { cargarProductos(); } 
        else if (vista === 'ventas') { prepararPOS(); } 
        else if (vista === 'combos') { cargarCombos(); } 
        else if (vista === 'reportes') { cargarReportes(); } 
        else if (vista === 'tipo_cambio') { cargarTipoCambioHistorial(); } 
        else if (vista === 'usuarios') { cargarUsuarios(); } 
        else if (vista === 'categorias') { cargarCategorias(); } 
        else if (vista === 'inventario') { cargarInventario(); } 
        else if (vista === 'clientes') { cargarClientes(); } 
        else if (vista === 'proveedores') { cargarProveedores(); } 
        else if (vista === 'compras') { cargarCompras(); } 
        else if (vista === 'cotizaciones') { cargarProformas(); }
        else if (vista === 'licitaciones') { cargarLicitaciones(); } 
      } catch (error) {
        console.error("Error al cargar la vista:", error);
      }
    }

    function ejecutarMenuMovil(vista, elemento) {
      if (window.innerWidth < 992) {
        const btnCerrar = document.querySelector('.offcanvas-header .btn-close');
        if (btnCerrar) {
          btnCerrar.click(); 
        }
        setTimeout(() => {
          cambiarVista(vista, elemento);
        }, 300);
      } else {
        cambiarVista(vista, elemento);
      }
    }

    // CONSUMO DE API (FETCH) OPTIMIZADO PARA APPS SCRIPT
    async function apiGet(action, params = null) {
      toggleSpinner(true);
      try {
        let url = `${API_URL}?action=${action}`;
        if (params) {
          for (let key in params) { url += `&${key}=${params[key]}`; }
        }
        const res = await fetch(url, { method: "GET", redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error("Error en GET:", err);
        mostrarAlerta("Error de conexión con el servidor. Reintente.", "danger");
        return { success: false, message: err.message };
      } finally {
        toggleSpinner(false);
      }
    }

    async function apiPost(action, payload) {
      toggleSpinner(true);
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({ action: action, payload: payload })
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error("Error en POST:", err);
        mostrarAlerta("Error de red. Verifique su conexión y reintente.", "danger");
        return { success: false, message: err.message };
      } finally {
        toggleSpinner(false);
      }
    }

    // LÓGICA DE NEGOCIO
    async function cargarTipoCambio() {
      const res = await apiGet('getTipoCambio');
      if (res && res.success && !isNaN(parseFloat(res.tasa))) {
        state.tasaCambio = parseFloat(res.tasa);
      } else {
        state.tasaCambio = state.tasaCambio || 10.50;
      }
      const tcDisplay = document.getElementById('tc-display');
      if (tcDisplay) tcDisplay.innerText = state.tasaCambio.toFixed(4);
    }

    function calcularPrecios(tipo, monedaOrigen = 'usd') {
      if (tipo === 'compra') {
        if (monedaOrigen === 'usd') {
          const usd = parseFloat(document.getElementById('prod-compra-usd').value) || 0;
          document.getElementById('prod-compra-bob').value = (usd * state.tasaCambio).toFixed(2);
        } else {
          const bob = parseFloat(document.getElementById('prod-compra-bob').value) || 0;
          document.getElementById('prod-compra-usd').value = (bob / state.tasaCambio).toFixed(2);
        }
      } else if (tipo === 'venta') {
        if (monedaOrigen === 'usd') {
          const usd = parseFloat(document.getElementById('prod-venta-usd').value) || 0;
          document.getElementById('prod-venta-bob').value = (usd * state.tasaCambio).toFixed(2);
        } else {
          const bob = parseFloat(document.getElementById('prod-venta-bob').value) || 0;
          document.getElementById('prod-venta-usd').value = (bob / state.tasaCambio).toFixed(2);
        }
      }
      calcularGananciaProducto();
    }

    function calcularGananciaProducto() {
      const compraUsd = parseFloat(document.getElementById('prod-compra-usd')?.value) || 0;
      const compraBob = parseFloat(document.getElementById('prod-compra-bob')?.value) || 0;
      const ventaUsd = parseFloat(document.getElementById('prod-venta-usd')?.value) || 0;
      const ventaBob = parseFloat(document.getElementById('prod-venta-bob')?.value) || 0;

      const gananciaUsd = ventaUsd - compraUsd;
      const gananciaBob = ventaBob - compraBob;
      const margen = ventaBob > 0 ? (gananciaBob / ventaBob) * 100 : 0;

      const elGanUsd = document.getElementById('prod-ganancia-usd');
      const elGanBob = document.getElementById('prod-ganancia-bob');
      const elMargen = document.getElementById('prod-ganancia-margen');

      if (elGanUsd && elGanBob) {
        elGanUsd.value = gananciaUsd.toFixed(2);
        elGanBob.value = gananciaBob.toFixed(2);

        const colorTexto = gananciaBob > 0 ? 'text-success' : (gananciaBob < 0 ? 'text-danger' : 'text-dark');
        elGanUsd.className = `form-control bg-light fw-bold ${colorTexto}`;
        elGanBob.className = `form-control bg-light fw-bold ${colorTexto}`;
      }

      if (elMargen) {
        elMargen.innerText = `Margen: ${margen.toFixed(2)}%`;
        elMargen.className = `badge ${gananciaBob > 0 ? 'bg-success' : (gananciaBob < 0 ? 'bg-danger' : 'bg-secondary')}`;
      }
    }

    let chartVentas7Dias = null;
    
    async function cargarDashboard() {
      const res = await apiGet('getDashboardData');
      if (res.success) {
        const d = res.data;
        
        // 1. Tarjetas Superiores
        document.getElementById('dash-ventas-hoy').innerText = d.ventasHoyMonto;
        document.getElementById('dash-ventas-count').innerText = d.ventasHoyTransacciones;
        document.getElementById('dash-stock-critico').innerText = d.stockCriticoCount;
        document.getElementById('dash-cli-nuevos').innerText = d.clientesNuevos;

        if (d.productoTop) {
          document.getElementById('dash-top-prod-nombre').innerText = d.productoTop.nombre;
          document.getElementById('dash-top-prod-nombre').title = d.productoTop.nombre;
          document.getElementById('dash-top-prod-cant').innerText = d.productoTop.cant + ' unid. vendidas';
        } else {
          document.getElementById('dash-top-prod-nombre').innerText = 'Sin datos';
          document.getElementById('dash-top-prod-cant').innerText = '0 unid. vendidas';
        }

        // 2. Gráfico de Líneas (Chart.js)
        if (chartVentas7Dias) chartVentas7Dias.destroy();
        const ctx = document.getElementById('chartVentas').getContext('2d');
        chartVentas7Dias = new Chart(ctx, {
          type: 'line',
          data: {
            labels: d.chartLabels,
            datasets: [{
              label: 'Ingresos (Bs)',
              data: d.chartData,
              borderColor: '#c81e32',
              backgroundColor: 'rgba(200, 30, 50, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: '#c81e32',
              fill: true,
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
          }
        });

        // 3. Lista de Stock Bajo
        const listBajo = document.getElementById('dash-list-stock-bajo');
        listBajo.innerHTML = '';
        if (d.productosStockBajo.length === 0) {
          listBajo.innerHTML = '<div class="text-muted small mt-2">No hay productos con stock crítico. 🎉</div>';
        } else {
          d.productosStockBajo.forEach(p => {
            listBajo.innerHTML += `
              <div class="d-flex justify-content-between align-items-center small border-bottom py-2">
                <span class="text-truncate text-dark fw-bold" style="max-width:75%;" title="${p.nombre}">${p.nombre}</span>
                <span class="badge bg-danger rounded-pill">${p.stock_actual}</span>
              </div>`;
          });
        }

        // 4. Tabla Top 5 Productos
        const tbody = document.getElementById('dash-top5-body');
        tbody.innerHTML = '';
        if (d.top5.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aún no hay ventas registradas</td></tr>';
        } else {
          d.top5.forEach((t, i) => {
            tbody.innerHTML += `
              <tr>
                <td class="text-muted fw-bold">${i + 1}</td>
                <td><span class="badge bg-light text-dark border">${t.sku}</span></td>
                <td class="fw-bold">${t.nombre}</td>
                <td class="text-end">${t.cant}</td>
                <td class="text-end fw-bold text-dark">Bs ${t.ingreso.toFixed(2)}</td>
              </tr>
            `;
          });
        }
      }
    }

    // ==========================================
    // MÓDULO PRODUCTOS (ACTUALIZADO)
    // ==========================================

    async function cargarProductos() {
      if(!state.categorias || state.categorias.length === 0) {
         const resCat = await apiGet('getCategorias');
         if(resCat.success) state.categorias = resCat.data;
      }
      actualizarSelectCategorias();

      const res = await apiGet('getProductos');
      if (res.success) {
        state.productos = res.data;
        renderTablaProductos(state.productos);
      }
    }

    function actualizarSelectCategorias() {
      const select = document.getElementById('prod-cat');
      if(!select) return;
      
      select.innerHTML = '<option value="">Selecciona una categoría</option>';
      if(state.categorias) {
          state.categorias.forEach(c => {
             if(c.estado === 'Activa') {
                 select.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`;
             }
          });
      }
    }

    function renderTablaProductos(lista) {
      const tbody = document.getElementById('tabla-productos-body');
      tbody.innerHTML = '';
      
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">No hay productos que coincidan con la búsqueda</td></tr>';
        return;
      }

      lista.forEach(p => {
        const imgHtml = p.imagen && p.imagen.length > 50 
          ? `<img src="${p.imagen}" class="border rounded shadow-sm" style="width: 45px; height: 45px; object-fit: cover;">`
          : `<div class="bg-light border rounded d-flex align-items-center justify-content-center text-muted" style="width: 45px; height: 45px;"><i class="fa fa-image"></i></div>`;
        
        tbody.innerHTML += `
          <tr>
            <td>${imgHtml}</td>
            <td class="fw-bold text-dark small">${p.codigo_sku}</td>
            <td class="fw-bold text-dark">${p.nombre}</td>
            <td class="text-muted small">${p.categoria}</td>
            <td class="text-muted small">$ ${Number(p.precio_compra_usd).toFixed(2)}</td>
            <td class="text-muted small">Bs ${Number(p.precio_compra_bob).toFixed(2)}</td>
            <td class="text-muted small">$ ${Number(p.precio_venta_usd).toFixed(2)}</td>
            <td class="fw-bold text-dark small">Bs ${Number(p.precio_venta_bob).toFixed(2)}</td>
            <td><span class="badge ${p.stock_actual <= p.stock_minimo ? 'bg-danger' : 'bg-success'}">${p.stock_actual}</span></td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" onclick="prepararEditarProducto('${p.codigo_sku}')"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarFilaProducto('${p.codigo_sku}')"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    function filtrarTablaProductos() {
      const filtro = document.getElementById('buscar-prod').value.toLowerCase();
      if (!state.productos) return;
      
      const listaFiltrada = state.productos.filter(p => 
        p.nombre.toLowerCase().includes(filtro) || 
        p.codigo_sku.toLowerCase().includes(filtro)
      );
      renderTablaProductos(listaFiltrada);
    }

    function previsualizarImagen(input) {
      const file = input.files[0];
      if (!file) return resetPreview();
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300;
          let width = img.width; let height = img.height;
          
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          document.getElementById('prod-preview-img').src = dataUrl;
          document.getElementById('prod-preview-img').style.display = 'block';
          document.getElementById('preview-icon').style.display = 'none';
          document.getElementById('prod-imagen-base64').value = dataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function resetPreview() {
      document.getElementById('prod-imagen').value = '';
      document.getElementById('prod-preview-img').style.display = 'none';
      document.getElementById('preview-icon').style.display = 'block';
      document.getElementById('prod-imagen-base64').value = '';
    }

    document.addEventListener('DOMContentLoaded', () => {
      const modalProd = document.getElementById('modalProducto');
      if(modalProd) {
        modalProd.addEventListener('show.bs.modal', function () {
          document.getElementById('modal-tc-display').innerText = state.tasaCambio.toFixed(4);
        });
      }
    });

    function prepararNuevoProducto() {
      document.getElementById('form-producto').reset();
      resetPreview();
      document.getElementById('prod-is-edit').value = "false";
      document.getElementById('prod-sku').readOnly = false;
      document.getElementById('prod-stock').readOnly = false;
      document.getElementById('prod-marca').value = ''; 
      document.getElementById('prod-procedencia').value = ''; 
      document.querySelector('#modalProducto .modal-title').innerText = 'Nuevo producto';
      
      let nextId = (state.productos ? state.productos.length : 0) + 1;
      document.getElementById('prod-sku').value = `PROD-${String(nextId).padStart(4, '0')}`;
      
      calcularGananciaProducto();
      new bootstrap.Modal(document.getElementById('modalProducto')).show();
    }

    function prepararEditarProducto(sku) {
      const prod = state.productos.find(p => p.codigo_sku === sku);
      if (!prod) return;
      
      document.getElementById('form-producto').reset();
      resetPreview();
      document.getElementById('prod-is-edit').value = "true";
      
      document.getElementById('prod-sku').value = prod.codigo_sku;
      document.getElementById('prod-sku').readOnly = true; 
      document.getElementById('prod-stock').value = prod.stock_actual;
      document.getElementById('prod-stock').readOnly = true; 
      
      document.getElementById('prod-cat').value = prod.categoria;
      document.getElementById('prod-nombre').value = prod.nombre;
      document.getElementById('prod-desc').value = prod.descripcion || '';
      document.getElementById('prod-marca').value = prod.marca || ''; 
      document.getElementById('prod-procedencia').value = prod.procedencia || ''; 
      document.getElementById('prod-compra-usd').value = prod.precio_compra_usd;
      document.getElementById('prod-compra-bob').value = prod.precio_compra_bob;
      document.getElementById('prod-venta-usd').value = prod.precio_venta_usd;
      document.getElementById('prod-venta-bob').value = prod.precio_venta_bob;
      document.getElementById('prod-stock-min').value = prod.stock_minimo;

      if (prod.imagen && prod.imagen.length > 50) {
        document.getElementById('prod-preview-img').src = prod.imagen;
        document.getElementById('prod-preview-img').style.display = 'block';
        document.getElementById('preview-icon').style.display = 'none';
        document.getElementById('prod-imagen-base64').value = prod.imagen;
      }
      
      calcularGananciaProducto();
      document.querySelector('#modalProducto .modal-title').innerText = 'Editar producto';
      new bootstrap.Modal(document.getElementById('modalProducto')).show();
    }

    async function eliminarFilaProducto(sku) {
      if (!confirm(`¿Estás seguro de que deseas eliminar el producto ${sku}? Esta acción es irreversible.`)) return;
      const res = await apiPost('eliminarProducto', { sku: sku });
      if (res.success) {
        mostrarAlerta(res.message, 'success');
        cargarProductos();
      } else {
        mostrarAlerta(res.message, 'danger');
      }
    }

    async function guardarProducto() {
      const payload = {
        codigo_sku: document.getElementById('prod-sku').value,
        categoria: document.getElementById('prod-cat').value,
        nombre: document.getElementById('prod-nombre').value,
        descripcion: document.getElementById('prod-desc').value, 
        marca: document.getElementById('prod-marca').value.trim(), 
        procedencia: document.getElementById('prod-procedencia').value.trim(),
        precio_compra_usd: document.getElementById('prod-compra-usd').value,
        precio_compra_bob: document.getElementById('prod-compra-bob').value,
        precio_venta_usd: document.getElementById('prod-venta-usd').value,
        precio_venta_bob: document.getElementById('prod-venta-bob').value,
        stock_inicial: document.getElementById('prod-stock').value,
        stock_minimo: document.getElementById('prod-stock-min').value,
        imagen: document.getElementById('prod-imagen-base64').value
      };

      if(!payload.categoria || !payload.nombre) {
         mostrarAlerta("Por favor, selecciona una categoría y asigna un nombre.", "warning");
         return;
      }

      const isEdit = document.getElementById('prod-is-edit').value === "true";
      const accion = isEdit ? 'actualizarProducto' : 'guardarProducto';

      const res = await apiPost(accion, payload);
      if (res.success) {
        mostrarAlerta(res.message);
        bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
        document.getElementById('form-producto').reset(); 
        resetPreview();
        cargarProductos();
      } else {
        mostrarAlerta(res.message, 'danger');
      }
    }

    // ==========================================
    // MÓDULO PUNTO DE VENTA (POS) Y RECIBOS
    // ==========================================
    
    let carritoPOS = { productos: [], combos: [] };

    async function prepararPOS() {
      if (state.productos.length === 0) { const r = await apiGet('getProductos'); if(r.success) state.productos = r.data; }
      if (!state.combos) { const c = await apiGet('getCombos'); if(c.success) state.combos = c.data; }
      if (!state.clientes) { const cl = await apiGet('getClientes'); if(cl.success) state.clientes = cl.data; }

      const selCli = document.getElementById('pos-cliente');
      selCli.innerHTML = '<option value="Cliente Genérico - 0000000">Cliente Genérico — 0000000</option>';
      if (state.clientes) {
        state.clientes.forEach(c => {
          if(c.estado === 'Activo') selCli.innerHTML += `<option value="${c.nombre} ${c.apellido||''} - ${c.nit_ci||''}">${c.nombre} ${c.apellido||''} — ${c.nit_ci||''}</option>`;
        });
      }

      renderizarCatalogoPOS();
      actualizarTicketPOS();
    }

    function renderizarCatalogoPOS() {
      const lstProd = document.getElementById('pos-lista-productos');
      lstProd.innerHTML = '';
      state.productos.forEach(p => {
        if(p.estado === 'Activo') {
          lstProd.innerHTML += `
            <div class="item-row d-flex justify-content-between align-items-center">
              <div style="width: 50%;">
                <div class="fw-bold small text-dark">${p.nombre}</div>
                <div style="font-size: 10px; color: #a0a0a0;">${p.codigo_sku} - ${p.categoria}</div>
              </div>
              <div class="small fw-bold">Bs ${Number(p.precio_venta_bob).toFixed(2)}</div>
              <div><span class="badge ${p.stock_actual <= p.stock_minimo ? 'bg-danger' : 'bg-success'}">${p.stock_actual}</span></div>
              <button class="btn btn-sm btn-danger rounded-circle" onclick="agregarItemPOS('producto', '${p.codigo_sku}')" ${p.stock_actual <= 0 ? 'disabled' : ''}><i class="fa fa-plus"></i></button>
            </div>
          `;
        }
      });

      const lstCombo = document.getElementById('pos-lista-combos');
      lstCombo.innerHTML = '';
      if(state.combos) {
        state.combos.forEach(c => {
          if(c.estado === 'Activo') {
            lstCombo.innerHTML += `
              <div class="item-row d-flex justify-content-between align-items-center">
                <div style="width: 60%;">
                  <div class="fw-bold small text-dark">${c.nombre}</div>
                  <div style="font-size: 10px; color: #a0a0a0;">${c.codigo_combo}</div>
                </div>
                <div class="small fw-bold text-danger">Bs ${Number(c.precio_venta_bob).toFixed(2)}</div>
                <button class="btn btn-sm btn-danger rounded-circle" onclick="agregarItemPOS('combo', '${c.codigo_combo}')"><i class="fa fa-plus"></i></button>
              </div>
            `;
          }
        });
      }
    }

    function agregarItemPOS(tipo, codigo) {
      let origen = tipo === 'producto' ? state.productos : state.combos;
      let skuKey = tipo === 'producto' ? 'codigo_sku' : 'codigo_combo';
      let obj = origen.find(x => x[skuKey] === codigo);
      let arrCarrito = tipo === 'producto' ? carritoPOS.productos : carritoPOS.combos;
      
      let existe = arrCarrito.find(i => i.sku === codigo);
      if (existe) {
        if(tipo === 'producto' && existe.cantidad + 1 > obj.stock_actual) { mostrarAlerta("Stock insuficiente", "warning"); return; }
        existe.cantidad++;
      } else {
        arrCarrito.push({
          sku: codigo, tipo: tipo, nombre: obj.nombre, cantidad: 1, maxStock: tipo==='producto'?obj.stock_actual:999,
          precio_unitario: Number(obj.precio_venta_bob)
        });
      }
      actualizarTicketPOS();
    }

    function actualizarCantPOS(tipo, index, val) {
      let cant = Number(val);
      let item = tipo === 'producto' ? carritoPOS.productos[index] : carritoPOS.combos[index];
      if (cant <= 0) cant = 1;
      if (tipo === 'producto' && cant > item.maxStock) cant = item.maxStock;
      item.cantidad = cant;
      actualizarTicketPOS();
    }

    function actualizarTicketPOS() {
      const divProd = document.getElementById('pos-cart-productos');
      let subProd = 0; divProd.innerHTML = '';
      carritoPOS.productos.forEach((i, idx) => {
        let st = i.cantidad * i.precio_unitario; subProd += st;
        divProd.innerHTML += `
          <div class="d-flex justify-content-between align-items-center mb-2 small">
            <div style="width: 40%;"><span class="fw-bold d-block text-truncate" title="${i.nombre}">${i.nombre}</span><span class="text-muted" style="font-size:10px;">${i.sku}</span></div>
            <input type="number" class="form-control form-control-sm pos-item-qty" value="${i.cantidad}" onchange="actualizarCantPOS('producto', ${idx}, this.value)">
            <div>Bs ${i.precio_unitario.toFixed(2)}</div>
            <div class="fw-bold">Bs ${st.toFixed(2)}</div>
            <button class="btn btn-sm text-danger p-0 m-0" onclick="carritoPOS.productos.splice(${idx}, 1); actualizarTicketPOS();"><i class="fa fa-times-circle fs-5"></i></button>
          </div>
        `;
      });
      let descProdPerc = Number(document.getElementById('pos-desc-prod-perc').value) || 0;
      let descProdAmt = subProd * (descProdPerc / 100);
      divProd.innerHTML += `<div class="text-end small text-muted border-top pt-1">Subtotal: Bs ${subProd.toFixed(2)} | Desc: -Bs ${descProdAmt.toFixed(2)} | <b>Total: Bs ${(subProd - descProdAmt).toFixed(2)}</b></div>`;

      const divCombo = document.getElementById('pos-cart-combos');
      let subCombo = 0; divCombo.innerHTML = '';
      carritoPOS.combos.forEach((i, idx) => {
        let st = i.cantidad * i.precio_unitario; subCombo += st;
        divCombo.innerHTML += `
          <div class="d-flex justify-content-between align-items-center mb-2 small">
            <div style="width: 40%;"><span class="fw-bold d-block text-truncate" title="${i.nombre}">${i.nombre} <span class="badge bg-danger" style="font-size:8px;">COMBO</span></span></div>
            <input type="number" class="form-control form-control-sm pos-item-qty" value="${i.cantidad}" onchange="actualizarCantPOS('combo', ${idx}, this.value)">
            <div>Bs ${i.precio_unitario.toFixed(2)}</div>
            <div class="fw-bold">Bs ${st.toFixed(2)}</div>
            <button class="btn btn-sm text-danger p-0 m-0" onclick="carritoPOS.combos.splice(${idx}, 1); actualizarTicketPOS();"><i class="fa fa-times-circle fs-5"></i></button>
          </div>
        `;
      });
      let descComboPerc = Number(document.getElementById('pos-desc-combo-perc').value) || 0;
      let descComboAmt = subCombo * (descComboPerc / 100);
      divCombo.innerHTML += `<div class="text-end small text-muted border-top pt-1">Subtotal: Bs ${subCombo.toFixed(2)} | Desc: -Bs ${descComboAmt.toFixed(2)} | <b>Total: Bs ${(subCombo - descComboAmt).toFixed(2)}</b></div>`;

      let subtotalGeneral = subProd + subCombo;
      let descItemTotal = descProdAmt + descComboAmt;
      let subtotalPostItems = subtotalGeneral - descItemTotal;
      
      let descGlobalPerc = Number(document.getElementById('pos-desc-global-perc').value) || 0;
      let descGlobalAmt = subtotalPostItems * (descGlobalPerc / 100);
      
      let descuentoTotal = descItemTotal + descGlobalAmt;
      let totalPagar = subtotalGeneral - descuentoTotal;

      document.getElementById('pos-res-subtotal').innerText = `Bs ${subtotalGeneral.toFixed(2)}`;
      document.getElementById('pos-res-descuento').innerText = `- Bs ${descuentoTotal.toFixed(2)}`;
      document.getElementById('pos-res-total').innerText = `Bs ${totalPagar.toFixed(2)}`;
    }

    async function confirmarVenta() {
      let todosItems = [];
      carritoPOS.productos.forEach(i => todosItems.push({...i, subtotal: i.cantidad * i.precio_unitario}));
      carritoPOS.combos.forEach(i => todosItems.push({...i, subtotal: i.cantidad * i.precio_unitario}));

      if (todosItems.length === 0) { mostrarAlerta("Agregue productos o combos a la venta", "warning"); return; }

      let subProd = carritoPOS.productos.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);
      let subCombo = carritoPOS.combos.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0);
      
      let descItemTotal = (subProd * (Number(document.getElementById('pos-desc-prod-perc').value)||0)/100) + (subCombo * (Number(document.getElementById('pos-desc-combo-perc').value)||0)/100);
      let subtotalPostItems = (subProd + subCombo) - descItemTotal;
      let descGlobalPerc = Number(document.getElementById('pos-desc-global-perc').value) || 0;
      let descGlobalAmt = subtotalPostItems * (descGlobalPerc / 100);
      
      let descTotal = descItemTotal + descGlobalAmt;
      let totalPagar = (subProd + subCombo) - descTotal;

      const payload = {
        cliente: document.getElementById('pos-cliente').value,
        vendedor: state.usuarioActual.nombre,
        moneda: "BOB", tasa_cambio: state.tasaCambio,
        subtotal: subProd + subCombo, descuento: descTotal, total: totalPagar,
        observacion: document.getElementById('pos-observacion').value,
        items: todosItems
      };

      const res = await apiPost('registrarVenta', payload);
      
      if (res.success) {
        document.getElementById('ve-codigo').innerText = `Ticket: ${res.codigoVenta}`;
        document.getElementById('ve-btn-imprimir').onclick = () => imprimirTicket(res.codigoVenta, payload);
        new bootstrap.Modal(document.getElementById('modalVentaExitosa')).show();

        carritoPOS = { productos: [], combos: [] };
        document.getElementById('pos-desc-prod-perc').value = 0;
        document.getElementById('pos-desc-combo-perc').value = 0;
        document.getElementById('pos-desc-global-perc').value = 0; 
        document.getElementById('pos-observacion').value = '';
        actualizarTicketPOS();
        
        apiGet('getProductos').then(r => { if(r.success) state.productos = r.data; prepararPOS(); });
      } else {
        mostrarAlerta(res.message, "danger");
        
        if (res.action === 'RELOAD') {
          carritoPOS = { productos: [], combos: [] };
          actualizarTicketPOS();
          document.getElementById('pos-buscar').value = ''; 
          
          const [resProd, resCombo] = await Promise.all([apiGet('getProductos'), apiGet('getCombos')]);
          if(resProd.success) state.productos = resProd.data;
          if(resCombo.success) state.combos = resCombo.data;
          
          renderizarCatalogoPOS();
        }
      }
    }

    function imprimirTicket(codigo, datos) {
      const logoURL = new URL('logo.png', window.location.href).href; 

      let html = `
        <div style="font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; font-size: 13px;">
          <div style="text-align: center; margin-bottom: 10px;">
            <img src="${logoURL}" style="max-width: 160px; height: auto; filter: grayscale(100%) contrast(120%);">
          </div>
          <p style="text-align: center; margin-top: 5px; font-size: 11px;">Venta de Material en General, tecnologia, material de escritorio, material de limpieza, Insumos Medicos, Equipos Medicos para Entidades Públicas y Particulares</p>
          <hr style="border-top: 1px dashed #000;">
          <p style="margin: 5px 0;"><b>Ticket:</b> ${codigo}<br>
          <b>Fecha:</b> ${new Date().toLocaleString('es-BO')}<br>
          <b>Cliente:</b> ${datos.cliente.split(' - ')[0]}<br>
          <b>Vendedor:</b> ${datos.vendedor}</p>
          <hr style="border-top: 1px dashed #000;">
          <table style="width: 100%; text-align: left; font-size: 12px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #000;">
              <th style="padding-bottom: 3px;">Cant</th>
              <th style="padding-bottom: 3px;">Descripción</th>
              <th style="text-align: right; padding-bottom: 3px;">Subt</th>
            </tr>`;
      
      datos.items.forEach(i => {
        html += `<tr><td style="padding-top:3px; vertical-align: top;">${i.cantidad}</td><td style="padding-top:3px;">${i.nombre.substring(0, 20)}</td><td style="text-align: right; padding-top:3px;">${i.subtotal.toFixed(2)}</td></tr>`;
      });

      html += `
          </table>
          <hr style="border-top: 1px dashed #000;">
          <p style="text-align: right; margin: 2px 0;">Subtotal: Bs. ${datos.subtotal.toFixed(2)}</p>
          <p style="text-align: right; margin: 2px 0;">Descuento: -Bs. ${datos.descuento.toFixed(2)}</p>
          <h3 style="text-align: right; margin: 5px 0;">TOTAL: Bs. ${datos.total.toFixed(2)}</h3>
          <p style="text-align: center; margin-top: 20px; font-weight: bold;">¡Gracias por su compra!</p>
        </div>
      `;

      let iframe = document.getElementById('iframe-impresion');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'iframe-impresion';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write('<html><head><title>Ticket FabMat</title></head><body>' + html + '</body></html>');
      doc.close();
      
      setTimeout(() => { 
        iframe.contentWindow.focus();
        iframe.contentWindow.print(); 
      }, 1500);
    }
    
    async function cargarHistorialVentas() {
      const res = await apiGet('getHistorialVentas');
      if(res.success) {
        state.historialVentas = res.data;
        renderHistorialVentas(res.data);
      }
    }

    function renderHistorialVentas(lista) {
      const tbody = document.getElementById('tabla-historial-ventas-body');
      tbody.innerHTML = '';
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay ventas registradas</td></tr>';
        return;
      }
      
      lista.forEach(v => {
        const fechaFormat = new Date(v.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
        tbody.innerHTML += `
          <tr>
            <td class="fw-bold text-dark">${v.codigo_venta}</td>
            <td class="text-muted small">${fechaFormat}</td>
            <td>${v.cliente.split(' - ')[0]}</td>
            <td class="text-muted small">${v.vendedor}</td>
            <td class="fw-bold text-danger">Bs ${Number(v.total).toFixed(2)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" onclick="reimprimirTicket('${v.codigo_venta}')">
                <i class="fa fa-print"></i> Imprimir
              </button>
            </td>
          </tr>
        `;
      });
    }

    function reimprimirTicket(codigo) {
      const venta = state.historialVentas.find(v => v.codigo_venta === codigo);
      if(!venta) return;
      
      const datos = {
        cliente: venta.cliente,
        vendedor: venta.vendedor,
        subtotal: Number(venta.subtotal),
        descuento: Number(venta.descuento),
        total: Number(venta.total),
        items: venta.items
      };
      
      imprimirTicket(codigo, datos);
    }

    // ==========================================
    // MÓDULO CATEGORÍAS
    // ==========================================
    
    async function cargarCategorias() {
      const res = await apiGet('getCategorias');
      if (res.success) {
        state.categorias = res.data;
        renderTablaCategorias(state.categorias);
      }
    }

    function renderTablaCategorias(lista) {
      const tbody = document.getElementById('tabla-categorias-body');
      tbody.innerHTML = '';
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay categorías registradas</td></tr>';
        return;
      }
      lista.forEach(c => {
        const estadoBadge = c.estado === 'Activa' 
            ? '<span class="badge bg-success">Activa</span>' 
            : '<span class="badge bg-secondary">Inactiva</span>';

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${c.nombre}</td>
            <td class="text-muted small">${c.descripcion}</td>
            <td>${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" onclick="prepararEditarCategoria('${c.id}')"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarFilaCategoria('${c.id}')"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    function prepararNuevaCategoria() {
      document.getElementById('form-categoria').reset();
      document.getElementById('cat-id').value = '';
      document.querySelector('#modalCategoria .modal-title').innerText = 'Nueva categoría';
      new bootstrap.Modal(document.getElementById('modalCategoria')).show();
    }

    function prepararEditarCategoria(id) {
      const cat = state.categorias.find(c => String(c.id) === String(id));
      if (!cat) return;
      
      document.getElementById('cat-id').value = cat.id;
      document.getElementById('cat-nombre').value = cat.nombre;
      document.getElementById('cat-desc').value = cat.descripcion;
      document.getElementById('cat-estado').checked = (cat.estado === 'Activa');
      
      document.querySelector('#modalCategoria .modal-title').innerText = 'Editar categoría';
      new bootstrap.Modal(document.getElementById('modalCategoria')).show();
    }

    async function eliminarFilaCategoria(id) {
      if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
      const res = await apiPost('eliminarCategoria', { id: id });
      if (res.success) {
        mostrarAlerta(res.message, 'success');
        cargarCategorias();
      } else {
        mostrarAlerta(res.message, 'danger');
      }
    }

    async function guardarCategoria() {
      const id = document.getElementById('cat-id').value;
      const nombre = document.getElementById('cat-nombre').value.trim();
      
      if (!nombre) { mostrarAlerta("El nombre es obligatorio", "warning"); return; }

      const payload = {
        id: id,
        nombre: nombre,
        descripcion: document.getElementById('cat-desc').value.trim(),
        estado: document.getElementById('cat-estado').checked
      };

      const accion = id ? 'actualizarCategoria' : 'guardarCategoria';
      const res = await apiPost(accion, payload);
      
      if (res.success) {
        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalCategoria')).hide();
        cargarCategorias();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO INVENTARIO E HISTORIAL
    // ==========================================
    
    async function cargarInventario() {
      const resStock = await apiGet('getProductos');
      if (resStock.success) {
        state.productos = resStock.data;
        renderTablaInventario(state.productos);
        actualizarKPIsInventario(state.productos);
      }
      
      const resHist = await apiGet('getHistorialInventario');
      if (resHist.success) {
        state.historialInventario = resHist.data.reverse();
        renderTablaHistorial(state.historialInventario);
      }
    }

    function renderTablaInventario(lista) {
      const tbody = document.getElementById('tabla-inventario-body');
      tbody.innerHTML = '';
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay productos registrados</td></tr>';
        return;
      }

      lista.forEach(p => {
        let stockActual = Number(p.stock_actual);
        let stockMin = Number(p.stock_minimo);
        let estadoBadge, estadoClase;
        
        if(stockActual <= 0) {
            estadoBadge = '<span class="badge bg-danger">Sin stock</span>';
            estadoClase = 'text-danger fw-bold fs-5';
        } else if (stockActual <= stockMin) {
            estadoBadge = '<span class="badge bg-warning text-dark">Crítico</span>';
            estadoClase = 'text-warning fw-bold fs-5';
        } else {
            estadoBadge = '<span class="badge bg-success">Normal</span>';
            estadoClase = 'text-success fw-bold fs-5';
        }

        tbody.innerHTML += `
          <tr>
            <td><span class="text-muted small">${p.codigo_sku}</span></td>
            <td class="fw-bold text-dark">${p.nombre}</td>
            <td class="text-muted">${p.categoria}</td>
            <td class="text-center ${estadoClase}">${stockActual}</td>
            <td class="text-center text-muted">${stockMin}</td>
            <td class="text-center">${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" onclick="abrirAjusteRapido('${p.codigo_sku}')">
                <i class="fa fa-edit"></i> Ajustar
              </button>
            </td>
          </tr>
        `;
      });
    }

    function renderTablaHistorial(lista) {
      const tbody = document.getElementById('tabla-historial-body');
      tbody.innerHTML = '';
      if(!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay movimientos registrados</td></tr>';
        return;
      }

      lista.forEach(h => {
        const fechaFormat = new Date(h.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
        const tipoBadge = h.tipo === 'Entrada' 
            ? '<span class="badge bg-success"><i class="fa fa-arrow-down"></i> Entrada</span>'
            : '<span class="badge bg-danger"><i class="fa fa-arrow-up"></i> Salida</span>';

        let btnAccion = '';
        const matchVenta = h.motivo.match(/(VTA-\d+)/);
        if(matchVenta) {
            btnAccion = `<button class="btn btn-sm btn-outline-secondary" onclick="imprimirDesdeInventario('${matchVenta[1]}')" title="Imprimir Recibo"><i class="fa fa-print"></i></button>`;
        }

        tbody.innerHTML += `
          <tr>
            <td class="text-muted small">${fechaFormat}</td>
            <td><span class="fw-bold text-dark d-block text-truncate" style="max-width: 200px;" title="${h.nombre_producto}">${h.nombre_producto}</span><span class="text-muted" style="font-size:10px;">${h.producto_sku}</span></td>
            <td class="text-center">${tipoBadge}</td>
            <td class="text-center fw-bold">${h.cantidad}</td>
            <td class="text-center text-muted">${h.stock_antes}</td>
            <td class="text-center text-dark fw-bold">${h.stock_despues}</td>
            <td class="text-muted small">${h.motivo}</td>
            <td class="text-muted small"><i class="fa fa-user-circle"></i> ${h.usuario}</td>
            <td class="text-end">${btnAccion}</td>
          </tr>
        `;
      });
    }

    async function imprimirDesdeInventario(codigoVenta) {
      if (!state.historialVentas || state.historialVentas.length === 0) {
        const res = await apiGet('getHistorialVentas');
        if(res.success) {
           state.historialVentas = res.data;
        }
      }
      
      const venta = state.historialVentas.find(v => v.codigo_venta === codigoVenta);
      if(!venta) {
          mostrarAlerta('No se encontraron los detalles de esta venta en el historial.', 'warning');
          return;
      }
      
      reimprimirTicket(codigoVenta);
    }

    function filtrarInventario() {
      const filtro = document.getElementById('buscar-inv-stock').value.toLowerCase();
      if (!state.productos) return;
      const filtrados = state.productos.filter(p => p.nombre.toLowerCase().includes(filtro) || p.codigo_sku.toLowerCase().includes(filtro));
      renderTablaInventario(filtrados);
    }

    function filtrarHistorialInv() {
      const filtro = document.getElementById('buscar-inv-historial').value.toLowerCase();
      if (!state.historialInventario) return;
      const filtrados = state.historialInventario.filter(h => h.nombre_producto.toLowerCase().includes(filtro) || h.producto_sku.toLowerCase().includes(filtro) || h.motivo.toLowerCase().includes(filtro));
      renderTablaHistorial(filtrados);
    }

    function actualizarKPIsInventario(lista) {
        let total = lista.length;
        let normal = 0, critico = 0, sinStock = 0;
        lista.forEach(p => {
            let s = Number(p.stock_actual);
            let min = Number(p.stock_minimo);
            if(s <= 0) sinStock++;
            else if(s <= min) critico++;
            else normal++;
        });
        document.getElementById('inv-total').innerText = total;
        document.getElementById('inv-normal').innerText = normal;
        document.getElementById('inv-critico').innerText = critico;
        document.getElementById('inv-sin').innerText = sinStock;
    }

    function prepararModalAjuste() {
        const select = document.getElementById('ajuste-prod');
        select.innerHTML = '<option value="">Selecciona un producto</option>';
        if(state.productos) {
            state.productos.forEach(p => select.innerHTML += `<option value="${p.codigo_sku}">${p.nombre} (${p.codigo_sku})</option>`);
        }
        document.getElementById('ajuste-stock-actual').innerText = '--';
        document.getElementById('form-ajuste-stock').reset();
    }

    function mostrarStockActual() {
        const sku = document.getElementById('ajuste-prod').value;
        const prod = state.productos.find(p => p.codigo_sku === sku);
        document.getElementById('ajuste-stock-actual').innerText = prod ? prod.stock_actual : '--';
    }

    function abrirAjusteRapido(sku) {
        prepararModalAjuste();
        document.getElementById('ajuste-prod').value = sku;
        mostrarStockActual();
        new bootstrap.Modal(document.getElementById('modalAjusteStock')).show();
    }

    async function guardarAjusteStock() {
        const sku = document.getElementById('ajuste-prod').value;
        const tipo = document.getElementById('ajuste-tipo').value;
        const cant = document.getElementById('ajuste-cant').value;
        const motivo = document.getElementById('ajuste-motivo').value.trim();

        if(!sku || !cant || !motivo) { mostrarAlerta("Completa todos los campos obligatorios.", "warning"); return; }

        const payload = { sku: sku, tipo: tipo, cantidad: cant, motivo: motivo, usuario: state.usuarioActual.nombre };

        const res = await apiPost('ajusteManualStock', payload);
        if(res.success) {
            mostrarAlerta(res.message, "success");
            bootstrap.Modal.getInstance(document.getElementById('modalAjusteStock')).hide();
            cargarInventario(); 
        } else {
            mostrarAlerta(res.message, "danger");
        }
    }

    // ==========================================
    // MÓDULO CLIENTES
    // ==========================================
    
    async function cargarClientes() {
      const res = await apiGet('getClientes');
      if (res.success) {
        state.clientes = res.data;
        renderTablaClientes(state.clientes);
      }
    }

    function renderTablaClientes(lista) {
      const tbody = document.getElementById('tabla-clientes-body');
      tbody.innerHTML = '';
      
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay clientes registrados</td></tr>';
        return;
      }

      lista.forEach(c => {
        const estadoBadge = c.estado === 'Activo' 
            ? '<span class="badge bg-success">Activo</span>' 
            : '<span class="badge bg-secondary">Inactivo</span>';
        
        const nombreCompleto = c.apellido ? `${c.nombre} ${c.apellido}` : c.nombre;

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${nombreCompleto}</td>
            <td>${c.nit_ci || '--'}</td>
            <td>${c.telefono || '--'}</td>
            <td>${c.email || '--'}</td>
            <td>${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    async function guardarCliente() {
      const nombre = document.getElementById('cli-nombre').value.trim();
      if (!nombre) {
        mostrarAlerta("El nombre o razón social es obligatorio", "warning");
        return;
      }

      const payload = {
        nombre: nombre,
        apellido: document.getElementById('cli-apellido').value.trim(),
        nit_ci: document.getElementById('cli-nit').value.trim(),
        telefono: document.getElementById('cli-telefono').value.trim(),
        email: document.getElementById('cli-email').value.trim(),
        direccion: document.getElementById('cli-direccion').value.trim(),
        estado: document.getElementById('cli-estado').checked ? 'Activo' : 'Inactivo'
      };

      const res = await apiPost('guardarCliente', payload);
      if (res.success) {
        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
        document.getElementById('form-cliente').reset();
        cargarClientes();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO PROVEEDORES
    // ==========================================
    
    async function cargarProveedores() {
      const res = await apiGet('getProveedores');
      if (res.success) {
        state.proveedores = res.data;
        renderTablaProveedores(state.proveedores);
      }
    }

    function renderTablaProveedores(lista) {
      const tbody = document.getElementById('tabla-proveedores-body');
      tbody.innerHTML = '';
      
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay proveedores registrados</td></tr>';
        return;
      }

      lista.forEach(p => {
        const estadoBadge = p.estado === 'Activo' 
            ? '<span class="badge bg-success">Activo</span>' 
            : '<span class="badge bg-secondary">Inactivo</span>';

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${p.razon_social}</td>
            <td>${p.contacto || '--'}</td>
            <td>${p.telefono || '--'}</td>
            <td>${p.email || '--'}</td>
            <td>${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    async function guardarProveedor() {
      const razon = document.getElementById('prov-razon').value.trim();
      if (!razon) {
        mostrarAlerta("La razón social es obligatoria", "warning");
        return;
      }

      const payload = {
        razon_social: razon,
        nit: document.getElementById('prov-nit').value.trim(),
        contacto: document.getElementById('prov-contacto').value.trim(),
        telefono: document.getElementById('prov-telefono').value.trim(),
        email: document.getElementById('prov-email').value.trim(),
        direccion: document.getElementById('prov-direccion').value.trim(),
        estado: document.getElementById('prov-estado').checked ? 'Activo' : 'Inactivo'
      };

      const res = await apiPost('guardarProveedor', payload);
      if (res.success) {
        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
        document.getElementById('form-proveedor').reset();
        cargarProveedores();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO REPORTES Y GANANCIAS AVANZADO
    // ==========================================
    let repDatosActuales = { agrupado: [], productos: [] };
    let repAgrupacionActiva = 'diaria';

    async function cargarReportes() {
      const hoy = new Date();
      const mesPasado = new Date();
      mesPasado.setDate(hoy.getDate() - 30);
      
      const desdeStr = mesPasado.toISOString().split('T')[0];
      const hastaStr = hoy.toISOString().split('T')[0];

      document.getElementById('rep-desde').value = desdeStr;
      document.getElementById('rep-hasta').value = hastaStr;

      const [resVentas, resCompras, resProds] = await Promise.all([
        apiGet('getHistorialVentas', { desde: desdeStr, hasta: hastaStr }),
        apiGet('getCompras', { desde: desdeStr, hasta: hastaStr }),
        apiGet('getProductos')
      ]);

      if (resVentas.success) state.repVentas = resVentas.data;
      if (resCompras.success) state.repCompras = resCompras.data;
      
      state.repMapaProds = {};
      if (resProds.success) {
        resProds.data.forEach(p => {
          state.repMapaProds[p.nombre] = { sku: p.codigo_sku, cat: p.categoria, costo: Number(p.precio_compra_bob) || 0 };
        });
      }

      procesarReporteGanancias(false);
    }

    function cambiarAgrupacionReporte(btnElement, tipo) {
      document.querySelectorAll('#rep-tabs .nav-link').forEach(btn => {
        btn.classList.remove('active', 'bg-danger', 'text-white');
        btn.classList.add('bg-white', 'text-dark');
      });
      btnElement.classList.add('active', 'bg-danger', 'text-white');
      btnElement.classList.remove('bg-white', 'text-dark');
      
      repAgrupacionActiva = tipo;
      document.getElementById('rep-titulo-agrupacion').innerHTML = `<i class="fa fa-chart-line me-1"></i> Ganancia ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} — (P.Venta - P.Compra) × unidades`;
      
      procesarReporteGanancias();
    }

    async function procesarReporteGanancias(requiereFetch = false) {
      const desde = document.getElementById('rep-desde').value;
      const hasta = document.getElementById('rep-hasta').value;
      
      if(requiereFetch) {
        const [resVentas, resCompras] = await Promise.all([
          apiGet('getHistorialVentas', { desde: desde, hasta: hasta }),
          apiGet('getCompras', { desde: desde, hasta: hasta })
        ]);
        if (resVentas.success) state.repVentas = resVentas.data;
        if (resCompras.success) state.repCompras = resCompras.data;
      }

      if(!state.repVentas || !state.repCompras) return;

      const ventasFiltradas = state.repVentas;
      const comprasFiltradas = state.repCompras;

      // 2. CALCULAR SECCIÓN 1: RESUMEN GENERAL
      const totalIngresoVentas = ventasFiltradas.reduce((sum, v) => sum + Number(v.total), 0);
      const totalCostoCompras = comprasFiltradas.reduce((sum, c) => sum + Number(c.total), 0);
      const gananciaNeta = totalIngresoVentas - totalCostoCompras;
      const margenGen = totalIngresoVentas > 0 ? (gananciaNeta / totalIngresoVentas) * 100 : 0;

      document.getElementById('rep-tot-ven-monto').innerText = `Bs ${totalIngresoVentas.toFixed(2)}`;
      document.getElementById('rep-tot-ven-count').innerText = `${ventasFiltradas.length} transacciones`;
      document.getElementById('rep-tot-com-monto').innerText = `Bs ${totalCostoCompras.toFixed(2)}`;
      document.getElementById('rep-tot-com-count').innerText = `${comprasFiltradas.length} órdenes`;
      
      const elGanancia = document.getElementById('rep-ganancia-neta');
      elGanancia.innerText = `${gananciaNeta >= 0 ? '+' : ''} Bs ${gananciaNeta.toFixed(2)}`;
      elGanancia.className = `fw-bold mb-0 mt-1 ${gananciaNeta >= 0 ? 'text-success' : 'text-danger'}`;
      document.getElementById('rep-margen-gen').innerText = `${margenGen.toFixed(1)}%`;

      // 3. CALCULAR AGRUPACIÓN Y PRODUCTOS
      let mapaAgrupado = {};
      let mapaProductos = {};
      let granIngreso = 0; let granCosto = 0;

      ventasFiltradas.forEach(v => {
        const fechaObj = new Date(v.fecha);
        let keyAgrupacion = '';
        
        if (repAgrupacionActiva === 'diaria') {
          keyAgrupacion = v.fecha.split('T')[0];
        } else if (repAgrupacionActiva === 'mensual') {
          keyAgrupacion = v.fecha.substring(0, 7); 
        } else if (repAgrupacionActiva === 'semanal') {
          const startOfYear = new Date(fechaObj.getFullYear(), 0, 1);
          const pastDaysOfYear = (fechaObj - startOfYear) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
          keyAgrupacion = `Semana ${weekNum} - ${fechaObj.getFullYear()}`;
        }

        if (!mapaAgrupado[keyAgrupacion]) mapaAgrupado[keyAgrupacion] = { ventas: 0, unidades: 0, ingreso: 0, costo: 0 };
        mapaAgrupado[keyAgrupacion].ventas += 1;

        v.items.forEach(item => {
          const qty = Number(item.cantidad);
          const ingresoItem = Number(item.subtotal);
          const costoUnitarioCongelado = Number(item.costo_unitario) || 0;
          const costoItem = costoUnitarioCongelado * qty;
          
          mapaAgrupado[keyAgrupacion].unidades += qty;
          mapaAgrupado[keyAgrupacion].ingreso += ingresoItem;
          mapaAgrupado[keyAgrupacion].costo += costoItem;
          granIngreso += ingresoItem; granCosto += costoItem;

          if (!mapaProductos[item.nombre]) {
            const prodInfo = state.repMapaProds[item.nombre] || { sku: item.sku || 'N/A', cat: 'Histórico' };
            mapaProductos[item.nombre] = { 
              sku: prodInfo.sku, cat: prodInfo.cat, costoUnitario: costoUnitarioCongelado,
              unidades: 0, ingreso: 0, costoTotal: 0 
            };
          }
          mapaProductos[item.nombre].unidades += qty;
          mapaProductos[item.nombre].ingreso += ingresoItem;
          mapaProductos[item.nombre].costoTotal += costoItem;
        });
      });

      repDatosActuales.agrupado = Object.keys(mapaAgrupado).map(k => ({ fecha: k, ...mapaAgrupado[k] })).sort((a,b) => b.fecha.localeCompare(a.fecha));
      repDatosActuales.productos = Object.keys(mapaProductos).map(k => ({ nombre: k, ...mapaProductos[k] })).sort((a,b) => b.ingreso - a.ingreso);

      const granGanancia = granIngreso - granCosto;
      const granMargen = granIngreso > 0 ? (granGanancia / granIngreso) * 100 : 0;
      
      document.getElementById('rep-agr-ingreso').innerText = `Bs ${granIngreso.toFixed(2)}`;
      document.getElementById('rep-agr-costo').innerText = `Bs ${granCosto.toFixed(2)}`;
      
      const elAgrGanancia = document.getElementById('rep-agr-ganancia');
      elAgrGanancia.innerText = `${granGanancia >= 0 ? '+' : ''} Bs ${granGanancia.toFixed(2)}`;
      elAgrGanancia.className = `fw-bold mb-0 mt-1 ${granGanancia >= 0 ? 'text-success' : 'text-danger'}`;
      document.getElementById('rep-agr-margen').innerText = `${granMargen.toFixed(1)}%`;

      renderReporteAgrupado();
      renderReporteProductos();
    }

    function renderReporteAgrupado() {
      const tbody = document.getElementById('tabla-rep-agrupado');
      tbody.innerHTML = '';
      if(repDatosActuales.agrupado.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay ventas en este período.</td></tr>';
        return;
      }
      repDatosActuales.agrupado.forEach(r => {
        const ganancia = r.ingreso - r.costo;
        const margen = r.ingreso > 0 ? (ganancia / r.ingreso) * 100 : 0;
        const colorGanancia = ganancia >= 0 ? 'text-success' : 'text-danger';
        
        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${r.fecha}</td>
            <td class="text-center">${r.ventas}</td>
            <td class="text-center">${r.unidades}</td>
            <td class="text-end text-dark">Bs ${r.ingreso.toFixed(2)}</td>
            <td class="text-end text-muted">Bs ${r.costo.toFixed(2)}</td>
            <td class="text-end fw-bold ${colorGanancia}">Bs ${ganancia.toFixed(2)}</td>
            <td class="text-end">${margen.toFixed(1)}%</td>
          </tr>
        `;
      });
    }

    function renderReporteProductos() {
      const tbody = document.getElementById('tabla-rep-productos');
      const filtro = document.getElementById('rep-buscar-prod').value.toLowerCase();
      tbody.innerHTML = '';
      
      let lista = repDatosActuales.productos;
      if (filtro) lista = lista.filter(p => p.nombre.toLowerCase().includes(filtro) || p.sku.toLowerCase().includes(filtro));

      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">No hay ventas registradas en este período.</td></tr>';
        return;
      }

      lista.forEach(p => {
        const pVentaProm = p.unidades > 0 ? p.ingreso / p.unidades : 0;
        const ganancia = p.ingreso - p.costoTotal;
        const margen = p.ingreso > 0 ? (ganancia / p.ingreso) * 100 : 0;
        const colorGanancia = ganancia >= 0 ? 'text-success' : 'text-danger';

        tbody.innerHTML += `
          <tr>
            <td class="small fw-bold text-muted">${p.sku}</td>
            <td class="fw-bold text-dark" style="max-width: 250px;"><div class="text-truncate" title="${p.nombre}">${p.nombre}</div></td>
            <td class="text-muted small">${p.cat}</td>
            <td class="text-center fw-bold">${p.unidades}</td>
            <td class="text-end text-muted small">Bs ${p.costoUnitario.toFixed(2)}</td>
            <td class="text-end text-muted small">Bs ${pVentaProm.toFixed(2)}</td>
            <td class="text-end text-dark">Bs ${p.ingreso.toFixed(2)}</td>
            <td class="text-end text-muted">Bs ${p.costoTotal.toFixed(2)}</td>
            <td class="text-end fw-bold ${colorGanancia}">Bs ${ganancia.toFixed(2)}</td>
            <td class="text-end">${margen.toFixed(1)}%</td>
          </tr>
        `;
      });
    }

    // ==========================================
    // MÓDULO COMBOS (CON OPCIÓN DE EDITAR, ELIMINAR Y BUSCAR)
    // ==========================================
    
    let carritoCombo = [];
    let comboEditandoCodigo = null;

    function obtenerCombosCacheLocal() {
      const data = localStorage.getItem('fabmat_combos_editados');
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return { editados: {}, eliminados: [] };
    }

    function guardarCombosCacheLocal(cache) {
      localStorage.setItem('fabmat_combos_editados', JSON.stringify(cache));
    }

    function aplicarCambiosLocalesCombos(listaBackend) {
      const cache = obtenerCombosCacheLocal();
      let lista = Array.isArray(listaBackend) ? [...listaBackend] : [];

      // Filtrar combos eliminados
      if (Array.isArray(cache.eliminados) && cache.eliminados.length > 0) {
        lista = lista.filter(c => !cache.eliminados.includes(String(c.codigo_combo)));
      }

      // Aplicar ediciones guardadas y recuperar ítems
      lista = lista.map(c => {
        const cod = String(c.codigo_combo);
        let itemsCombo = c.items;
        if (typeof itemsCombo === 'string') {
          try { itemsCombo = JSON.parse(itemsCombo); } catch (e) { itemsCombo = []; }
        }
        const editado = cache.editados && cache.editados[cod] ? cache.editados[cod] : null;
        if (editado) {
          return {
            ...c,
            nombre: editado.nombre ?? c.nombre,
            descripcion: editado.descripcion ?? c.descripcion,
            precio_venta_usd: editado.precio_usd ?? c.precio_venta_usd,
            precio_venta_bob: editado.precio_bob ?? c.precio_venta_bob,
            estado: editado.estado ?? c.estado,
            descuento_perc: editado.descuento_perc ?? 0,
            items: Array.isArray(editado.items) && editado.items.length > 0 ? editado.items : (itemsCombo || [])
          };
        }
        return { ...c, items: Array.isArray(itemsCombo) ? itemsCombo : [] };
      });

      return lista;
    }

    async function cargarCombos() {
      const inputBuscar = document.getElementById('buscar-combo');
      if (inputBuscar && !inputBuscar.getAttribute('oninput')) {
        inputBuscar.setAttribute('oninput', 'filtrarTablaCombos()');
      }

      const res = await apiGet('getCombos');
      if (res.success) {
        state.combos = aplicarCambiosLocalesCombos(res.data);
        renderTablaCombos(state.combos);
      }
    }

    function filtrarTablaCombos() {
      const filtro = (document.getElementById('buscar-combo')?.value || '').toLowerCase().trim();
      if (!state.combos) return;
      if (!filtro) {
        renderTablaCombos(state.combos);
        return;
      }
      const filtrados = state.combos.filter(c =>
        String(c.nombre || '').toLowerCase().includes(filtro) ||
        String(c.codigo_combo || '').toLowerCase().includes(filtro) ||
        String(c.descripcion || '').toLowerCase().includes(filtro)
      );
      renderTablaCombos(filtrados);
    }

    function renderTablaCombos(lista) {
      const tbody = document.getElementById('tabla-combos-body');
      tbody.innerHTML = '';
      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay combos registrados</td></tr>';
        return;
      }

      lista.forEach(c => {
        const estadoBadge = c.estado === 'Activo'
          ? '<span class="badge bg-success">Activo</span>'
          : '<span class="badge bg-secondary">Inactivo</span>';
        tbody.innerHTML += `
          <tr>
            <td><span class="badge bg-light text-dark border">${c.codigo_combo}</span></td>
            <td class="fw-bold">${c.nombre} <br><small class="text-muted">${c.descripcion || ''}</small></td>
            <td>$ ${Number(c.precio_venta_usd).toFixed(2)}</td>
            <td class="fw-bold text-danger">Bs. ${Number(c.precio_venta_bob).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" onclick="prepararEditarCombo('${c.codigo_combo}')" title="Editar combo">
                <i class="fa fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarCombo('${c.codigo_combo}')" title="Eliminar combo">
                <i class="fa fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });
    }

    async function prepararModalCombo() {
      comboEditandoCodigo = null;
      carritoCombo = [];

      const tituloModal = document.querySelector('#modalCombo .modal-title');
      if (tituloModal) tituloModal.innerText = 'Nuevo combo';

      document.getElementById('combo-nombre').value = '';
      document.getElementById('combo-desc').value = '';
      document.getElementById('combo-descuento-perc').value = '0';
      document.getElementById('combo-estado').checked = true;
      document.getElementById('combo-buscar-prod').value = '';
      
      if (state.productos.length === 0) {
        const r = await apiGet('getProductos');
        if (r.success) state.productos = r.data;
      }
      
      renderizarCatalogoCombo();
      actualizarTicketCombo();
    }

    window.prepararEditarCombo = async function(codigoCombo) {
      if (!state.combos) return;
      const combo = state.combos.find(c => String(c.codigo_combo) === String(codigoCombo));
      if (!combo) return;

      comboEditandoCodigo = combo.codigo_combo;

      const tituloModal = document.querySelector('#modalCombo .modal-title');
      if (tituloModal) tituloModal.innerText = `Editar combo (${combo.codigo_combo})`;

      if (state.productos.length === 0) {
        const r = await apiGet('getProductos');
        if (r.success) state.productos = r.data;
      }

      document.getElementById('combo-nombre').value = combo.nombre || '';
      document.getElementById('combo-desc').value = combo.descripcion || '';
      document.getElementById('combo-estado').checked = (combo.estado === 'Activo');
      document.getElementById('combo-buscar-prod').value = '';

      // Cargar productos del combo si existen
      let itemsGuardados = combo.items || [];
      if (typeof itemsGuardados === 'string') {
        try { itemsGuardados = JSON.parse(itemsGuardados); } catch (e) { itemsGuardados = []; }
      }
      carritoCombo = Array.isArray(itemsGuardados) ? JSON.parse(JSON.stringify(itemsGuardados)) : [];

      renderizarCatalogoCombo();

      // Calcular total normal y porcentaje de descuento actual
      const totalNormal = carritoCombo.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio_unitario)), 0);
      const precioActualBob = Number(combo.precio_venta_bob) || 0;
      const precioActualUsd = Number(combo.precio_venta_usd) || (precioActualBob / state.tasaCambio);

      if (totalNormal > 0) {
        const descCalculado = ((totalNormal - precioActualBob) / totalNormal) * 100;
        document.getElementById('combo-descuento-perc').value = Math.max(0, descCalculado).toFixed(1);
        actualizarTicketCombo();
      } else {
        document.getElementById('combo-descuento-perc').value = combo.descuento_perc || '0';
        actualizarTicketCombo();
        // Mantener visible el precio guardado aunque aún no se hayan vuelto a seleccionar ítems
        document.getElementById('combo-precio-bob-display').innerText = precioActualBob.toFixed(2);
        document.getElementById('combo-precio-bob').value = precioActualBob.toFixed(2);
        document.getElementById('combo-precio-usd').value = precioActualUsd.toFixed(2);
      }

      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCombo')).show();
    };

    window.eliminarCombo = async function(codigoCombo) {
      if (!confirm(`¿Estás seguro de que deseas eliminar el combo ${codigoCombo}?`)) return;

      const cache = obtenerCombosCacheLocal();
      if (!cache.eliminados.includes(String(codigoCombo))) {
        cache.eliminados.push(String(codigoCombo));
      }
      delete cache.editados[String(codigoCombo)];
      guardarCombosCacheLocal(cache);

      // Intentar eliminar también en Apps Script si existe el endpoint
      try {
        await apiPost('eliminarCombo', { codigo_combo: codigoCombo });
      } catch (e) {}

      state.combos = (state.combos || []).filter(c => String(c.codigo_combo) !== String(codigoCombo));
      renderTablaCombos(state.combos);
      mostrarAlerta(`Combo ${codigoCombo} eliminado correctamente`, 'success');
    };

    function renderizarCatalogoCombo(filtro = '') {
      const lstProd = document.getElementById('combo-lista-productos');
      lstProd.innerHTML = '';
      
      let prods = state.productos.filter(p => p.estado === 'Activo');
      if (filtro) {
        let f = filtro.toLowerCase();
        prods = prods.filter(p => p.nombre.toLowerCase().includes(f) || p.codigo_sku.toLowerCase().includes(f));
      }

      prods.forEach(p => {
        lstProd.innerHTML += `
          <div class="item-row d-flex justify-content-between align-items-center py-2 border-bottom">
            <div style="width: 60%;">
              <div class="fw-bold small text-dark">${p.nombre}</div>
              <div style="font-size: 10px; color: #a0a0a0;">${p.codigo_sku}</div>
            </div>
            <div class="small fw-bold text-muted">Bs ${Number(p.precio_venta_bob).toFixed(2)}</div>
            <button class="btn btn-sm btn-danger rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 25px; height: 25px;" onclick="agregarItemCombo('${p.codigo_sku}')"><i class="fa fa-plus" style="font-size: 10px;"></i></button>
          </div>
        `;
      });
    }

    function filtrarCatalogoCombo() {
      const filtro = document.getElementById('combo-buscar-prod').value;
      renderizarCatalogoCombo(filtro);
    }

    function agregarItemCombo(sku) {
      const prod = state.productos.find(p => p.codigo_sku === sku);
      const existe = carritoCombo.find(i => i.sku === sku);
      
      if (existe) {
        existe.cantidad++;
      } else {
        carritoCombo.push({ sku: prod.codigo_sku, nombre: prod.nombre, cantidad: 1, precio_unitario: Number(prod.precio_venta_bob) });
      }
      actualizarTicketCombo();
    }

    function actualizarCantCombo(index, val) {
      let cant = Number(val);
      if (cant <= 0) cant = 1;
      carritoCombo[index].cantidad = cant;
      actualizarTicketCombo();
    }

    function actualizarTicketCombo() {
      const tbody = document.getElementById('combo-cart-body');
      tbody.innerHTML = '';
      let totalNormal = 0;
      
      carritoCombo.forEach((item, index) => {
        let subtotal = item.cantidad * item.precio_unitario;
        totalNormal += subtotal;
        tbody.innerHTML += `
          <tr>
            <td class="small"><span class="fw-bold d-block text-truncate" style="max-width: 200px;" title="${item.nombre}">${item.nombre}</span><span class="text-muted" style="font-size:10px;">${item.sku}</span></td>
            <td><input type="number" class="form-control form-control-sm text-center px-1" value="${item.cantidad}" onchange="actualizarCantCombo(${index}, this.value)"></td>
            <td class="small text-muted">Bs ${Number(item.precio_unitario).toFixed(2)}</td>
            <td class="small fw-bold">Bs ${subtotal.toFixed(2)}</td>
            <td><button class="btn btn-sm text-danger p-0 m-0" onclick="carritoCombo.splice(${index}, 1); actualizarTicketCombo();"><i class="fa fa-times-circle fs-6"></i></button></td>
          </tr>
        `;
      });
      
      document.getElementById('combo-total-normal').innerText = totalNormal.toFixed(2);
      calcularDescuentoCombo(totalNormal);
    }

    function calcularDescuentoCombo(totalNormal = null) {
      if (totalNormal === null) {
         totalNormal = parseFloat(document.getElementById('combo-total-normal').innerText) || 0;
      }
      const perc = parseFloat(document.getElementById('combo-descuento-perc').value) || 0;
      const descuento = totalNormal * (perc / 100);
      const totalConDescuento = totalNormal - descuento;
      
      const precioUsd = totalConDescuento / state.tasaCambio;
      
      document.getElementById('combo-precio-bob-display').innerText = totalConDescuento.toFixed(2);
      document.getElementById('combo-precio-bob').value = totalConDescuento.toFixed(2);
      document.getElementById('combo-precio-usd').value = precioUsd.toFixed(2);
    }

    async function guardarCombo() {
      const nombre = document.getElementById('combo-nombre').value.trim();
      const descripcion = document.getElementById('combo-desc').value.trim();
      const precioUsd = parseFloat(document.getElementById('combo-precio-usd').value) || 0;
      const precioBob = parseFloat(document.getElementById('combo-precio-bob').value) || 0;
      const estado = document.getElementById('combo-estado').checked ? 'Activo' : 'Inactivo';
      const descuentoPerc = parseFloat(document.getElementById('combo-descuento-perc').value) || 0;
      
      if (!nombre || (carritoCombo.length === 0 && !comboEditandoCodigo)) {
        mostrarAlerta("Llene el nombre y agregue productos al combo", "warning");
        return;
      }

      const payload = {
        codigo_combo: comboEditandoCodigo || '',
        nombre: nombre, 
        descripcion: descripcion,
        precio_usd: precioUsd, 
        precio_bob: precioBob,
        estado: estado,
        items: carritoCombo
      };

      // MODO EDICIÓN DE COMBO EXISTENTE
      if (comboEditandoCodigo) {
        const cache = obtenerCombosCacheLocal();
        cache.editados[String(comboEditandoCodigo)] = {
          nombre: nombre,
          descripcion: descripcion,
          precio_usd: precioUsd,
          precio_bob: precioBob,
          estado: estado,
          descuento_perc: descuentoPerc,
          items: JSON.parse(JSON.stringify(carritoCombo))
        };
        guardarCombosCacheLocal(cache);

        // Intentar actualizar también en el backend si la acción existe
        try {
          await apiPost('actualizarCombo', payload);
        } catch (e) {}

        bootstrap.Modal.getInstance(document.getElementById('modalCombo')).hide();
        comboEditandoCodigo = null;
        await cargarCombos();
        mostrarAlerta("Combo actualizado exitosamente", "success");
        return;
      }

      // MODO CREACIÓN DE NUEVO COMBO
      const res = await apiPost('guardarCombo', payload);
      if (res.success) {
        // Guardar los ítems del nuevo combo en caché local para futuras ediciones
        const rCombos = await apiGet('getCombos');
        if (rCombos.success && rCombos.data.length > 0) {
          const ultimoCombo = rCombos.data[rCombos.data.length - 1];
          if (ultimoCombo && ultimoCombo.codigo_combo) {
            const cache = obtenerCombosCacheLocal();
            cache.editados[String(ultimoCombo.codigo_combo)] = {
              nombre: nombre,
              descripcion: descripcion,
              precio_usd: precioUsd,
              precio_bob: precioBob,
              estado: estado,
              descuento_perc: descuentoPerc,
              items: JSON.parse(JSON.stringify(carritoCombo))
            };
            guardarCombosCacheLocal(cache);
          }
          state.combos = aplicarCambiosLocalesCombos(rCombos.data);
          renderTablaCombos(state.combos);
        } else {
          cargarCombos();
        }

        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalCombo')).hide();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO COMPRAS
    // ==========================================
    
    let carritoCompra = [];

    async function cargarCompras() {
      const res = await apiGet('getCompras');
      if (res.success) {
        renderTablaCompras(res.data);
      }
    }

    function renderTablaCompras(lista) {
      const tbody = document.getElementById('tabla-compras-body');
      tbody.innerHTML = '';
      if(lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay compras registradas</td></tr>';
        return;
      }

      lista.forEach(c => {
        const estadoBadge = c.estado === 'Recibida' 
            ? '<span class="badge bg-success">Recibida</span>' 
            : '<span class="badge bg-warning text-dark">Pendiente</span>';
        
        const fecha = new Date(c.fecha).toLocaleDateString('es-BO');
        
        let botonAccion = c.estado === 'Pendiente' 
            ? `<button class="btn btn-sm btn-primary" onclick="recibirMercaderia('${c.codigo_compra}')"><i class="fa fa-box-open"></i> Recibir</button>`
            : `<button class="btn btn-sm btn-outline-secondary" disabled><i class="fa fa-check"></i> Stock Sumado</button>`;

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${c.codigo_compra}</td>
            <td>${fecha}</td>
            <td>${c.proveedor}</td>
            <td class="fw-bold">Bs. ${Number(c.total).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td class="text-end">${botonAccion}</td>
          </tr>
        `;
      });
    }

    async function prepararModalCompra() {
      carritoCompra = [];
      actualizarTicketCompra();
      document.getElementById('compra-obs').value = '';
      document.getElementById('compra-cant').value = '1';
      
      if(state.productos.length === 0) { const r = await apiGet('getProductos'); if(r.success) state.productos = r.data; }
      if(!state.proveedores) { const r = await apiGet('getProveedores'); if(r.success) state.proveedores = r.data; }

      const selProd = document.getElementById('compra-producto');
      selProd.innerHTML = '<option value="">Seleccione producto...</option>';
      state.productos.forEach(p => selProd.innerHTML += `<option value="${p.codigo_sku}">${p.nombre} (Costo: Bs. ${p.precio_compra_bob})</option>`);

      const selProv = document.getElementById('compra-proveedor');
      selProv.innerHTML = '<option value="">Seleccione proveedor...</option>';
      if(state.proveedores) {
          state.proveedores.forEach(p => selProv.innerHTML += `<option value="${p.razon_social}">${p.razon_social}</option>`);
      }
    }

    function agregarItemCompra() {
      const sku = document.getElementById('compra-producto').value;
      const cant = Number(document.getElementById('compra-cant').value);
      
      if(!sku || cant <= 0) { mostrarAlerta("Seleccione producto y cantidad válida", "warning"); return; }
      
      const prod = state.productos.find(p => p.codigo_sku === sku);
      const existe = carritoCompra.find(i => i.sku === sku);
      
      if(existe) {
        existe.cantidad += cant;
        existe.subtotal = existe.cantidad * existe.precio_unitario;
      } else {
        carritoCompra.push({
          sku: prod.codigo_sku, nombre: prod.nombre, cantidad: cant,
          precio_unitario: Number(prod.precio_compra_bob), subtotal: Number(prod.precio_compra_bob) * cant
        });
      }
      actualizarTicketCompra();
    }

    function actualizarTicketCompra() {
      const tbody = document.getElementById('compra-cart-body');
      tbody.innerHTML = '';
      let total = 0;
      carritoCompra.forEach((item, index) => {
        total += item.subtotal;
        tbody.innerHTML += `
          <tr>
            <td>${item.nombre} <br><small class="text-muted">${item.sku}</small></td>
            <td>${item.cantidad}</td>
            <td>Bs. ${item.precio_unitario.toFixed(2)}</td>
            <td>Bs. ${item.subtotal.toFixed(2)}</td>
            <td><button class="btn btn-sm text-danger p-0" onclick="carritoCompra.splice(${index}, 1); actualizarTicketCompra();">&times;</button></td>
          </tr>
        `;
      });
      document.getElementById('compra-total').innerText = total.toFixed(2);
    }

    async function guardarCompra() {
      const prov = document.getElementById('compra-proveedor').value;
      if (!prov || carritoCompra.length === 0) {
        mostrarAlerta("Seleccione proveedor y agregue productos", "warning"); return;
      }

      const payload = {
        proveedor: prov, observacion: document.getElementById('compra-obs').value,
        total: parseFloat(document.getElementById('compra-total').innerText), items: carritoCompra
      };

      const res = await apiPost('guardarCompra', payload);
      if (res.success) {
        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalCompra')).hide();
        cargarCompras();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    async function recibirMercaderia(codigoCompra) {
      if(!confirm(`¿Confirmar recepción de la orden ${codigoCompra}? El stock aumentará automáticamente.`)) return;
      
      const res = await apiPost('recibirCompra', { codigoCompra: codigoCompra, usuario: state.usuarioActual });
      if (res.success) {
        mostrarAlerta(res.message, "success");
        cargarCompras();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO TIPO DE CAMBIO (PROTEGIDO CONTRA TABLA VACÍA)
    // ==========================================
    async function cargarTipoCambioHistorial() {
      const tasaSegura = !isNaN(parseFloat(state.tasaCambio)) ? parseFloat(state.tasaCambio) : 10.50;
      const vistaActiva = document.getElementById('tc-vista-activa');
      if (vistaActiva) vistaActiva.innerText = tasaSegura.toFixed(2);
      
      const res = await apiGet('getTipoCambioHistorial');
      if (res && res.success && Array.isArray(res.data)) {
        renderTablaTipoCambio(res.data);
      } else {
        renderTablaTipoCambio([]);
      }
    }

    function renderTablaTipoCambio(lista) {
      const tbody = document.getElementById('tabla-tc-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      const listaSegura = Array.isArray(lista) ? [...lista].reverse() : [];

      if(listaSegura.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay historial de tasas</td></tr>';
        return;
      }

      listaSegura.forEach(tc => {
        const estadoBadge = tc.estado === 'Vigente' 
            ? '<span class="badge bg-success">Vigente</span>' 
            : '<span class="badge bg-secondary">Histórico</span>';
        
        const fechaFormat = tc.fecha ? new Date(tc.fecha).toLocaleString('es-BO') : '--';

        tbody.innerHTML += `
          <tr>
            <td class="text-muted small">${fechaFormat}</td>
            <td class="fw-bold">Bs. ${Number(tc.tasa_usd_bob || 0).toFixed(2)}</td>
            <td><i class="fa fa-user-circle text-muted"></i> ${tc.usuario || 'Sistema'}</td>
            <td>${estadoBadge}</td>
          </tr>
        `;
      });
    }

    async function guardarTipoCambio() {
      const nuevaTasa = parseFloat(document.getElementById('tc-nuevo-valor').value);
      
      if (!nuevaTasa || nuevaTasa <= 0) {
        mostrarAlerta("Ingrese un valor válido mayor a 0", "warning");
        return;
      }

      const payload = {
        tasa: nuevaTasa,
        usuario: state.usuarioActual
      };

      const res = await apiPost('actualizarTipoCambio', payload);
      
      if (res.success) {
        mostrarAlerta(res.message, "success");
        state.tasaCambio = nuevaTasa;
        document.getElementById('tc-display').innerText = nuevaTasa.toFixed(4);
        
        bootstrap.Modal.getInstance(document.getElementById('modalTipoCambio')).hide();
        document.getElementById('form-tc').reset();
        
        cargarTipoCambioHistorial();
        apiGet('getProductos').then(r => { if(r.success) state.productos = r.data; });
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // MÓDULO USUARIOS
    // ==========================================
    async function cargarUsuarios() {
      const res = await apiGet('getUsuarios');
      if (res.success) renderTablaUsuarios(res.data);
    }

    function renderTablaUsuarios(lista) {
      const tbody = document.getElementById('tabla-usuarios-body');
      tbody.innerHTML = '';
      if(!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay usuarios registrados</td></tr>';
        return;
      }
      lista.forEach(u => {
        const estadoBadge = u.estado === 'Activo' ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>';
        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${u.nombre_completo || u.nombre || '--'}</td>
            <td>${u.usuario}</td>
            <td>${u.email || '--'}</td>
            <td><span class="badge bg-dark">${u.rol}</span></td>
            <td>${estadoBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-danger"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    }

    async function guardarUsuario() {
      const nombre = document.getElementById('usr-nombre').value.trim();
      const login = document.getElementById('usr-login').value.trim();
      const pass = document.getElementById('usr-pass').value;

      if (!nombre || !login || !pass) {
        mostrarAlerta("Llene los campos obligatorios", "warning"); return;
      }

      const payload = {
        nombre: nombre, usuario: login, password: pass,
        email: document.getElementById('usr-email').value.trim(),
        rol: document.getElementById('usr-rol').value,
        estado: document.getElementById('usr-estado').checked ? 'Activo' : 'Inactivo'
      };

      const res = await apiPost('guardarUsuario', payload);
      if (res.success) {
        mostrarAlerta(res.message, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        document.getElementById('form-usuario').reset();
        cargarUsuarios();
      } else {
        mostrarAlerta(res.message, "danger");
      }
    }

    // ==========================================
    // CONTROL DE ACCESO BASADO EN ROLES (RBAC)
    // ==========================================
    function aplicarPermisosSegunRol(rol) {
      const links = document.querySelectorAll('.sidebar .nav-link');
      links.forEach(link => link.style.display = 'flex');

      if (rol === 'Vendedor') {
        const modulosProhibidos = ['categorias', 'compras', 'proveedores', 'reportes', 'usuarios', 'tipo_cambio'];
        
        modulosProhibidos.forEach(mod => {
          const tab = Array.from(links).find(l => l.getAttribute('onclick') && l.getAttribute('onclick').includes(`'${mod}'`));
          if (tab) tab.style.display = 'none';
        });
      }
    }

    // ==========================================
    // MÓDULO PROFORMAS / COTIZACIONES
    // ==========================================
    let proformaActual = { items: [], total: 0 };
    let profSearchIndex = -1;

    async function cargarProformas() {
      const res = await apiGet('getCotizaciones');
      const tbody = document.getElementById('tabla-proformas-body');
      tbody.innerHTML = '';

      if(res.success && res.data.length > 0) {
        res.data.forEach(p => {
          const badge = p.estado === 'Aprobada' ? '<span class="badge bg-success">Aprobada (Venta)</span>' : '<span class="badge bg-warning text-dark">Pendiente</span>';
          tbody.innerHTML += `
            <tr>
              <td class="fw-bold text-danger">${p.codigo_cotizacion}</td>
              <td class="text-muted small">${new Date(p.fecha).toLocaleDateString('es-BO')}</td>
              <td>${p.cliente.substring(0,25)}...</td>
              <td class="text-muted small">${p.validez}</td>
              <td class="text-end fw-bold">Bs ${Number(p.total).toFixed(2)}</td>
              <td>${badge}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" onclick='editarProforma(${JSON.stringify(p).replace(/'/g, "&apos;")})' title="Editar"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProforma('${p.codigo_cotizacion}')" title="Eliminar"><i class="fa fa-trash"></i></button>
                <button class="btn btn-sm btn-outline-secondary" onclick='reimprimirProforma(${JSON.stringify(p).replace(/'/g, "&apos;")})' title="Imprimir PDF"><i class="fa fa-print"></i></button>
              </td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay proformas registradas.</td></tr>';
      }
    }

    async function eliminarProforma(codigo) {
      if(!confirm(`¿Estás seguro de eliminar la proforma ${codigo}?`)) return;
      const res = await apiPost('eliminarCotizacion', { codigo_cotizacion: codigo });
      if(res.success) { mostrarAlerta(res.message, 'success'); cargarProformas(); }
      else { mostrarAlerta(res.message, 'danger'); }
    }

    function editarProforma(prof) {
      prepararNuevaProforma();
      document.getElementById('prof-cite').value = prof.codigo_cotizacion;
      document.getElementById('prof-cliente').value = prof.cliente;
      document.getElementById('prof-cond-validez').value = prof.validez;
      document.getElementById('prof-cond-lugar').value = prof.lugar_entrega;
      document.getElementById('prof-cond-tiempo').value = prof.tiempo_entrega;
      document.getElementById('prof-cond-pago').value = prof.forma_pago;
      proformaActual.items = prof.items;
      actualizarTablaProforma();
    }

    async function prepararNuevaProforma() {
      document.getElementById('panel-historial-proformas').style.display = 'none';
      document.getElementById('panel-crear-proforma').style.display = 'block';
      proformaActual = { items: [], total: 0 };
      actualizarTablaProforma();

      if (state.productos.length === 0) { 
        const r = await apiGet('getProductos'); 
        if(r.success) state.productos = r.data; 
      }

      const anio = new Date().getFullYear();
      const numAleatorio = Math.floor(Math.random() * 900) + 100;
      document.getElementById('prof-cite').value = `FM-PROFORMA ${numAleatorio}/${anio}`;
    }

    function cerrarCreadorProforma() {
      document.getElementById('panel-crear-proforma').style.display = 'none';
      document.getElementById('panel-historial-proformas').style.display = 'block';
    }

    function filtrarProdsProforma() {
      profSearchIndex = -1;
      const txt = document.getElementById('prof-buscar-prod').value.toLowerCase();
      const div = document.getElementById('prof-lista-prods');
      div.innerHTML = '';
      if(txt.length < 2) return;

      const prods = state.productos.filter(p => p.nombre.toLowerCase().includes(txt) || p.codigo_sku.toLowerCase().includes(txt)).slice(0, 5);

      prods.forEach((p, index) => {
        const btn = document.createElement('button');
        btn.className = 'list-group-item list-group-item-action small prof-search-item';
        btn.innerHTML = `<b>${p.codigo_sku}</b> - ${p.nombre} <span class="float-end text-success">Bs ${p.precio_venta_bob}</span>`;
        btn.onclick = () => agregarItemProforma(p);
        div.appendChild(btn);
      });
    }

    function navegarBuscadorProforma(e) {
      const items = document.querySelectorAll('.prof-search-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        profSearchIndex++;
        if (profSearchIndex >= items.length) profSearchIndex = 0;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        profSearchIndex--;
        if (profSearchIndex < 0) profSearchIndex = items.length - 1;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (profSearchIndex >= 0) items[profSearchIndex].click();
        return;
      }

      items.forEach(item => item.classList.remove('active', 'bg-light'));
      if (profSearchIndex >= 0) items[profSearchIndex].classList.add('active', 'bg-light');
    }

    function agregarItemProforma(prod) {
      document.getElementById('prof-buscar-prod').value = '';
      document.getElementById('prof-lista-prods').innerHTML = '';
      profSearchIndex = -1;

      let ex = proformaActual.items.find(i => i.sku === prod.codigo_sku);
      if(ex) { ex.cantidad++; ex.subtotal = ex.cantidad * ex.precio_unitario; }
      else {
        proformaActual.items.push({
          sku: prod.codigo_sku, nombre: prod.nombre, 
          descripcion_detallada: prod.descripcion || prod.nombre,
          marca: prod.marca || '',
          procedencia: prod.procedencia || '',
          cantidad: 1, precio_unitario: Number(prod.precio_venta_bob), subtotal: Number(prod.precio_venta_bob)
        });
      }
      actualizarTablaProforma();
      document.getElementById('prof-buscar-prod').focus();
    }

    function actualizarTablaProforma() {
      const tbody = document.getElementById('prof-items-body');
      tbody.innerHTML = '';
      proformaActual.total = 0;

      proformaActual.items.forEach((it, index) => {
        proformaActual.total += it.subtotal;
        tbody.innerHTML += `
          <tr>
            <td class="text-center fw-bold align-middle">${index + 1}</td>
            <td class="fw-bold text-dark small align-middle">${it.nombre}</td>
            <td><textarea class="form-control form-control-sm" rows="2" onchange="proformaActual.items[${index}].descripcion_detallada = this.value">${it.descripcion_detallada}</textarea></td>
            <td class="align-middle"><input type="text" class="form-control form-control-sm" value="${it.marca}" onchange="proformaActual.items[${index}].marca = this.value"></td>
            <td class="align-middle"><input type="text" class="form-control form-control-sm" value="${it.procedencia}" onchange="proformaActual.items[${index}].procedencia = this.value"></td>
            <td class="align-middle"><input type="number" class="form-control form-control-sm text-center" value="${it.cantidad}" onchange="modificarItemProforma(${index}, 'cant', this.value)"></td>
            <td class="align-middle"><input type="number" class="form-control form-control-sm text-end" value="${it.precio_unitario}" onchange="modificarItemProforma(${index}, 'precio', this.value)"></td>
            <td class="text-end fw-bold align-middle">Bs ${it.subtotal.toFixed(2)}</td>
            <td class="align-middle text-center"><button class="btn btn-sm text-danger" onclick="proformaActual.items.splice(${index}, 1); actualizarTablaProforma();"><i class="fa fa-times"></i></button></td>
          </tr>
        `;
      });
      document.getElementById('prof-total-texto').innerText = `Bs ${proformaActual.total.toFixed(2)}`;
    }

    function modificarItemProforma(index, tipo, valor) {
      let val = Number(valor);
      if(val < 0) val = 0;
      if(tipo === 'cant') proformaActual.items[index].cantidad = val;
      if(tipo === 'precio') proformaActual.items[index].precio_unitario = val;
      proformaActual.items[index].subtotal = proformaActual.items[index].cantidad * proformaActual.items[index].precio_unitario;
      actualizarTablaProforma();
    }

    // --- ALGORITMO: NÚMEROS A LETRAS (BOLIVIANOS) ---
    function numeroALetras(num) {
      const unidades = ['','UN ','DOS ','TRES ','CUATRO ','CINCO ','SEIS ','SIETE ','OCHO ','NUEVE '];
      const decenas = ['DIEZ ','ONCE ','DOCE ','TRECE ','CATORCE ','QUINCE ','DIECISEIS ','DIECISIETE ','DIECIOCHO ','DIECINUEVE '];
      const decenas2 = ['','','VEINTE ','TREINTA ','CUARENTA ','CINCUENTA ','SESENTA ','SETENTA ','OCHENTA ','NOVENTA '];
      const centenas = ['','CIENTO ','DOSCIENTOS ','TRESCIENTOS ','CUATROCIENTOS ','QUINIENTOS ','SEISCIENTOS ','SETECIENTOS ','OCHOCIENTOS ','NOVECIENTOS '];

      const centenas_func = (n) => {
        if(n === 100) return 'CIEN ';
        return centenas[Math.floor(n/100)] + decenas_func(n%100);
      }
      const decenas_func = (n) => {
        if(n<10) return unidades[n];
        if(n<20) return decenas[n-10];
        if(n<30) return n === 20 ? 'VEINTE ' : 'VEINTI' + unidades[n%10];
        return decenas2[Math.floor(n/10)] + (n%10 !== 0 ? 'Y ' + unidades[n%10] : '');
      }
      const miles_func = (n) => {
        if(n === 0) return '';
        if(n === 1) return 'MIL ';
        return centenas_func(n) + 'MIL ';
      }

      const entero = Math.floor(num);
      const centavos = Math.round((num - entero) * 100);
      const strCentavos = String(centavos).padStart(2, '0') + '/100';

      if(entero === 0) return `CERO ${strCentavos} BOLIVIANOS`;

      let millones = Math.floor(entero / 1000000);
      let miles = Math.floor((entero % 1000000) / 1000);
      let resto = entero % 1000;

      let texto = '';
      if(millones === 1) texto += 'UN MILLON ';
      else if(millones > 1) texto += centenas_func(millones) + 'MILLONES ';
      texto += miles_func(miles);
      texto += centenas_func(resto);

      return texto + strCentavos + ' BOLIVIANOS';
    }

    async function guardarEImprimirProforma() {
      if(proformaActual.items.length === 0) { mostrarAlerta('Agregue productos a la proforma', 'warning'); return; }

      const payload = {
        cliente: document.getElementById('prof-cliente').value || 'A QUIEN CORRESPONDA',
        cite: document.getElementById('prof-cite').value || 'S/N',
        vendedor: state.usuarioActual.nombre,
        validez: document.getElementById('prof-cond-validez').value,
        lugar_entrega: document.getElementById('prof-cond-lugar').value,
        tiempo_entrega: document.getElementById('prof-cond-tiempo').value,
        factura_nombre: document.getElementById('prof-cond-factura').value || document.getElementById('prof-cliente').value,
        forma_pago: document.getElementById('prof-cond-pago').value,
        subtotal: proformaActual.total, descuento: 0, total: proformaActual.total,
        items: proformaActual.items
      };

      const isEdit = payload.cite !== 'S/N' && document.getElementById('prof-cite').value !== '';
      
      if (isEdit) {
         await apiPost('eliminarCotizacion', { codigo_cotizacion: payload.cite });
      }

      const res = await apiPost('guardarCotizacion', payload);
      if(res.success) {
        mostrarAlerta('Proforma guardada con éxito');
        payload.codigo_cotizacion = payload.cite !== 'S/N' ? payload.cite : res.codigoCotizacion;
        payload.fecha = new Date().toISOString();
        cerrarCreadorProforma();
        cargarProformas();
        reimprimirProforma(payload);
      }
    }

    // --- MOTOR DE IMPRESIÓN PDF CARTA CON MEMBRETE ---
    function reimprimirProforma(datos) {
      const logoURL = new URL('logo.png', window.location.href).href;
      const firmaURL = new URL('firma.png', window.location.href).href;
      const totalTexto = numeroALetras(datos.total);

      let htmlItems = '';
      datos.items.forEach((i, index) => {
        htmlItems += `
          <tr>
            <td style="padding: 5px; text-align: center; vertical-align: top; border: 1px solid #000;">${index + 1}</td>
            <td style="padding: 5px; vertical-align: top; border: 1px solid #000;">${i.nombre}</td>
            <td style="padding: 5px; vertical-align: top; border: 1px solid #000; font-size: 10px;">${i.descripcion_detallada.replace(/\n/g, '<br>')}</td>
            <td style="padding: 5px; text-align: center; vertical-align: top; border: 1px solid #000; font-size: 10px;">${i.marca || '-'}</td>
            <td style="padding: 5px; text-align: center; vertical-align: top; border: 1px solid #000; font-size: 10px;">${i.procedencia || '-'}</td>
            <td style="padding: 5px; text-align: center; vertical-align: top; border: 1px solid #000;">${i.cantidad}</td>
            <td style="padding: 5px; text-align: right; vertical-align: top; border: 1px solid #000;">${Number(i.precio_unitario).toFixed(2)}</td>
            <td style="padding: 5px; text-align: right; vertical-align: top; border: 1px solid #000;">${Number(i.subtotal).toFixed(2)}</td>
          </tr>`;
      });

      let html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #000; font-size: 12px; padding: 40px; min-height: 100vh; position: relative; box-sizing: border-box;">
          
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="width: 30%;"><img src="${logoURL}" style="max-width: 150px; height: auto;"></td>
              <td style="width: 70%; text-align: right; vertical-align: top;">
                <p style="margin: 0; font-size: 11px;">La Paz, ${new Date(datos.fecha).toLocaleDateString('es-BO', {day:'numeric', month:'long', year:'numeric'})}</p>
                <p style="margin: 5px 0 0 0; font-weight: bold;">Cite: ${datos.codigo_cotizacion || datos.cite}</p>
              </td>
            </tr>
          </table>

          <p style="margin: 0;">Señores:</p>
          <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${datos.cliente}</p>
          <p style="margin: 0; text-decoration: underline;">Presente.-</p>
          
          <h4 style="text-align: center; font-weight: bold; text-decoration: underline; margin: 20px 0; font-size: 16pt;">PRO-FORMA</h4>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #000; padding: 5px; width: 4%;">N°</th>
                <th style="border: 1px solid #000; padding: 5px; width: 22%;">PRODUCTO</th>
                <th style="border: 1px solid #000; padding: 5px; width: 26%;">ESPECIFICACIONES TÉCNICAS</th>
                <th style="border: 1px solid #000; padding: 5px; width: 10%;">MARCA</th>
                <th style="border: 1px solid #000; padding: 5px; width: 10%;">PROCED.</th>
                <th style="border: 1px solid #000; padding: 5px; width: 6%;">UNID.</th>
                <th style="border: 1px solid #000; padding: 5px; width: 10%;">P. UNIT</th>
                <th style="border: 1px solid #000; padding: 5px; width: 12%;">TOTAL BS.</th>
              </tr>
            </thead>
            <tbody>
              ${htmlItems}
              <tr>
                <td colspan="7" style="text-align: right; padding: 5px; font-weight: bold; border: 1px solid #000;">TOTAL</td>
                <td style="padding: 5px; text-align: right; font-weight: bold; border: 1px solid #000;">${Number(datos.total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p style="font-weight: bold; margin-bottom: 5px;">CONDICIONES:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; width: 30%;">PRECIO TOTAL</td><td style="border: 1px solid #000; padding: 5px;">Bs. ${Number(datos.total).toFixed(2)} (Son: ${totalTexto})</td></tr>
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">VALIDEZ DE LA OFERTA</td><td style="border: 1px solid #000; padding: 5px;">${datos.validez}</td></tr>
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">LUGAR DE ENTREGA</td><td style="border: 1px solid #000; padding: 5px;">${datos.lugar_entrega}</td></tr>
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">TIEMPO DE ENTREGA</td><td style="border: 1px solid #000; padding: 5px;">${datos.tiempo_entrega}</td></tr>
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">EMISIÓN DE FACTURA</td><td style="border: 1px solid #000; padding: 5px;">${datos.factura_nombre || datos.cliente}</td></tr>
            <tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">FORMA DE PAGO</td><td style="border: 1px solid #000; padding: 5px;">${datos.forma_pago}</td></tr>
          </table>

          <div style="text-align: center; margin-top: 40px; margin-bottom: 60px;">
            <img src="${firmaURL}" style="max-width: 180px; height: auto; margin-bottom: -15px;" onerror="this.style.display='none'">
            <p style="margin: 0; border-top: 1px solid #000; display: inline-block; padding-top: 5px; font-weight: bold;">PROPIETARIO / GERENTE<br>DISTRIBUIDORA FABMAT</p>
          </div>

          <div style="position: absolute; bottom: 30px; left: 40px; right: 40px; text-align: center;">
             <p style="margin: 0 0 5px 0; color: #1e5db3; font-weight: bold; font-size: 11px;">www.distribuidorafabmat@gamail.com</p>
             <table style="width: 100%; border: 2px solid #edc53d; border-radius: 5px; font-size: 10px; color: #1e5db3; font-weight: bold;">
               <tr>
                 <td style="padding: 5px 10px; text-align: left; width: 40%;">El Alto / Zona Villa Bolivar "A" Calle 2 Esq. Av. Km. 7 Nro. 280 (Esquina Unifranz)</td>
                 <td style="padding: 5px 10px; text-align: center; width: 30%;">Cel: 78278888</td>
                 <td style="padding: 5px 10px; text-align: right; width: 30%;">Facebook: Distribuidora FabMat Bolivia </td>
               </tr>
             </table>
          </div>
        </div>
      `;

      let iframe = document.getElementById('iframe-proforma');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'iframe-proforma';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              @page { size: letter; margin: 0; }
              body { margin: 0; -webkit-print-color-adjust: exact; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `);
      doc.close();

      setTimeout(() => { 
        iframe.contentWindow.focus();
        iframe.contentWindow.print(); 
      }, 1000);
    }

    // ==========================================
    // MÓDULO: SIMULADOR DE LICITACIONES (COMPLETO CON LOS 5 PUNTOS)
    // ==========================================
    let itemsLicitacion = [];

    // --- PUNTO 1: GESTIÓN DE ENTIDADES PÚBLICAS ---
    function obtenerEntidadesGuardadas() {
      const guardadas = localStorage.getItem('fabmat_entidades_licitacion');
      if (guardadas) {
        try {
          const parsed = JSON.parse(guardadas);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      const iniciales = [
        'CAJA NACIONAL DE SALUD (CNS)',
        'HODE MATERNO INFANTIL - CNS',
        'GOBIERNO AUTÓNOMO MUNICIPAL DE LA PAZ',
        'GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO',
        'MINISTERIO DE SALUD Y DEPORTES'
      ];
      localStorage.setItem('fabmat_entidades_licitacion', JSON.stringify(iniciales));
      return iniciales;
    }

    function cargarSelectEntidades(seleccionada = '') {
      const entidades = obtenerEntidadesGuardadas();
      
      // Actualizar select dentro del Modal
      const selectModal = document.getElementById('lic-entidad');
      if (selectModal) {
        const valorActual = seleccionada || selectModal.value;
        selectModal.innerHTML = '<option value="">-- Seleccione Entidad --</option>';
        entidades.forEach(ent => {
          const isSel = ent === valorActual ? 'selected' : '';
          selectModal.innerHTML += `<option value="${ent.replace(/"/g, '"')}" ${isSel}>${ent}</option>`;
        });
      }

      // Actualizar select en la pantalla principal de Licitaciones
      const selectMain = document.getElementById('lic-entidad-main');
      if (selectMain) {
        const filtroActual = selectMain.value;
        selectMain.innerHTML = '<option value="">-- Todas las Entidades --</option>';
        entidades.forEach(ent => {
          const isSel = ent === filtroActual ? 'selected' : '';
          selectMain.innerHTML += `<option value="${ent.replace(/"/g, '"')}" ${isSel}>${ent}</option>`;
        });
      }
    }

    window.registrarEntidadPublica = function(inputId = 'lic-nueva-entidad') {
      const input = document.getElementById(inputId);
      if (!input) return;
      const nombre = (input.value || '').trim().toUpperCase();
      if (!nombre) {
        if (inputId === 'lic-nueva-entidad') {
          mostrarAlertaModalLicitacion('Escribe primero el nombre de la Entidad Pública en la casilla.', 'warning');
        } else {
          mostrarAlerta('Escribe primero el nombre de la Entidad Pública.', 'warning');
        }
        input.focus();
        return;
      }

      const entidades = obtenerEntidadesGuardadas();
      if (!entidades.includes(nombre)) {
        entidades.push(nombre);
        localStorage.setItem('fabmat_entidades_licitacion', JSON.stringify(entidades));
      }

      cargarSelectEntidades(nombre);
      input.value = '';

      if (inputId === 'lic-nueva-entidad') {
        mostrarAlertaModalLicitacion(`Entidad "${nombre}" registrada y seleccionada en el menú.`, 'success');
      } else {
        mostrarAlerta(`Entidad "${nombre}" agregada al menú de entidades.`, 'success');
      }
    };

    function mostrarAlertaModalLicitacion(mensaje, tipo = 'warning') {
      const box = document.getElementById('lic-modal-alert');
      if (!box) return;
      box.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show py-2 small fw-semibold mb-2" role="alert">
          <i class="fa fa-info-circle me-1"></i> ${mensaje}
          <button type="button" class="btn-close py-2" data-bs-dismiss="alert"></button>
        </div>
      `;
    }

    // --- PREPARACIÓN DEL MODAL Y CARGA DE PRODUCTOS DE BD ---
    window.prepararModalLicitacion = async function(evaluacionEditar = null) {
      const alertBox = document.getElementById('lic-modal-alert');
      if (alertBox) alertBox.innerHTML = '';

      cargarSelectEntidades('');

      // Inicializar filas de inmediato para que la tabla nunca quede bloqueada
      if (evaluacionEditar) {
        document.getElementById('lic-edit-id').value = evaluacionEditar.id;
        cargarSelectEntidades(evaluacionEditar.entidad || '');
        document.getElementById('lic-titulo').value = evaluacionEditar.titulo || '';
        document.getElementById('lic-iva-perc').value = evaluacionEditar.iva || '3';
        itemsLicitacion = JSON.parse(JSON.stringify(evaluacionEditar.items || []));
      } else {
        document.getElementById('lic-edit-id').value = '';
        const tit = document.getElementById('lic-titulo');
        if (tit) tit.value = '';
        const ivaP = document.getElementById('lic-iva-perc');
        if (ivaP) ivaP.value = '3';
        itemsLicitacion = [{ desc: '', cant: 1, pu_prof: 0, pu_costo: 0, pu_sub: 0, otros_gastos: 0 }];
      }

      renderTablaLicitacion();

      // Cargar productos de la Base de Datos si aún no están en memoria
      if (!state.productos || state.productos.length === 0) {
        const res = await apiGet('getProductos');
        if (res && res.success) state.productos = res.data;
      }

      actualizarDatalistProductosLicitacion();
      renderTablaLicitacion();
    };

    function actualizarDatalistProductosLicitacion() {
      const datalist = document.getElementById('lic-datalist-productos');
      if (datalist && state.productos) {
        datalist.innerHTML = '';
        state.productos.forEach(p => {
          const nombreLimpio = (p.nombre || '').trim().replace(/"/g, '"');
          const pv = Number(p.precio_venta_bob || 0).toFixed(2);
          const pc = Number(p.precio_compra_bob || 0).toFixed(2);
          datalist.innerHTML += `<option value="${nombreLimpio}">P.U. Proforma: Bs ${pv} | Costo: Bs ${pc}</option>`;
        });
      }
    }

    window.agregarFilaLicitacion = function() {
      sincronizarInputsConMemoriaLicitacion();
      itemsLicitacion.push({
        desc: '', cant: 1, 
        pu_prof: 0, pu_costo: 0, pu_sub: 0, 
        otros_gastos: 0
      });
      renderTablaLicitacion();
      setTimeout(() => {
        const nuevoInput = document.getElementById(`lic-desc-${itemsLicitacion.length - 1}`);
        if (nuevoInput) nuevoInput.focus();
      }, 50);
    };

    // --- PUNTO 3: AUTOLLENADO AUTOMÁTICO DE P.U. PROFORMA Y P.U. COSTO ---
    function buscarProductoEnBD(texto) {
      if (!state.productos || state.productos.length === 0 || !texto) return null;
      const t = String(texto).trim().toLowerCase();
      if (!t) return null;

      // 1. Coincidencia exacta por nombre o SKU (ignorando espacios extra)
      let prod = state.productos.find(p => 
        String(p.nombre || '').trim().toLowerCase() === t ||
        String(p.codigo_sku || '').trim().toLowerCase() === t
      );
      if (prod) return prod;

      // 2. Coincidencia si el usuario seleccionó del select auxiliar por SKU
      prod = state.productos.find(p => t.startsWith(String(p.nombre || '').trim().toLowerCase()));
      return prod || null;
    }

    window.aplicarProductoSeleccionadoEnFila = function(index, prod) {
      if (!prod) return;
      const precioProforma = Number(prod.precio_venta_bob) || 0;
      const precioCosto = Number(prod.precio_compra_bob) || 0;
      const nombreProd = String(prod.nombre || '').trim();

      itemsLicitacion[index].desc = nombreProd;
      itemsLicitacion[index].pu_prof = precioProforma;
      itemsLicitacion[index].pu_costo = precioCosto;

      const inputDesc = document.getElementById(`lic-desc-${index}`);
      const inputProf = document.getElementById(`lic-pu-prof-${index}`);
      const inputCosto = document.getElementById(`lic-pu-costo-${index}`);

      if (inputDesc && inputDesc.value.trim().toLowerCase() !== nombreProd.toLowerCase()) {
        inputDesc.value = nombreProd;
      }
      if (inputProf) inputProf.value = precioProforma;
      if (inputCosto) inputCosto.value = precioCosto;

      recalcularTotalesLicitacion();
    };

    window.alElegirDesdeSelectProducto = function(index, skuSeleccionado) {
      if (!skuSeleccionado || !state.productos) return;
      const prod = state.productos.find(p => String(p.codigo_sku) === String(skuSeleccionado));
      if (prod) {
        aplicarProductoSeleccionadoEnFila(index, prod);
        const inputCant = document.getElementById(`lic-cant-${index}`);
        if (inputCant) {
          inputCant.focus();
          inputCant.select();
        }
      }
    };

    window.alEscribirDescripcionLicitacion = function(index, valor) {
      itemsLicitacion[index].desc = valor;
      const prod = buscarProductoEnBD(valor);
      if (prod) {
        aplicarProductoSeleccionadoEnFila(index, prod);
      }
    };

    // --- PUNTO 2: NAVEGACIÓN EN ORDEN CON LA TECLA TAB ---
    window.manejarTabMatriz = function(e, index, campoActual) {
      if (e.key !== 'Tab') return;

      // Si presiona Tab estando en Descripción y escribió parte del nombre de un producto, autocompletar P.U. Proforma antes de saltar
      if (campoActual === 'desc') {
        const val = (e.target.value || '').trim();
        let prod = buscarProductoEnBD(val);
        if (!prod && val.length >= 3 && state.productos && Number(itemsLicitacion[index].pu_prof) === 0) {
          const coincidencias = state.productos.filter(p => String(p.nombre || '').toLowerCase().includes(val.toLowerCase()));
          if (coincidencias.length === 1) prod = coincidencias[0];
        }
        if (prod) aplicarProductoSeleccionadoEnFila(index, prod);
      }

      const ordenCampos = ['desc', 'cant', 'pu-prof', 'pu-costo', 'pu-sub', 'og'];
      const posActual = ordenCampos.indexOf(campoActual);
      if (posActual === -1) return;

      e.preventDefault();

      if (!e.shiftKey) {
        // Avanzar hacia la derecha en orden
        if (posActual < ordenCampos.length - 1) {
          const sigCampo = ordenCampos[posActual + 1];
          const sigInput = document.getElementById(`lic-${sigCampo}-${index}`);
          if (sigInput) {
            sigInput.focus();
            if (sigInput.select) sigInput.select();
          }
        } else {
          // Desde O. Gastos salta al primer campo de la siguiente fila (si existe)
          const sigFilaDesc = document.getElementById(`lic-desc-${index + 1}`);
          if (sigFilaDesc) {
            sigFilaDesc.focus();
            if (sigFilaDesc.select) sigFilaDesc.select();
          }
        }
      } else {
        // Retroceder con Shift + Tab
        if (posActual > 0) {
          const antCampo = ordenCampos[posActual - 1];
          const antInput = document.getElementById(`lic-${antCampo}-${index}`);
          if (antInput) {
            antInput.focus();
            if (antInput.select) antInput.select();
          }
        } else if (index > 0) {
          const antFilaOg = document.getElementById(`lic-og-${index - 1}`);
          if (antFilaOg) {
            antFilaOg.focus();
            if (antFilaOg.select) antFilaOg.select();
          }
        }
      }
    };

    window.actualizarValorCeldaLicitacion = function(index, campo, valor) {
      let valNum = parseFloat(valor);
      if (isNaN(valNum) || valNum < 0) valNum = 0;
      itemsLicitacion[index][campo] = valNum;
      recalcularTotalesLicitacion();
    };

    window.eliminarFilaLicitacion = function(index) {
      sincronizarInputsConMemoriaLicitacion();
      itemsLicitacion.splice(index, 1);
      if (itemsLicitacion.length === 0) {
        itemsLicitacion.push({ desc: '', cant: 1, pu_prof: 0, pu_costo: 0, pu_sub: 0, otros_gastos: 0 });
      }
      renderTablaLicitacion();
    };

    function sincronizarInputsConMemoriaLicitacion() {
      itemsLicitacion.forEach((item, index) => {
        const elDesc = document.getElementById(`lic-desc-${index}`);
        const elCant = document.getElementById(`lic-cant-${index}`);
        const elProf = document.getElementById(`lic-pu-prof-${index}`);
        const elCosto = document.getElementById(`lic-pu-costo-${index}`);
        const elSub = document.getElementById(`lic-pu-sub-${index}`);
        const elOg = document.getElementById(`lic-og-${index}`);

        if (elDesc) item.desc = elDesc.value;
        if (elCant) item.cant = parseFloat(elCant.value) || 0;
        if (elProf) item.pu_prof = parseFloat(elProf.value) || 0;
        if (elCosto) item.pu_costo = parseFloat(elCosto.value) || 0;
        if (elSub) item.pu_sub = parseFloat(elSub.value) || 0;
        if (elOg) item.otros_gastos = parseFloat(elOg.value) || 0;
      });
    }

    window.renderTablaLicitacion = function() {
      const tbody = document.getElementById('lic-items-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      // Opciones del selector rápido de productos de BD
      let opcionesSelectBD = '<option value="">📦 Elegir de BD...</option>';
      if (state.productos && state.productos.length > 0) {
        state.productos.forEach(p => {
          const nombreCorto = String(p.nombre || '').trim();
          const pv = Number(p.precio_venta_bob || 0).toFixed(2);
          opcionesSelectBD += `<option value="${p.codigo_sku}">${nombreCorto} (Bs ${pv})</option>`;
        });
      }

      itemsLicitacion.forEach((item, index) => {
        tbody.innerHTML += `
          <tr>
            <td>
              <div class="d-flex flex-column gap-1">
                <select tabindex="-1" class="form-select form-select-sm bg-light text-secondary py-0" style="font-size: 11px; height: 24px;" onchange="alElegirDesdeSelectProducto(${index}, this.value)">
                  ${opcionesSelectBD}
                </select>
                <input type="text" id="lic-desc-${index}" list="lic-datalist-productos" class="form-control form-control-sm border-secondary fw-semibold" placeholder="Escribe o edita el producto..." value="${(item.desc || '').replace(/"/g, '"')}" oninput="alEscribirDescripcionLicitacion(${index}, this.value)" onchange="alEscribirDescripcionLicitacion(${index}, this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'desc')">
              </div>
            </td>
            <td>
              <input type="number" id="lic-cant-${index}" min="1" class="form-control form-control-sm text-center border-secondary fw-bold px-1" style="min-width: 75px; font-size: 13px;" value="${item.cant}" oninput="actualizarValorCeldaLicitacion(${index}, 'cant', this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'cant')">
            </td>
            <td class="bg-light">
              <input type="number" id="lic-pu-prof-${index}" step="0.01" class="form-control form-control-sm text-end border-secondary fw-bold px-1" value="${item.pu_prof}" oninput="actualizarValorCeldaLicitacion(${index}, 'pu_prof', this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'pu-prof')">
            </td>
            <td id="lic-tprof-${index}" class="text-end bg-light align-middle text-muted fw-semibold">0.00</td>
            <td style="background-color: #fef3c7;">
              <input type="number" id="lic-pu-costo-${index}" step="0.01" class="form-control form-control-sm text-end border-warning px-1" value="${item.pu_costo}" oninput="actualizarValorCeldaLicitacion(${index}, 'pu_costo', this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'pu-costo')">
            </td>
            <td id="lic-tcosto-${index}" class="text-end align-middle fw-semibold" style="background-color: #fef3c7; color: #92400e;">0.00</td>
            <td style="background-color: #dcfce7;">
              <input type="number" id="lic-pu-sub-${index}" step="0.01" class="form-control form-control-sm text-end border-success px-1" value="${item.pu_sub}" oninput="actualizarValorCeldaLicitacion(${index}, 'pu_sub', this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'pu-sub')">
            </td>
            <td id="lic-tsub-${index}" class="text-end align-middle fw-bold text-success" style="background-color: #dcfce7;">0.00</td>
            <td id="lic-dif-${index}" class="text-end align-middle text-primary fw-semibold">0.00</td>
            <td id="lic-iva-${index}" class="text-end align-middle text-danger">0.00</td>
            <td id="lic-it-${index}" class="text-end align-middle text-danger">0.00</td>
            <td>
              <input type="number" id="lic-og-${index}" step="0.01" class="form-control form-control-sm text-end border-secondary px-1" value="${item.otros_gastos}" oninput="actualizarValorCeldaLicitacion(${index}, 'otros_gastos', this.value)" onkeydown="manejarTabMatriz(event, ${index}, 'og')">
            </td>
            <td id="lic-gan-${index}" class="text-end align-middle fw-bold fs-6">0.00</td>
            <td class="text-center align-middle">
              <button type="button" tabindex="-1" class="btn btn-sm text-danger p-0 m-0" onclick="eliminarFilaLicitacion(${index})" title="Eliminar fila"><i class="fa fa-trash-alt"></i></button>
            </td>
          </tr>
        `;
      });

      recalcularTotalesLicitacion();
    };

    window.recalcularTotalesLicitacion = function() {
      const ivaPerc = parseFloat(document.getElementById('lic-iva-perc')?.value) || 0;
      const itPerc = 3;

      let totProf = 0, totCosto = 0, totSub = 0, totDif = 0;
      let totIva = 0, totIt = 0, totOg = 0, totGanancia = 0;

      itemsLicitacion.forEach((item, index) => {
        const cant = Number(item.cant) || 0;
        const puProf = Number(item.pu_prof) || 0;
        const puCosto = Number(item.pu_costo) || 0;
        const puSub = Number(item.pu_sub) || 0;
        const og = Number(item.otros_gastos) || 0;

        const tProf = cant * puProf;
        const tCosto = cant * puCosto;
        const tSub = cant * puSub;
        const dif = tSub - tCosto;
        const iva = tSub * (ivaPerc / 100);
        const it = tSub * (itPerc / 100);
        const ganancia = dif - iva - it - og;

        totProf += tProf; totCosto += tCosto; totSub += tSub;
        totDif += dif; totIva += iva; totIt += it;
        totOg += og; totGanancia += ganancia;

        const elTProf = document.getElementById(`lic-tprof-${index}`);
        const elTCosto = document.getElementById(`lic-tcosto-${index}`);
        const elTSub = document.getElementById(`lic-tsub-${index}`);
        const elDif = document.getElementById(`lic-dif-${index}`);
        const elIva = document.getElementById(`lic-iva-${index}`);
        const elIt = document.getElementById(`lic-it-${index}`);
        const elGan = document.getElementById(`lic-gan-${index}`);

        if (elTProf) elTProf.innerText = tProf.toFixed(2);
        if (elTCosto) elTCosto.innerText = tCosto.toFixed(2);
        if (elTSub) elTSub.innerText = tSub.toFixed(2);
        if (elDif) elDif.innerText = dif.toFixed(2);
        if (elIva) elIva.innerText = iva.toFixed(2);
        if (elIt) elIt.innerText = it.toFixed(2);

        if (elGan) {
          elGan.innerText = ganancia.toFixed(2);
          if (ganancia > 0) {
            elGan.style.cssText = 'background-color: #d1e7dd; color: #0f5132; border: 2px solid #198754;';
          } else if (ganancia < 0) {
            elGan.style.cssText = 'background-color: #f8d7da; color: #842029; border: 2px solid #dc3545;';
          } else {
            elGan.style.cssText = 'background-color: #cfe2ff; color: #084298; border: 2px solid #0d6efd;';
          }
        }
      });

      document.getElementById('lic-tot-prof').innerText = totProf.toFixed(2);
      document.getElementById('lic-tot-costo').innerText = totCosto.toFixed(2);
      document.getElementById('lic-tot-sub').innerText = totSub.toFixed(2);
      document.getElementById('lic-tot-dif').innerText = totDif.toFixed(2);
      document.getElementById('lic-tot-iva').innerText = totIva.toFixed(2);
      document.getElementById('lic-tot-it').innerText = totIt.toFixed(2);
      document.getElementById('lic-tot-og').innerText = totOg.toFixed(2);

      const elGanancia = document.getElementById('lic-tot-ganancia');
      if (elGanancia) {
        elGanancia.innerText = totGanancia.toFixed(2);
        if (totGanancia > 0) {
          elGanancia.style.cssText = 'background-color: #198754; color: #ffffff; border: 2px solid #0f5132;';
        } else if (totGanancia < 0) {
          elGanancia.style.cssText = 'background-color: #dc3545; color: #ffffff; border: 2px solid #842029;';
        } else {
          elGanancia.style.cssText = 'background-color: #cfe2ff; color: #084298; border: 2px solid #0d6efd;';
        }
      }

      const margen = totSub > 0 ? (totGanancia / totSub) * 100 : 0;
      const elEstado = document.getElementById('lic-estado-general');
      if (elEstado) {
        elEstado.innerText = `Rentabilidad General: ${margen.toFixed(2)}%`;
        elEstado.className = `fw-bold fs-5 ${totGanancia > 0 ? 'text-success' : (totGanancia < 0 ? 'text-danger' : 'text-secondary')}`;
      }
    };

    // --- PUNTOS 4 Y 5: GUARDADO DE EVALUACIÓN Y TABLA DE LICITACIONES CON COLORES DE ESTADO ---
    function obtenerLicitacionesLocales() {
      const data = localStorage.getItem('fabmat_evaluaciones_licitacion');
      if (data) {
        try { return JSON.parse(data); } catch (e) {}
      }
      return [];
    }

    function guardarLicitacionesLocales(lista) {
      localStorage.setItem('fabmat_evaluaciones_licitacion', JSON.stringify(lista));
    }

    window.guardarLicitacion = function() {
      // 1. Sincronizar todos los valores escritos en las celdas antes de guardar
      sincronizarInputsConMemoriaLicitacion();
      recalcularTotalesLicitacion();

      // 2. Si el usuario escribió una entidad en la casilla 1° pero no presionó "+ Añadir", registrarla automáticamente
      const nuevaEntTxt = (document.getElementById('lic-nueva-entidad')?.value || '').trim().toUpperCase();
      if (nuevaEntTxt) {
        registrarEntidadPublica('lic-nueva-entidad');
      }

      let entidad = (document.getElementById('lic-entidad')?.value || '').trim();
      if (!entidad) {
        entidad = 'ENTIDAD PÚBLICA GENERAL';
      }

      // 3. Si el usuario dejó vacío el Título de la Licitación, generarlo automáticamente con los productos de la matriz
      let titulo = (document.getElementById('lic-titulo')?.value || '').trim();
      if (!titulo) {
        const nombresItems = itemsLicitacion.map(i => (i.desc || '').trim()).filter(Boolean);
        titulo = nombresItems.length > 0 ? nombresItems.join(' + ') : 'Evaluación de Subasta #' + (obtenerLicitacionesLocales().length + 1);
      }

      const editId = document.getElementById('lic-edit-id')?.value || '';
      const totCosto = parseFloat(document.getElementById('lic-tot-costo')?.innerText) || 0;
      const totSub = parseFloat(document.getElementById('lic-tot-sub')?.innerText) || 0;
      const totGanancia = parseFloat(document.getElementById('lic-tot-ganancia')?.innerText) || 0;

      let lista = obtenerLicitacionesLocales();
      let registro = null;

      if (editId) {
        const idx = lista.findIndex(x => String(x.id) === String(editId));
        if (idx !== -1) {
          lista[idx].entidad = entidad;
          lista[idx].titulo = titulo;
          lista[idx].iva = document.getElementById('lic-iva-perc')?.value || '3';
          lista[idx].costo_total = totCosto;
          lista[idx].subasta_total = totSub;
          lista[idx].ganancia_neta = totGanancia;
          lista[idx].items = JSON.parse(JSON.stringify(itemsLicitacion));
          registro = lista[idx];
        }
      }

      if (!registro) {
        registro = {
          id: 'LIC-' + Date.now(),
          fecha: new Date().toISOString(),
          entidad: entidad,
          titulo: titulo,
          iva: document.getElementById('lic-iva-perc')?.value || '3',
          costo_total: totCosto,
          subasta_total: totSub,
          ganancia_neta: totGanancia,
          estado: 'Pendiente',
          items: JSON.parse(JSON.stringify(itemsLicitacion)),
          usuario: state.usuarioActual ? state.usuarioActual.nombre : 'Cristian FabMat'
        };
        lista.unshift(registro);
      }

      guardarLicitacionesLocales(lista);

      // Cerrar el modal y llevar a la vista de Licitaciones para ver la fila guardada
      const modalEl = document.getElementById('modalLicitacionNuevo');
      if (modalEl) {
        const modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInst.hide();
      }

      cambiarVista('licitaciones', document.querySelector("button[onclick*=\"'licitaciones'\"]"));
      cargarLicitaciones();
      mostrarAlerta(`Evaluación "${titulo}" (${entidad}) guardada exitosamente.`, 'success');
    };

    window.cambiarEstadoLicitacion = function(id, nuevoEstado, selectEl) {
      const lista = obtenerLicitacionesLocales();
      const item = lista.find(x => String(x.id) === String(id));
      if (item) {
        item.estado = nuevoEstado;
        guardarLicitacionesLocales(lista);
      }
      aplicarColorSelectEstadoLicitacion(selectEl, nuevoEstado);
    };

    function aplicarColorSelectEstadoLicitacion(selectEl, estado) {
      if (!selectEl) return;
      if (estado === 'Adjudicado') {
        selectEl.style.cssText = 'background-color: #198754; color: #ffffff; border: 2px solid #0f5132; font-weight: 700; border-radius: 6px;';
      } else if (estado === 'No Adjudicado') {
        selectEl.style.cssText = 'background-color: #dc3545; color: #ffffff; border: 2px solid #842029; font-weight: 700; border-radius: 6px;';
      } else {
        selectEl.style.cssText = 'background-color: #ffc107; color: #212529; border: 2px solid #d39e00; font-weight: 700; border-radius: 6px;';
      }
    }

    window.verEditarLicitacion = function(id) {
      const lista = obtenerLicitacionesLocales();
      const lic = lista.find(x => String(x.id) === String(id));
      if (!lic) return;
      prepararModalLicitacion(lic);
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLicitacionNuevo')).show();
    };

    window.eliminarEvaluacionLicitacion = function(id) {
      if (!confirm('¿Estás seguro de eliminar esta evaluación de licitación?')) return;
      let lista = obtenerLicitacionesLocales();
      lista = lista.filter(x => String(x.id) !== String(id));
      guardarLicitacionesLocales(lista);
      cargarLicitaciones();
    };

    window.filtrarTablaLicitacionesPorEntidad = function(entidadFiltro) {
      cargarLicitaciones(entidadFiltro);
    };

    window.cargarLicitaciones = function(entidadFiltro = '') {
      cargarSelectEntidades();
      const tbody = document.getElementById('tabla-licitaciones-body');
      if (!tbody) return;

      let lista = obtenerLicitacionesLocales();
      const countEl = document.getElementById('lic-count-total');
      if (countEl) countEl.innerText = lista.length;

      if (entidadFiltro) {
        lista = lista.filter(x => x.entidad === entidadFiltro);
      }

      if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Aún no hay evaluaciones guardadas</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      lista.forEach(lic => {
        const fechaFormat = lic.fecha ? new Date(lic.fecha).toLocaleDateString('es-BO') : '--';
        const subTotal = lic.subasta_total !== undefined ? lic.subasta_total : (lic.adjudicado_total || 0);
        const ganancia = Number(lic.ganancia_neta) || 0;
        const colorGanancia = ganancia > 0 ? 'text-success' : (ganancia < 0 ? 'text-danger' : 'text-dark');
        const estadoActual = lic.estado || 'Pendiente';

        let estiloSelect = 'background-color: #ffc107; color: #212529; border: 2px solid #d39e00; font-weight: 700; border-radius: 6px;';
        if (estadoActual === 'Adjudicado') {
          estiloSelect = 'background-color: #198754; color: #ffffff; border: 2px solid #0f5132; font-weight: 700; border-radius: 6px;';
        } else if (estadoActual === 'No Adjudicado') {
          estiloSelect = 'background-color: #dc3545; color: #ffffff; border: 2px solid #842029; font-weight: 700; border-radius: 6px;';
        }

        tbody.innerHTML += `
          <tr>
            <td class="text-muted small fw-semibold">${fechaFormat}</td>
            <td><span class="badge bg-primary bg-opacity-10 text-primary border border-primary fw-bold px-2 py-1">${lic.entidad || 'SIN ENTIDAD'}</span></td>
            <td class="fw-bold text-dark">${lic.titulo || '--'}</td>
            <td class="text-end fw-semibold" style="color: #92400e;">Bs ${Number(lic.costo_total || 0).toFixed(2)}</td>
            <td class="text-end fw-bold" style="color: #15803d;">Bs ${Number(subTotal).toFixed(2)}</td>
            <td class="text-end fw-bold fs-6 ${colorGanancia}">Bs ${ganancia.toFixed(2)}</td>
            <td class="text-center">
              <select class="form-select form-select-sm text-center shadow-sm" style="${estiloSelect}" onchange="cambiarEstadoLicitacion('${lic.id}', this.value, this)">
                <option value="Pendiente" style="background-color: #ffc107; color: #212529; font-weight: bold;" ${estadoActual === 'Pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                <option value="Adjudicado" style="background-color: #198754; color: #ffffff; font-weight: bold;" ${estadoActual === 'Adjudicado' ? 'selected' : ''}>✅ Adjudicado</option>
                <option value="No Adjudicado" style="background-color: #dc3545; color: #ffffff; font-weight: bold;" ${estadoActual === 'No Adjudicado' ? 'selected' : ''}>❌ No Adjudicado</option>
              </select>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="verEditarLicitacion('${lic.id}')" title="Abrir / Editar Evaluación"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarEvaluacionLicitacion('${lic.id}')" title="Eliminar"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      });
    };