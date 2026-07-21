const express = require('express');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs'); 
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

// Tu cadena de conexión a MongoDB Atlas
const mongoURI = 'mongodb+srv://ig27sales_db_user:LfYYeM8SldwkXT9L@cluster0.a7nleu1.mongodb.net/quinela?appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Conectado a MongoDB"))
    .catch(err => console.error("❌ Error de conexión", err));

// Esquema de Participantes
const Quinela = mongoose.model('Quinela', {
    nombre: String,
    pronosticos: Object,
    fecha: { type: Date, default: Date.now }
});

// Esquema de Partidos (Ajustado para aceptar la propiedad 'dia')
const Partido = mongoose.model('Partido', {
    id: Number,
    local: String,
    visitante: String,
    dia: String
});

// RUTA ADMINISTRATIVA: Borra todo lo viejo y carga los 10 partidos de la Jornada 2
app.post('/admin/actualizar-jornada', async (req, res) => {
    try {
        await Quinela.deleteMany({});
        console.log("🗑️ Registros de usuarios anteriores eliminados.");

        await Partido.deleteMany({});

        const partidosJornada2 = [
            { id: 1, local: "Atlante", visitante: "América", dia: "Viernes 21:00 PM" },
            { id: 2, local: "Tijuana", visitante: "León", dia: "Viernes 21:00 PM" },
            { id: 3, local: "Chivas", visitante: "Juárez", dia: "Sábado 17:00 PM" },
            { id: 4, local: "Toluca", visitante: "Cruz Azul", dia: "Sábado 18:30 PM" },
            { id: 5, local: "Santos", visitante: "Atlas", dia: "Sábado 21:00 PM" },
            { id: 6, local: "Tigres", visitante: "San Luis", dia: "Sábado 21:00 PM" },
            { id: 7, local: "Cruzeiro", visitante: "Botafogo", dia: "Domingo 13:00 PM" },
            { id: 8, local: "Flamengo", visitante: "Sao Paulo", dia: "Domingo 15:30 PM" },
            { id: 9, local: "Necaxa", visitante: "Rayados", dia: "Domingo 17:00 PM" },
            { id: 10, local: "Pachuca", visitante: "Querétaro", dia: "Domingo 19:00 PM" }
        ];

        await Partido.insertMany(partidosJornada2);

        res.json({ mensaje: "🚀 Sistema reiniciado: Registros limpiados y Jornada 2 cargada con éxito." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al reiniciar la jornada" });
    }
});

// RUTA: Envía los partidos al Frontend
app.get('/obtener-partidos', async (req, res) => {
    try {
        const partidos = await Partido.find().sort({ id: 1 });
        res.json(partidos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener partidos" });
    }
});

// RUTA: Recibe la quinela jugada por un participante
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

// RUTA: Genera el archivo Excel
app.get('/exportar-excel', async (req, res) => {
    try {
        const resultados = await Quinela.find().sort({ fecha: -1 }).lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Participantes');

        worksheet.columns = [
            { header: 'Nombre del Participante', key: 'nombre', width: 30 },
            { header: 'Fecha de Registro', key: 'fecha', width: 25 },
            { header: 'Pronósticos (Raw JSON)', key: 'pronosticos', width: 40 }
        ];

        resultados.forEach(q => {
            worksheet.addRow({
                nombre: q.nombre,
                fecha: new Date(q.fecha).toLocaleString(),
                pronosticos: JSON.stringify(q.pronosticos) 
            });
        });

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '107C41' } 
        };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Quinelas_Jornada.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).send("Error al generar el archivo Excel");
    }
});

// RUTA HTML: Panel de Administración
app.get('/ver-resultados', async (req, res) => {
    try {
        const resultados = await Quinela.find().sort({ fecha: -1 });
        
        let html = `<html><head><title>Resultados</title>
        <style>
            body{font-family:sans-serif;text-align:center;padding:20px; background: #f8f9fa;}
            table{margin:auto;border-collapse:collapse;width:90%; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;}
            th,td{padding:12px;border:1px solid #eee;}
            th{background:#28a745;color:white;}
            .btn-excel { display: inline-block; padding: 10px 20px; background: #107c41; color: white; text-decoration: none; font-weight: bold; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 14px; border: none; cursor: pointer; }
            .btn-excel:hover { background: #0b592e; }
            .btn-reiniciar { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; font-weight: bold; border-radius: 5px; margin-bottom: 20px; margin-left: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 14px; border: none; cursor: pointer; }
            .btn-reiniciar:hover { background: #a71d2a; }
            .btn-volver { display: inline-block; margin-top: 20px; color: #555; text-decoration: none; }
        </style></head><body>`;
        
        html += `<h1>📈 Participantes Registrados</h1>`;
        html += `<a href="/exportar-excel" class="btn-excel">📊 Descargar Reporte Excel</a>`;
        html += `<button id="btnReiniciarTodo" class="btn-reiniciar">⚠️ Cambiar/Reiniciar Jornada</button>`;
        
        html += `<table><tr><th>Nombre</th><th>Fecha</th><th>Pronósticos</th></tr>`;
        resultados.forEach(q => {
            html += `<tr><td>${q.nombre}</td><td>${new Date(q.fecha).toLocaleString()}</td><td>${JSON.stringify(q.pronosticos)}</td></tr>`;
        });
        html += `</table><br><a href="/" class="btn-volver">← Volver al Inicio</a>`;

        html += `
        <script>
            document.getElementById('btnReiniciarTodo').onclick = async () => {
                const password = prompt("Introduce la contraseña de administrador:");
                if (password !== 'admin123') { 
                    alert("❌ Contraseña incorrecta.");
                    return;
                }
                if (confirm("🚨 ¿Seguro que quieres BORRAR el historial de apuestas y cargar de nuevo los partidos limpios?")) {
                    try {
                        const res = await fetch('/admin/actualizar-jornada', { method: 'POST' });
                        const data = await res.json();
                        alert("🎉 " + data.mensaje);
                        location.reload();
                    } catch (e) {
                        alert("❌ Error al conectar con el servidor.");
                    }
                }
            };
        </script>
        `;

        html += `</body></html>`;
        
        res.send(html);
    } catch (error) { 
        res.send("Error al cargar la página de resultados"); 
    }
});

app.listen(port, () => console.log(`🚀 Servidor en http://localhost:${port}`));