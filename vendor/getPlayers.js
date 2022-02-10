const User = require('../models/User');

const getPlayers = async () => {
  const allUsers = await User.find({ typeUser: { $ne: 'Admin' } }).lean();
  let Players = []

  const thisDate = new Date()
  const dayWeek = thisDate.toLocaleDateString('en-CA', { weekday: 'short' }).replace('.', '');

  let usersFromDayWeek = allUsers.filter(row => {
    if (row.intevals[dayWeek].length > 0) {
      let arr = row.intevals[dayWeek];
      return okInterval = arr.find(rowArr => {
        let iStart = rowArr.start.split(':');
        let iEnd = rowArr.end.split(':');
        let start = new Date();
        let end = new Date();
        
        start.setHours(iStart[0], iStart[1], 0, 0);
        end.setHours(iEnd[0], iEnd[1], 0, 0);

        if (thisDate.getTime() >= start.getTime() && thisDate.getTime() < end.getTime()) return true
        return false;
      })
    }
  });

  Players = usersFromDayWeek.map(row => { return { login: row.login, currency: row.currency, id: row._id } });

  
  return Players
}

module.exports = getPlayers