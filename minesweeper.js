#! /usr/bin/env node

const getArg = (args, name) => {
  const match = args.match(new RegExp('--' + name + '=(\\d+)'))

  if (match === null) {
    return null
  }

  return parseInt(match[1])
}

let width = 8
let height = 8
let mines = 10

try {
  const args = process.argv.slice(2).join(' ')
  width = getArg(args, 'width') || width
  height = getArg(args, 'height') || height
  mines = getArg(args, 'mines') || mines

  if (width < 1 || height < 1) {
    throw new Error('Field size must be positive')
  }
} catch (e) {
  console.error(e)
  process.exit(1)
}

const getNeighbouringCoords = (x, y) => [
  [y - 1, x - 1],
  [y - 1, x],
  [y - 1, x + 1],
  [y, x + 1],
  [y, x - 1],
  [y + 1, x - 1],
  [y + 1, x],
  [y + 1, x + 1],
].filter(([y, x]) => (
  y >= 0 && x >= 0 && x < width && y < height
))

const createMatrix = v => Array(width).fill([]).map(
  () => Array(height).fill(v)
)

let field = createMatrix(0)
// We'll overwrite this matrix later, hence `let`
let uncoveredField = createMatrix(false)
let flaggedField = createMatrix(false)

const checkIfWon = () => {
  return flaggedField.every(
    (row, y) => row.every(
      (cell, x) => {
        return (cell && field[y][x] === 'm')
          || (!cell && field[y][x] !== 'm')
      })
  )
}

const placeMines = () => {
  let minesLeft = mines

  while (minesLeft > 0) {
    const mineX = Math.round(Math.random() * (width - 1))
    const mineY = Math.round(Math.random() * (height - 1))

    if (field[mineY][mineX] !== 'm') {
      field[mineY][mineX] = 'm'

      getNeighbouringCoords(mineX, mineY)
        .filter(([y, x]) => field[y][x] !== 'm')
        .forEach(([y, x]) => {
          field[y][x]++
        })

      minesLeft--
    }
  }
}

const characterMap = {
  m: '💣',
  0: '⬜',
  1: '1️⃣ ',
  2: '2️⃣ ',
  3: '3️⃣ ',
  4: '4️⃣ ',
  5: '5️⃣ ',
  6: '6️⃣ ',
  7: '7️⃣ ',
  8: '8️⃣ ',
}

const renderField = (playerX, playerY) => {
  console.clear()
  console.log('🧱'.repeat(width + 2))
  for (let y = 0; y < height; y++) {
    let row = '🧱'
    for (let x = 0; x < width; x++) {
      if (x === playerX && y === playerY) {
        row += '\x1b[47m\x1b[30m'
      }

      if (flaggedField[y][x]) {
        row += '🚩'
      } else if (uncoveredField[y][x]) {
        row += characterMap[field[y][x]]
      } else {
        row += '  '
      }

      if (x === playerX && y === playerY) {
        row += '\x1b[0m'
      }
    }
    row += '🧱'
    console.log(row)
  }
  console.log('🧱'.repeat(width + 2))
  console.log('Press ENTER to uncover a field, SPACE to place a flag')
}

const uncoverCoords = (x, y) => {
  // Uncover the field by default
  uncoveredField[y][x] = true

  const neighbours = getNeighbouringCoords(x, y)

  // Only if the field is a 0, so if it has no adjacent mines,
  // ask its neighbours to uncover.
  if (field[y][x] === 0) {
    neighbours.forEach(([y, x]) => {
      // Only uncover fields that have not yet been uncovered.
      // Otherwise we would end up with an infinite loop.
      if (uncoveredField[y][x] !== true) {
        // Recursive call.
        uncoverCoords(x, y)
      }
    })
  }
}

let playerX = 0
let playerY = 0
let hasLost = false
let hasWon = false
placeMines()

renderField(playerX, playerY)

const readlineModule = require('readline')
readlineModule.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

process.stdin.on('keypress', (character, key) => {
  if (!hasLost && !hasWon) {
    // Do not move past right wall
    if (key.name === 'right' && playerX < width - 1) {
      playerX++
    }

    // Do not move past left wall
    if (key.name === 'left' && playerX > 0) {
      playerX--
    }

    // Do not move past down wall
    if (key.name === 'down' && playerY < height - 1) {
      playerY++
    }

    // Do not move past up wall
    if (key.name === 'up' && playerY > 0) {
      playerY--
    }

    // Uncovering fields
    if (key.name === 'return') {
      uncoverCoords(playerX, playerY)

      // The player seems to have found a mine
      if (field[playerY][playerX] === 'm') {
        hasLost = true

        // Uncover all fields in case the player has lost
        uncoveredField = Array(height).fill([]).map(() => Array(width).fill(true))
      }
    }

    // Placing a flag
    if (key.name === 'space') {
      flaggedField[playerY][playerX] = !flaggedField[playerY][playerX]

      hasWon = checkIfWon()
    }
  } else {
    if (key.name === 'return') {
      field = createMatrix(0)
      uncoveredField = createMatrix(false)
      flaggedField = createMatrix(false)
      playerX = 0
      playerY = 0
      hasLost = false
      hasWon = false
      placeMines()
    }
  }

  // Show the player what just happened on the field
  renderField(playerX, playerY)

  if (hasLost) {
    console.log('Lost :(\n')
    console.log('Press ENTER to play again? (Ctrl+C to abort)')
  }

  if (hasWon) {
    console.log('Won :)\n')
    console.log('Enjoying this? Consider buying me a coffee ☕: https://www.buymeacoffee.com/pthormeier')
    console.log('Press ENTER to play again? (Ctrl+C to abort)')
  }

  if (key.name === 'c' && key.ctrl) {
    process.exit(0)
  }
})
