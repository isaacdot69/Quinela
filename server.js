const express = require('express');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs'); // 👈 1. Importamos la librería para Excel
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

const mongoURI = 'mongodb+srv://ig27sales_db_user:LfYYeM8SldwkXT9L@cluster0.a7nleu1.mongodb.net/quinela?appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch(err => console.error("❌ Error de conexión", err));

// Esquema actualizado con nombre
const Quinela = mongoose.model('Quinela', {
    nombre: String,
    pronosticos: Object,
    fecha: { type: Date, default: Date.now }
});

// Ruta para recibir los datos desde el frontend
app.post('/enviar-quinela', async (req, res) => {
    try {
        const { nombre, pronosticos } = req.body;
        const nuevaQuinela = new Quinela({ nombre, pronosticos });
        await nuevaQuinela.save();
        res.json({ mensaje: "¡Pronóstico registrado! Ahora envía tu comprobante." });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al guardar" });
    }
});

// 👈 2. NUEVA RUTA: Generar y descargar el archivo Excel
app.get('/exportar-excel', async (req, res) => {
    try {
        // Traer todas las quinelas ordenadas por fecha reciente
        const resultados = await Quinela.find().sort({ fecha: -1 }).lean();

        // Crear el libro de trabajo y una pestaña llamada "Participantes"
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Participantes');

        // Configurar los encabezados de las columnas
        worksheet.columns = [
            { header: 'Nombre del Participante', key: 'nombre', width: 30 },
            { header: 'Fecha de Registro', key: 'fecha', width: 25 },
            { header: 'Pronósticos (Raw JSON)', key: 'pronosticos', width: 40 }
        ];

        // Mapear los datos de MongoDB hacia las filas de Excel
        resultados.forEach(q => {
            worksheet.addRow({
                nombre: q.nombre,
                fecha: new Date(q.fecha).toLocaleString(),
                pronosticos: JSON.stringify(q.pronosticos) // Guarda el objeto de elecciones como texto legible
            });
        });

        // Aplicar un estilo rápido al encabezado (Opcional, para que se vea pro)
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '107C41' } // Verde característico de Excel
        };

        // Configurar las cabeceras HTTP para forzar la descarga en el navegador
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Quinelas_Mundial.xlsx'
        );

        // Escribir el archivo directamente en la respuesta del servidor
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error al exportar Excel:", error);
        res.status(500).send("Error al generar el archivo Excel");
    }
});

// Ruta para ver la tabla en HTML
app.get('/ver-resultados', async (req, res) => {
    try {
        const resultados = await Quinela.find().sort({ fecha: -1 });
        
        // Añadí un botón verde estilizado de Excel arriba de la tabla para descargar directo
        let html = `<html><head><title>Resultados</title>
        <style>
            body{font-family:sans-serif;text-align:center;padding:20px; background: #f8f9fa;}
            table{margin:auto;border-collapse:collapse;width:90%; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;}
            th,td{padding:12px;border:1px solid #eee;}
            th{background:#28a745;color:white;}
            .btn-excel { display: inline-block; padding: 10px 20px; background: #107c41; color: white; text-decoration: none; font-weight: bold; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
            .btn-excel:hover { background: #0b592e; }
            .btn-volver { display: inline-block; margin-top: 20px; color: #555; text-decoration: none; }
        </style></head><body>`;
        
        html += `<h1>📈 Participantes Registrados</h1>`;
        
        // 👈 Botón que apunta directo a nuestra nueva ruta de descarga
        html += `<a href="/exportar-excel" class="btn-excel">📊 Descargar Reporte Excel</a>`;
        
        html += `<table><tr><th>Nombre</th><th>Fecha</th><th>Pronósticos</th></tr>`;
        resultados.forEach(q => {
            html += `<tr><td>${q.nombre}</td><td>${new Date(q.fecha).toLocaleString()}</td><td>${JSON.stringify(q.pronosticos)}</td></tr>`;
        });
        html += `</table><br><a href="/" class="btn-volver">← Volver al Inicio</a></body></html>`;
        
        res.send(html);
    } catch (error) { res.send("Error"); }
});

app.listen(port, () => console.log(`🚀 Servidor en http://localhost:${port}`));