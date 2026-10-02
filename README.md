# Sistema POS / ERP Institucional - Distribuidora FabMat

Sistema web de gestión comercial y control de inventarios desarrollado para Distribuidora FabMat, optimizado para el cumplimiento de normativas de contratación pública en Bolivia (SIGEP) y ventas minoristas.

## 🚀 Características Principales
- **Punto de Venta (POS):** Facturación rápida con soporte para productos simples y combos, cálculo de descuentos y control de inventario en tiempo real.
- **Módulo de Proformas (PDF Carta):** Generador de cotizaciones institucionales con especificaciones técnicas, marca y procedencia, cálculo automático de importes en palabras y formato de impresión optimizado para licitaciones.
- **Control de Concurrencia:** Verificación de precios en el servidor antes de consolidar ventas para evitar inconsistencias de catálogos desactualizados.
- **Optimización de Carga:** Filtros de rango de fechas y paginación para alto volumen de registros.
- **Gestión de Stock:** Alertas de stock crítico, registro inmutable de movimientos e historial de auditoría.
- **Control de Acceso (RBAC):** Separación de permisos entre roles (Administrador y Vendedor).
- **Respaldos Automáticos:** Copias de seguridad programadas diariamente en la nube.

## 🛠️ Tecnologías Utilizadas
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Chart.js, FontAwesome.
- **Backend:** Google Apps Script (Serverless API RESTful).
- **Base de Datos:** Google Sheets.

## ⚙️ Configuración Local
1. Clona el repositorio:
   ```bash
   git clone [https://github.com/TU-USUARIO/sistema-ventas-fabmat.git](https://github.com/TU-USUARIO/sistema-ventas-fabmat.git)