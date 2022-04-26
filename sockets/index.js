module.exports = async (server) => {
    function generateNumber(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async function generateKef() {
        async function getCurrentKef(type='Bots') {
            let settings = await modelSetting.findOne({ name: `Numbers-${type}` }, { data: 1 }).lean();

            if (settings) {
                let arr = settings.data;
                let indexTrue = arr.findIndex(item => item.status === true);

                let num;

                if (indexTrue === -1) {
                    arr[0].status = true;
                    num = arr[0].val;
                } else if (indexTrue === arr.length - 1) {
                    arr[arr.length - 1].status = false;
                    arr[0].status = true;
                    num = arr[0].val;
                } else {
                    arr[indexTrue + 1].status = true;
                    arr[indexTrue].status = false;
                    num = arr[indexTrue + 1].val;
                }

                await modelSetting.findOneAndUpdate({ _id: settings._id }, { data: arr });

                return num;
            }

            return false;

        }

        let kef;

        let minVal = 100;
        let maxVal = 2000;

        let num = false;
        if (currentGameRealPlayers.length > 0) {
            num = await getCurrentKef('Users');
        } else {
            num = await getCurrentKef('Bots');
        }

        if (num) return num * 100;

        return generateNumber(minVal, maxVal);
    }

    async function getMessages() {
        let now = new Date();
        const messages = await msg.find({ date: { $lte: now } }).sort({ date: 1 }).lean();
        return messages;
    }
    async function getDataForNewConnection(userName) {
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

        let balance = false;
        if (userName) {
            balance = await getBalance(io, userName, false);
        }

        
        return { arrMsgs: messages, curRes: results, curStatus: statusGame, curVal: currentValue, curCount: count, curPlayers, balance };
    }
    async function gameStart(io) {

        async function getDataBetsForUsersAndBots() {
            let bots = await getBots();
            //number: numberGame, login: infoUser.user.userName, currency: data.currencyBet, kef: data.kefBet, amount: data.sumBet

            /* console.log(`REAL-PLAYERS: `);
            console.log(realPlayers); */

            currentGameRealPlayers = [];

            for (let row of realPlayers) {
                if (row.number <= currentGame.number + 1) {
                    bots.push({
                        login: row.login,
                        kef: row.kef,
                        amount: row.amount,
                        currency: row.currency
                    })
                    currentGameRealPlayers.push({
                        kef: row.kef,
                        amount: row.amount,
                        currency: row.currency
                    })
                }
            }

            /* console.log('BOTS: ');
            console.log(bots); */

            return bots;
        }
        async function getPlayersFromUsersAndBots() {
            let players = bots.map(row => { return { u: row.login, c: row.currency } });
            return players;
        }

        if (timer) {
            clearInterval(timer);
        }
      
        console.log('Инициализировали игру ...');
      
        timer = setInterval(() => {
      
      
            async function getData() {
      
                if (!statusGame) {

                    let num = await modelGame.countDocuments() + 1;

                    currentGame = {
                        number: num,
                        date: new Date(),
                        bets: []
                    }
                    
                    statusGame = 'Game';
                    currentTimePause = 5000;
                    currentTimeResults = 3000;
                    currentValue = 100;
                    count = 0;
                    stepGame = 1;
            
                    // Нужно сгенерировать игроков и их ставки... 
                    bots = await getDataBetsForUsersAndBots();

                    kef = await generateKef();

                    infoPlayers = await bidPlayers(bots, kef);
                    sourceInfoPlayers = infoPlayers;
                    winPlayers = [];
            
                    //console.log(`\nNew Game: ${kef}\n`);

                    currentGame.bets = infoPlayers;
                    
                    let obj = { p: infoPlayers };

                    changeGameStatus(io, 'Game');
                    io.emit('gst', obj);
        
                } else if (statusGame == 'Game') {
        
                    // Сначала проверяем есть ли игроки, которые выйграли ...
                    for (let user of infoPlayers) {
                        if (user.k <= currentValue) {
                            let win = { u: user.u, k: user.k };
                            winPlayers.push(win);

                            let userInfo = sourceInfoPlayers.find(row => row.u === win.u);

                            let amount = Number(userInfo.a) * ((userInfo.k / 100).toFixed(2));
                            await changeBalance(userInfo.u, userInfo.c, amount);
                            await getBalance(io, userInfo.u);

                            io.emit('pw', win);
                        }
                    }
                    infoPlayers = infoPlayers.filter(user => user.k > currentValue);
        
                    if (currentValue >= kef) {

                        if (Object.keys(currentGame).length > 0) {
                            currentGame.bets = currentGame.bets.map(item => {
                                for (let row of winPlayers) {
                                    if (item.u === row.u) {
                                        item.status = true
                                        break;
                                    }
                                }
    
                                if (!('status' in item)) {
                                    item.status = false;
                                }
    
                                return item;
                            })
                            
                            if (currentGame.bets.length > 0) {
                                await modelGame.create(currentGame);
                            }
                        }

                        let num = await modelGame.countDocuments() + 1;
                        currentGame.number = num;
            
                        data = Math.trunc(kef);
                        io.emit('gs', data);
                        
                        statusGame = 'Results';
            
                        // Формируем массив результатов ...
                        results.push({ k: kef / 100 });
                        if (results.length > 8) results.shift();

                        changeGameStatus(io, 'Results');
            
                        // Отправляем результат
                        let obj = { v: kef, r: results };
                        io.emit('gc', obj);

                        for (let user of realPlayers) {
                            await getBalance(io, user.login);
                        }


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

                        realPlayers = realPlayers.filter(row => {
                            return row.number > currentGame.number
                        });
            
                        bots = await getDataBetsForUsersAndBots();
                        let players = await getPlayersFromUsersAndBots();

                        /* console.log(realPlayers);
                        console.log(currentGame.number); */
            
                        for (let row of players) {
                            playerBet(io, row);
                        }
            
                        if (players.length == 0) {
                            playerBet(io, null);
                        }
            
                        currentTimeResults = 0;

                        changeGameStatus(io, 'Pause');
            
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

    // Функция для отправки ставки игроков
    function playerBet(io, data) {
        io.emit('pb', data);
    }
    function changeGameStatus(io, status) {
        io.emit('cs', status);
    }

    async function changeBalance(login, currency, amount) {

        currency = String(currency).toLowerCase();

        let user = await modelUser.findOne({ login, typeUser: 'User' }, { balance: 1 }).lean();

        //console.log(` ------------------------------------ ${login} : ${amount}`);

        if (user) {
            user.balance[currency] += amount;

            await modelUser.findOneAndUpdate({ _id: user._id }, user);
        }

    }
    async function getBalance(io, login, emitBalance=true) {

        //console.log(`GET_BALANCE: ${login}`);

        let balance = false;

        let user = await modelUser.findOne({ login, typeUser: 'User' }, { balance: 1 }).lean();

        if (user) {

            balance = user.balance;

            if (emitBalance) {
                io.sockets.in(login).emit('updateBalance', user.balance);
            }
        }
        if (!emitBalance) return balance;
    }

    // Для ставок реальных игроков
    function authenticateJWT(token) {

        const accessTokenSecret = config.JWT_SECRET;

        let data = { ok: false, text: 'Failed to login' };

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if (err) {
                data = { ok: false, text: 'JWT Error' };
            }

            data = { ok: true, user };
        });

        return data;
    }
    async function checkBalance(userId, currency, amount) {

        currency = String(currency).toLowerCase();

        const userData = await modelUser.findOne({ _id: userId }, { balance: 1 });

        if (userData) {

            if (currency in userData.balance) {

                let sum = userData.balance[currency];
                
                if (sum >= Number(amount)) {

                    return { ok: true }

                }

                return { ok: false, text: 'Insufficient funds to bet' };
            }

            return { ok: false, text: 'Currency is not found' };

        }

        return { ok: false, text: 'User is not found' };

    }
    async function checkMinAmountAndMinOdds(amount, currency, odd) {
        let arrQuery = ['MinAmountOdds-ETH', 'MinAmountOdds-BTC', 'MinKefOdds'];

        let settings = await modelSetting.find({ name: { $in: arrQuery } }, { data: 1, name: 1 }).lean();

        let setAmountBTC = 1;
        let setAmountETH = 1;
        let setAmount = 1;
        let setOdd = 1.1;

        for (let row of settings) {
            if (row.name == 'MinAmountOdds-ETH') setAmountETH = row.data;
            if (row.name == 'MinAmountOdds-BTC') setAmountBTC = row.data;
            if (row.name == 'MinKefOdds') setOdd = row.data;
        }

        setAmount = setAmountBTC;
        if (currency == 'ETH') setAmount = setAmountETH;

        if (amount < setAmount) {
            return { ok: false, text: `The minimum bet amount in ${currency} is ${setAmount}` };
        }

        if (odd < setOdd) {
            return { ok: false, text: `The minimum odds for a bet is ${setOdd}` };
        }

        return { ok: true };
    }
    async function getMinAmountAndMinOdds() {
        let arrQuery = ['MinAmountOdds-BTC', 'MinAmountOdds-ETH', 'MinKefOdds'];

        let settings = await modelSetting.find({ name: { $in: arrQuery } }, { data: 1, name: 1 }).lean();

        let minAmountBTC = 0;
        let minAmountETH = 0;
        let minKef = 1;

        for (let row of settings) {
            if (row.name == 'MinAmountOdds-BTC') minAmountBTC = row.data;
            if (row.name == 'MinAmountOdds-ETH') minAmountETH = row.data;
            if (row.name == 'MinKefOdds') minKef = row.data;
        }

        return { minAmountBTC, minAmountETH, minKef };

    }

    const io = require('socket.io')(server, { cors: { origin: '*' } } );
    const jwt = require("jsonwebtoken");

    const config = require('../config');

    const msg = require('../models/ChatMessage');
    const modelUser = require('../models/User');
    const modelGame = require('../models/Game');
    const modelSetting = require('../models/Settings');

    const getBots = require('../vendor/getBots');
    const bidPlayers = require('../vendor/bidPlayers');

    /***
     *  У игры может быть 3 состояния:
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
    let currentGameRealPlayers = [];
    let sourceInfoPlayers = [];
    let realPlayers = [];
    let infoPlayers = [];
    let winPlayers = [];

    let currentGame = {};

    let timer;

    let results = [];

    // Sockets
    io.on('connection', async (socket) => {
        const now = new Date();
        const dateLog = `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU')}`;
        console.log(`[${dateLog}] - connection new user`);

        const auth = socket.handshake.auth;
        let token;
        let userName;
        if (auth) token = auth.token;

        if (token) {
            let data = authenticateJWT(token);
            if (!data.ok) {
                socket.emit('logout');
            } else {
                userName = data.user.userName;
            }
        }
        
    
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
        
        socket.on('setBet', async (data) => {
            //console.log(`[${dateLog}] - newBet`);

            // Проверяем авторизацию юзера
            const token = data.token;
            const infoUser = authenticateJWT(token);
            if (!infoUser.ok) {
                socket.emit('setBet:result', { ok: false, text: infoUser.text, access: false });
                return;
            }

            // Проверяем минимум по ставке и кэфу
            const statusBet = await checkMinAmountAndMinOdds(data.sumBet, data.currencyBet, data.kefBet);
            if (!statusBet.ok) {
                socket.emit('setBet:result', { ok: false, text: statusBet.text });
                return;
            }

            // Проверяем балан юзера
            const infoBalance = await checkBalance(infoUser.user.userId, data.currencyBet, data.sumBet);
            if (!infoBalance.ok) {
                socket.emit('setBet:result', { ok: false, text: infoBalance.text });
                return;
            }

            let numberGame = currentGame.number + 1;
            const userLogin = infoUser.user.userName;

            let isPlayerBet = realPlayers.find(row => {
                return row.login === userLogin && row.number === numberGame
            });
            if (isPlayerBet || (infoPlayers.length - realPlayers.length) > 0) {
                if (statusGame == 'Game') {
                    numberGame = numberGame + 1;
                }/*  else {
                    socket.emit('setBet:result', { ok: false, text: 'Only one bet can be placed per game' });
                    return
                } */
            }

            //console.log(`-------${userLogin} : ${numberGame}`);

            // Добавляем в массив ожидания игры ...
            realPlayers.push({ number: numberGame, login: userLogin, currency: data.currencyBet, kef: data.kefBet * 100, amount: data.sumBet });

            await changeBalance(userLogin, data.currencyBet, -data.sumBet);
            await getBalance(io, userLogin);
            

            if (!statusGame || statusGame == 'Results' || statusGame == 'Pause') {
                playerBet(io, { u: userLogin, c: data.currencyBet });
            }

            socket.emit('setBet:result', { ok: true });

            socket.emit('sb', userLogin);

            socket.join(userLogin);

        });

        socket.on('abortBet', async (data) => {
            const token = data.token;
            const infoUser = authenticateJWT(token);
            if (!infoUser.ok) {
                socket.emit('setBet:result', { ok: false, text: infoUser.text, access: false });
                return;
            }

            let win = { u: infoUser.user.userName, k: currentValue };
            winPlayers.push(win);

            let userInfo = sourceInfoPlayers.find(row => row.u === win.u);

            let amount = Number(userInfo.a) * ((win.k / 100).toFixed(2));
            await changeBalance(userInfo.u, userInfo.c, amount);
            await getBalance(io, userInfo.u);

            infoPlayers = infoPlayers.filter(user => user.u != infoUser.user.userName);

            io.emit('pw', win);

        });

        socket.on('getBalance', async () => {
            let balance = await getBalance(io, userName, false);
            const { minAmountBTC, minAmountETH, minKef } = await getMinAmountAndMinOdds();
            let data = { balance, minAmountBTC, minAmountETH, minKef };
            socket.emit('getBalance', data);
        })
    
        // То, что отправляем по умолчанию ...
        const data = await getDataForNewConnection(userName);

        socket.emit('connectionData', data);
    
        await gameStart(io);
    
    });

    return io;

}