const bidPlayers = async (players, kef) => {

  function getRandom(min, max) {
    return Math.random() * (max - min) + min;
  }

  const users = players.map(row => {

    let luck = row.luck / 100;
    let random = Math.random();

    let winner = random < luck;

    let betKef;
    (winner) ? betKef = (getRandom(1, kef-0.01)) : betKef = getRandom(kef+0.01, 20);

    //console.log(`Bot: ${row.login} - ${betKef} - winner: ${winner} [ ${row.luck}% ]`);

    return {
      login: row.login,
      currency: row.currency,
      betAmount: getRandom(row.min, row.max),
      betKef
    }
  })


  return users
}

module.exports = bidPlayers