const bidPlayers = async (players, kef) => {

  function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function randomAmount(min, max) {
    return Math.random() * (max - min) + min;
  }

  const users = players.map(row => {

    let luck = row.luck / 100;
    let random = Math.random();

    let winner = random < luck;

    let betKef = row.kef;
    
    // Генерация для бота
    if (!betKef) {
      (winner) ? betKef = (getRandom(100, kef - 0.1)) : betKef = getRandom(kef + 0.1, 2000);
    }

    let amount = row.amount;
    
    // Генерация для бота
    if (!amount) amount = Number(randomAmount(row.min, row.max)).toFixed(2);

    return {
      u: row.login,
      a: amount,
      k: betKef,
      c: row.currency
    }
  })


  return users
}

module.exports = bidPlayers