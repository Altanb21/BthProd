const createGame = () => {
  const coefficient = coefficientFunc(0, 15)
  const gameTime = coefficient * 2

  const gameData = {
    coefficient, gameTime
  }
  
  return gameData
}

module.exports = createGame