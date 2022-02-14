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
const { clearInterval } = require('timers');

function generateNumber(min, max) {
  return Math.random() * (max - min) + min;
}
async function getMessages() {
  const messages = await msg.find().sort({ date: 1 }).lean();
  return messages;
}

async function getDataForNewConnection() {
  const messages = await getMessages();

  return { messages, results };
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
let currentTimeResults = 3000;
let currentTimePause = 5000
let count = 0;

let data = {};

const stepGame = 1.01;
const updateTime = 100;

let players = [];
let infoPlayers = [];

let timer;

let results = [];

async function gameStart(socket) {

  if (timer) {
    clearInterval(timer);
  }

  console.log('Инициализировали игру ...');

  timer = setInterval(() => {

    async function getData() {

      if (!statusGame) {

        kef = generateNumber(1, 20);
        statusGame = 'Game';
        currentTimePause = 5000;
        currentTimeResults = 3000;
        currentValue = 1;
        count = 0;

        // Нужно сгенерировать игроков и их ставки... 
        const bots = await getBots()
        infoPlayers = await bidPlayers(bots, kef);

        console.log(`New Game: ${kef}\n`);

      } else if (statusGame == 'Game') {

        // Обновляем значение
        currentValue = currentValue * stepGame;
        count ++;
        if (currentValue >= kef) {
          statusGame = 'Results';
          data = { value: currentValue, gameStatus: statusGame, count };
        } else {
          data = { value: currentValue, gameStatus: statusGame, count };
        }

        players = infoPlayers.map(row => {

          let userKef = '...';
          let profit = '...';
          let betAmount = Number(row.betAmount).toFixed(2);
  
          if (row.betKef <= currentValue) {
            userKef = Number(row.betKef).toFixed(2);
            profit = Number((userKef * betAmount) - betAmount).toFixed(2);
          }
  
          return [ row.login, userKef, `${betAmount} ${row.currency}`, profit ];
        });

      } else if (statusGame == 'Results') {

        players = infoPlayers.map(row => {

          let userKef = Number(row.betKef).toFixed(2);
          let profit = '...';
          let betAmount = Number(row.betAmount).toFixed(2);

          if (row.betKef <= currentValue) {
            profit = Number((userKef * betAmount) - betAmount).toFixed(2);
          } else {
            profit = -betAmount;
          }

          return [ row.login, userKef, `${betAmount} ${row.currency}`, profit ];
        })
        

        currentTimeResults -= updateTime;
        if (currentTimeResults > 0) {
          data = { value: `Crashed @ ${Number(kef).toFixed(2)}`, gameStatus: statusGame };
        } else {
          statusGame = 'Pause';
          results.push({ kef });
          if (results.length > 8) results.shift();
        }

        data.results = results;

      } else if (statusGame = 'Pause') {
        currentTimePause -= updateTime;
        if (currentTimePause > 0) {
          data = { value: currentTimePause, gameStatus: statusGame };
        } else {
          statusGame = null;
        }

        players = [];
      }

      if (statusGame) {

        let nums = players.filter(row => row[1] !== '...');
        let texts = players.filter(row => row[1] === '...');

        nums.sort((a, b) => {
          let aa = Number(a[1]);
          let bb = Number(b[1]);
          if (aa > bb) return -1;
          if (aa > bb) return 1;
          return 0;
        });

        players = [...texts, ...nums];

        data.players = players;

        socket.emit('gameStep', data);

      }
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
    const messages = await msg.find().lean();
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

  await gameStart(socket);

});