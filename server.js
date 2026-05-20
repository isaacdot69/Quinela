const express = require('express');
const mongoose = require('mongoose');
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

app.get('/ver-resultados', async (req, res) => {
    try {
        const resultados = await Quinela.find().sort({ fecha: -1 });
        let html = `<html><head><title>Resultados</title><style>body{font-family:sans-serif;text-align:center;padding:20px;}table{margin:auto;border-collapse:collapse;width:90%;}th,td{padding:10px;border:1px solid #ddd;}th{background:#28a745;color:white;}</style></head><body>`;
        html += `<h1>📈 Participantes</h1><table><tr><th>Nombre</th><th>Fecha</th><th>Pronósticos</th></tr>`;
        resultados.forEach(q => {
            html += `<tr><td>${q.nombre}</td><td>${new Date(q.fecha).toLocaleString()}</td><td>${JSON.stringify(q.pronosticos)}</td></tr>`;
        });
        html += `</table><br><a href="/">Volver</a></body></html>`;
        res.send(html);
    } catch (error) { res.send("Error"); }
});

app.listen(port, () => console.log(`🚀 Servidor en http://localhost:${port}`));