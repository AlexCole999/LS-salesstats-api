const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/LS-salesstats', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// схема с явными полями
const GenericSchema = new mongoose.Schema({
  date: String,
  timestamp: Date
}, { strict: false });

const GenericModel = mongoose.model('Generic', GenericSchema);


app.get('/report/:date', async (req, res) => {
  try {
    const date = req.params.date;
    if (!date) return res.status(400).json({ error: 'Дата не указана' });

    const doc = await GenericModel.findOne({ date });
    if (!doc) return res.status(404).json({ error: 'Отчет не найден' });

    res.json(doc);
  } catch (error) {
    console.error('Ошибка при получении отчета:', error);
    res.status(500).json({ error: 'Ошибка при получении отчета' });
  }
});

// просто перезаписывает, если дата уже есть
app.post('/push', async (req, res) => {
  try {
    const data = req.body;
    const date = data.date;

    if (!date) {
      return res.status(400).json({ error: 'Дата не указана' });
    }

    // удаляем предыдущий отчёт за эту дату (если есть)
    await GenericModel.deleteOne({ date });

    // сохраняем новый
    const doc = new GenericModel(data);
    await doc.save();

    res.status(201).json({ message: `Отчет за ${date} сохранен` });
  } catch (error) {
    console.error('Ошибка при сохранении отчета:', error);
    res.status(500).json({ error: 'Ошибка при сохранении отчета' });
  }
});

app.get('/reportPeriod', async (req, res) => {
  try {
    const { start, end } = req.query;


    if (!start || !end) {
      return res.status(400).json({ error: 'Укажите начальную и конечную даты' });
    }

    // Выбираем все документы между start и end включительно
    const reports = await GenericModel.find({
      date: { $gte: start, $lte: end }
    });

    let totalIncomes = 0;
    let totalExpenses = 0;
    let overall = 0;

    reports.forEach(report => {
      totalIncomes += report.totalIncomes || 0;
      totalExpenses += report.totalExpenses || 0;
      overall += report.overall || 0;
    });

    const balance = overall - totalExpenses;

    res.json({
      totalIncomes,
      totalExpenses,
      overall,
      balance,
      count: reports.length,
      start,
      end
    });
  } catch (error) {
    console.error('Ошибка при получении отчетов по периоду:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
