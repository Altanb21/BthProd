const bidPlayers = async (players) => {
  const updateUser = []

  function addFactor(min, max) {
    let randomFloor = min + Math.random() * (max + 1 - min)

    return Math.floor(randomFloor)
  }

  function addBid(min, max) {
    let randomFactor = min + Math.random() * (max + 1 - min)
    randomFactor = String(randomFactor).substr(0, 4)
    const bid = Number(randomFactor)

    return Math.floor(bid)
  }

  players.forEach(el => {
    const output = addFactor(2, 5)
    const bid = addBid(0, 4)
    

    const user = {
      id: el._id,
      login: el.login,
      currency: el.currency,
      luck: el.luck,
      amountMax: el.amountMax,
      amountMin: el.amountMin,
      output,
      bid
    }

    updateUser.push(user)
  })


  return updateUser
}

module.exports = bidPlayers