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

  const curPlayers = bots.map(user => {

    let winUser = winPlayers.find(row => row.u === user.login);
    let isWin = winUser;

    let userInfo = sourceInfoPlayers.find(row => row.u === user.login);

    let amount = Number(userInfo.a);
    let currency = user.currency;
    let kef = '...';
    let profit = '...';
    if (isWin) {
      kef = Number(winUser.k / 100).toFixed(2);
      profit = Number(amount * kef - amount).toFixed(2);
    } else {
      if (statusGame === 'Results') {
        profit = -amount;
      }
    }

    let betAmount = `${amount} ${currency}`;
    let profitText = `${profit} ${currency}`;

    if (statusGame === 'Pause') {
      kef = '...';
      betAmount = '?';
      profitText = '...';

    }

    return [user.login, kef, betAmount, profitText];
  })

  return { arrMsgs: messages, curRes: results, curStatus: statusGame, curVal: currentValue, curCount: count, curPlayers };
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
let currentValue = 100;
let currentTimeResults = 5000;
let currentTimePause = 2000
let count = 0;

let data = {};

let stepGame = 1;
const updateTime = 120;

let bots = [];
let sourceInfoPlayers = [];
let infoPlayers = [];
let winPlayers = [];

let timer;

let results = [];

async function gameStart(io) {

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
        if (bots.length == 0) bots = await getBots();
        infoPlayers = await bidPlayers(bots, kef);
        sourceInfoPlayers = infoPlayers;
        winPlayers = [];

        console.log(`New Game: ${kef}\n`);

        //data = { v: currentValue, s: statusGame, p: infoPlayers };

        
        let obj = { p: infoPlayers };
        io.emit('gst', obj);


      } else if (statusGame == 'Game') {

        // Сначала проверяем есть ли игроки, которые выйграли ...
        infoPlayers = infoPlayers.filter(user => {
            if (user.k <= currentValue) {
              let win = { u: user.u, k: user.k };
              winPlayers.push(win);
              io.emit('pw', win);
            } else {
              return user;
            }
        });



        if (currentValue >= kef) {

          data = Math.trunc(currentValue);
          io.emit('gs', data);
          
          statusGame = 'Results';

          // Формируем массив результатов ...
          results.push({ k: kef / 100 });
          if (results.length > 8) results.shift();

          // Отправляем результат
          let obj = { v: kef, r: results };
          io.emit('gc', obj);

        } else {
          data = Math.trunc(currentValue);
          io.emit('gs', data);

          // Обновляем значение
          currentValue = currentValue + stepGame;
          if (Math.trunc(currentValue) % 10 == 0) {
            stepGame += 0.07;
          }

          count ++;
        }

      } else if (statusGame == 'Results') {

        if (currentTimeResults <= 0) {

          statusGame = 'Pause';
          bots = await getBots();

          let players = bots.map(row => { return { u: row.login, c: row.currency } });

          for (let row of players) {
            io.emit('pb', row);
          }

          if (players.length == 0) {
            io.emit('pb', null);
          }

          currentTimeResults = 0;

        }

        io.emit('gs', currentTimeResults);

        currentTimeResults -= updateTime;

      } else if (statusGame = 'Pause') {

        currentTimePause -= updateTime;
        if (currentTimePause <= 0) {
          statusGame = null;

          currentTimePause = 0;
        }

        io.emit('gs', currentTimePause);

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
    const messages = await getMessages();
    socket.emit('getMessages', messages)
  });

  socket.on('sendMessage', async (msgs) => {

    const message = new msg({ ...msgs })
    await message.save()
    const messages = await getMessages();
    
    io.emit('getMessages', messages)
  });

  // То, что отправляем по умолчанию ...
  const data = await getDataForNewConnection();
  socket.emit('connectionData', data);

  await gameStart(io);

});