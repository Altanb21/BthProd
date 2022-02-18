const express = require('express');
const config = require('./config');
const mongoose = require('mongoose');
const path = require('path');

const { cronFunctions } = require('./cron/index');

const app = express();

if (config.IS_PRODUCTION) {
  const serveStatic = require('serve-static');
  const history = require('connect-history-api-fallback');

  app.use(history());
  app.use(serveStatic(path.join(__dirname, 'client')))
}

if (!config.IS_PRODUCTION) {
  const cors = require('cors');

  const corsOptions = {
    origin: '*', //'http://localhost:3000'
  }

  app.use(cors(corsOptions));
}

app.use(express.json({ extended: true }));

//app.use('/admin', express.static('../admin/build/index.html'))

app.use('/api/auth/', require('./routes/auth.routes'))
app.use('/api/find/', require('./routes/find.routes'))
app.use('/api/message/', require('./routes/message.routes'))
app.use('/api/game/', require('./routes/game.routes'))
app.use('/api/setting/', require('./routes/setting.routes'))

const PORT = config.PORT || 3000

async function start() {

  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }

  try {

    mongoose.connection
    .on('error', error => console.log(error))
    .on('close', () => console.log('Database connection closed.'))
    .once('open', async () => {
      const info = mongoose.connections[0];
      console.log(`Connected to ${info.host}:${info.port}/${info.name}`);
    });

    mongoose.connect(config.MONGO_URL, mongoOptions);

    const User = require('./models/User');
    const bcrypt = require("bcrypt");

    const hashedPassword = await bcrypt.hash('773322', 12)
    const registerDate = new Date()

    const userData = {
      email: 'admin@mail.ru',
      login: 'Admin',
      typeUser: 'Admin',
      password: hashedPassword,
      registerDate,
      luck: 99
    }

    await User.findOneAndUpdate({ login: userData.login }, { ...userData }, { upsert: true })
    console.log('Admin creared')

  } catch (e) {
    console.log('Server Error: Error to connect to DataBase. Details:', e.message)
    process.exit(1)
  }
}

start()

let server = app.listen(PORT, () => {
  console.log('Server has been started on port ' + PORT)
})
const io = require('socket.io')(server, { cors: { origin: '*' } })

const msg = require('./models/ChatMessage')
const getBots = require('./vendor/getBots')
const bidPlayers = require('./vendor/bidPlayers');

function generateNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function getMessages() {
  let now = new Date();
  const messages = await msg.find({ date: { $lte: now } }).sort({ date: 1 }).lean();
  return messages;
}

async function getDataForNewConnection() {
  const messages = await getMessages();

  return { messages, results, gameStatus: statusGame, curVal: currentValue, curCount: count, curPlayers: infoPlayers };
}


/**
 * У игры может быть 3 состояния:
 * 1. Идет игра (время неизвестно)
 * 2. Перерыв между играми (5 секунд)
 * 3. Вывод информации о результатах игры (3 секунды)
 * 
 * Каждые 100мс сервер должен кидать запрос на клиент с текущим результатом игры и игроками, которые выйграли, исходя из этого строится график
 * 
 * Если игра завершена кидаем состояние результат игры с результатом
 * 
 * Далее кидаем состояние с паузой между играми
 * 
 * Далее происходит инициализация новой игры:
 * 1. Получаем ботов и формируем их ставки исходя из параметров админки
 * 2. Генерируем число
 * 3. Кидаем состояние идет игра на клиент 
 */


let statusGame = null;
let kef = null;
let currentValue = 1;
let currentTimeResults = 5000;
let currentTimePause = 2000
let count = 0;

let data = {};

let stepGame = 1;
const updateTime = 100;

let infoPlayers = [];

let timer;

let results = [];

async function gameStart(io) {
  function setPlayers(profitStatus=false, betStatus=true) {
    return infoPlayers.map(row => {

      let userKef = '...';
      let profit = '...';
      let betAmount = Number(row.betAmount).toFixed(2);
      let betText = `${betAmount} ${row.currency}`;

      if (row.betKef <= currentValue) {
        userKef = Number(row.betKef).toFixed(2);
        profit = Number((userKef * betAmount) - betAmount).toFixed(2);
      } else {
        if (profitStatus) {
          profit = -betAmount;
          userKef = Number(row.betKef).toFixed(2);
        }
      }

      let profitText = `${profit} ${row.currency}`;

      if (!betStatus) {
        betText = '?';
        userKef = '...';
        profitText = '...';
      }

      return [ row.login, userKef, betText, profitText ];
    });
  }

  if (timer) {
    clearInterval(timer);
  }

  console.log('Инициализировали игру ...');

  timer = setInterval(() => {


    async function getData() {

      if (!statusGame) {

        kef = generateNumber(100, 2000);
        statusGame = 'Game';
        currentTimePause = 5000;
        currentTimeResults = 3000;
        currentValue = 100;
        count = 0;
        stepGame = 1;

        // Нужно сгенерировать игроков и их ставки... 
        const bots = await getBots()
        infoPlayers = await bidPlayers(bots, kef);

        console.log(`New Game: ${kef}\n`);

        data = { v: currentValue, s: statusGame, p: infoPlayers };

      } else if (statusGame == 'Game') {

        // Обновляем значение
        currentValue = currentValue + stepGame;
        if (Math.trunc(currentValue) % 10 == 0) {
          stepGame += 0.07;
        }

        if (currentValue >= kef) {
          
          statusGame = 'Results';

          data = { v: kef, s: statusGame };

          results.push({ kef: kef / 100 });
          if (results.length > 8) results.shift();

          data.r = results;
        } else {

          data = Math.trunc(currentValue);
        }

        count ++;

      } else if (statusGame == 'Results') {

        if (currentTimeResults == 0) {
          statusGame = 'Pause';
          data = { v: currentTimePause, s: statusGame };
        } else {
          data = currentTimeResults;
        }

        currentTimeResults -= updateTime;

      } else if (statusGame = 'Pause') {

        currentTimePause -= updateTime;
        if (currentTimePause == 0) {
          statusGame = null;
        }

        data = currentTimePause;

        
      }

      io.sockets.emit('g_s', data);
    }

    getData();

  }, updateTime);

}

cronFunctions();

// Sockets
io.on('connection', async (socket) => {
  const dateLog = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  console.log(`[${dateLog}] - connection new user`)

  socket.on('getMessage', async () => {
    const messages = await getMessages();
    socket.emit('getMessages', messages)
  });

  socket.on('sendMessage', async (msgs) => {

    const message = new msg({ ...msgs })
    await message.save()
    const messages = await getMessages();
    
    io.sockets.emit('getMessages', messages)
  });

  socket.on('connectToGame', () => {
    console.log(`[${dateLog}] - user connected to game`);
    // Должны посмотреть есть ли активная игра на сервере...
  });

  // То, что отправляем по умолчанию ...
  const data = await getDataForNewConnection();
  socket.emit('connectionData', data);

  await gameStart(io);

});