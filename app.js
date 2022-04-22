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

    const isAdminAccounts = await User.find({ typeUser: 'Admin' }).countDocuments() > 0;

    if (!isAdminAccounts) {

      const passOne = await bcrypt.hash('5555', 8);
      const passTwo = await bcrypt.hash('7755', 8);

      const users = [
        {
          login: 'Admin',
          typeUser: 'Admin',
          password: passOne,
          registerDate: new Date(),
        }, 
        {
          login: 'SuperAdmin',
          typeUser: 'Admin',
          password: passTwo,
          registerDate: new Date(),
        }
      ];

      await User.insertMany(users);

      console.log('Admins creared');
    }

  } catch (e) {
    console.log('Server Error: Error to connect to DataBase. Details:', e.message)
    process.exit(1)
  }
}

start()

let server = app.listen(PORT, () => {
  console.log('Server has been started on port ' + PORT)
})

require('./sockets')(server);

cronFunctions();