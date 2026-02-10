// ==========================
// Cargar y procesar el CSV
// ==========================

fetch('ventas_raw.csv')
    .then(res => res.text())
    .then(text => procesarCSV(text));

function procesarCSV(texto) {
    const filas = texto.trim().split('\n');
    const headers = filas[0].split(',');

    let rawData = filas.slice(1).map(fila => {
        const valores = fila.split(',');
        let obj = {};
        headers.forEach((h, i) => obj[h.trim()] = valores[i]?.trim());
        return obj;
    });

    mostrarTabla(rawData.slice(0, 10), 'tabla-raw');

    const antes = rawData.length;
    const cleanData = limpiarDatos(rawData);
    const despues = cleanData.length;

    document.getElementById('filas-info').innerText =
        `Filas antes de limpieza: ${antes} | Filas después de limpieza: ${despues}`;

    mostrarTabla(cleanData.slice(0, 10), 'tabla-clean');
    calcularKPIs(cleanData);
    crearGraficos(cleanData);
    prepararDescarga(cleanData);
}

// ==========================
// Limpieza de datos
// ==========================

function limpiarDatos(data) {
    const vistos = new Set();

    return data.filter(row => {
        // Fecha válida
        const fecha = new Date(row.fecha);
        if (isNaN(fecha)) return false;
        row.fecha = fecha.toISOString().split('T')[0];

        // Producto
        if (!row.producto) return false;
        row.producto = row.producto.trim().toLowerCase();

        // Franja
        row.franja = row.franja?.toLowerCase();
        row.franja = row.franja.includes('desa') ? 'Desayuno' : 'Comida';

        // Familia
        const fam = row.familia?.toLowerCase();
        if (fam?.includes('beb')) row.familia = 'Bebida';
        else if (fam?.includes('entra')) row.familia = 'Entrante';
        else if (fam?.includes('prin')) row.familia = 'Principal';
        else if (fam?.includes('post')) row.familia = 'Postre';
        else return false;

        // Numéricos
        row.unidades = Number(row.unidades);
        row.precio_unitario = Number(row.precio_unitario);
        if (row.unidades <= 0 || row.precio_unitario <= 0) return false;

        // Recalcular importe
        row.importe = +(row.unidades * row.precio_unitario).toFixed(2);

        // Eliminar duplicados
        const clave = JSON.stringify(row);
        if (vistos.has(clave)) return false;
        vistos.add(clave);

        return true;
    });
}

// ==========================
// KPIs
// ==========================

function calcularKPIs(data) {
    const ventasTotales = data.reduce((sum, r) => sum + r.importe, 0);
    const unidadesTotales = data.reduce((sum, r) => sum + r.unidades, 0);

    document.getElementById('kpi-ventas').innerHTML =
        `<strong>Ventas totales</strong><br>€ ${ventasTotales.toFixed(2)}`;

    document.getElementById('kpi-unidades').innerHTML =
        `<strong>Unidades totales</strong><br>${unidadesTotales}`;
}

// ==========================
// Gráficos
// ==========================

function crearGraficos(data) {
    // Agrupaciones
    const porProducto = {};
    const porFranja = {};
    const porFamilia = {};

    data.forEach(r => {
        porProducto[r.producto] = (porProducto[r.producto] || 0) + r.importe;
        porFranja[r.franja] = (porFranja[r.franja] || 0) + r.importe;
        porFamilia[r.familia] = (porFamilia[r.familia] || 0) + r.importe;
    });

    // Top 5 productos
    const topProductos = Object.entries(porProducto)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    new Chart(document.getElementById('chartTopProductos'), {
        type: 'bar',
        data: {
            labels: topProductos.map(p => p[0]),
            datasets: [{
                label: 'Importe (€)',
                data: topProductos.map(p => p[1])
            }]
        }
    });

    new Chart(document.getElementById('chartFranja'), {
        type: 'pie',
        data: {
            labels: Object.keys(porFranja),
            datasets: [{
                data: Object.values(porFranja)
            }]
        }
    });

    new Chart(document.getElementById('chartFamilia'), {
        type: 'pie',
        data: {
            labels: Object.keys(porFamilia),
            datasets: [{
                data: Object.values(porFamilia)
            }]
        }
    });
}

// ==========================
// Tablas
// ==========================

function mostrarTabla(data, id) {
    if (!data.length) return;

    const table = document.getElementById(id);
    table.innerHTML = '';

    const headers = Object.keys(data[0]);
    const thead = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.innerText = h;
        thead.appendChild(th);
    });
    table.appendChild(thead);

    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            td.innerText = row[h];
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

// ==========================
// Descargar CSV limpio
// ==========================

function prepararDescarga(data) {
    document.getElementById('download').onclick = () => {
        const headers = Object.keys(data[0]).join(',');
        const filas = data.map(r => Object.values(r).join(','));
        const csv = [headers, ...filas].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'ventas_clean.csv';
        a.click();

        URL.revokeObjectURL(url);
    };
}
