// ============================================
// RACE TO 100 GAME - MAIN LOGIC
// ============================================

// Game state object
const GameState = {
    // Core game data
    scores: [0, 0],
    currentPlayer: 0,
    diceValues: [1, 1],
    gameActive: true,
    gameMode: '2players', // '2players' or 'vsComputer'
    computerDifficulty: 'medium', // 'easy', 'medium', 'hard'
    lastRollTime: null,
    
    // Available operations for combining dice
    operations: [
        { 
            name: "Two-digit (AB)", 
            calculate: (a, b) => parseInt(`${a}${b}`)
        },
        { 
            name: "Two-digit (BA)", 
            calculate: (a, b) => parseInt(`${b}${a}`)
        },
        { 
            name: "Add (A+B)", 
            calculate: (a, b) => a + b
        },
        { 
            name: "Multiply (A×B)", 
            calculate: (a, b) => a * b
        }
    ],
    
    // Save game state to localStorage
    saveToStorage: function() {
        const saveData = {
            scores: this.scores,
            currentPlayer: this.currentPlayer,
            gameMode: this.gameMode,
            computerDifficulty: this.computerDifficulty,
            lastSaved: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('raceTo100Save', JSON.stringify(saveData));
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    },
    
    // Load game state from localStorage
    loadFromStorage: function() {
        try {
            const savedData = localStorage.getItem('raceTo100Save');
            if (!savedData) return false;
            
            const data = JSON.parse(savedData);
            
            // Validate saved data
            if (!data.scores || !Array.isArray(data.scores) || data.scores.length !== 2) {
                return false;
            }
            
            // Apply loaded data
            this.scores = data.scores;
            this.currentPlayer = data.currentPlayer || 0;
            this.gameMode = data.gameMode || '2players';
            this.computerDifficulty = data.computerDifficulty || 'medium';
            
            // Update UI elements
            document.getElementById('gameMode').value = this.gameMode;
            document.getElementById('computerDifficulty').value = this.computerDifficulty;
            
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    },
    
    // Reset game to initial state
    resetGame: function() {
        this.scores = [0, 0];
        this.currentPlayer = 0;
        this.diceValues = [1, 1];
        this.gameActive = true;
        this.lastRollTime = null;
    }
};

// ============================================
// DOM ELEMENTS
// ============================================

const DOM = {
    // Dice elements
    die1: document.getElementById('die1'),
    die2: document.getElementById('die2'),
    diceTotal: document.getElementById('diceTotal'),
    
    // Score elements
    score1: document.getElementById('score1'),
    score2: document.getElementById('score2'),
    
    // Player elements
    player1: document.getElementById('player1'),
    player2: document.getElementById('player2'),
    player2Badge: document.getElementById('player2Badge'),
    
    // Control elements
    rollButton: document.getElementById('rollButton'),
    operationButtons: document.getElementById('operationButtons'),
    gameStatus: document.getElementById('gameStatus'),
    
    // Settings elements
    gameModeSelect: document.getElementById('gameMode'),
    computerDifficultySelect: document.getElementById('computerDifficulty'),
    newGameBtn: document.getElementById('newGameBtn'),
    saveGameBtn: document.getElementById('saveGameBtn'),
    saveStatus: document.getElementById('saveStatus')
};

// ============================================
// GAME INITIALIZATION
// ============================================

/**
 * Initialize the game when page loads
 */
function initGame() {
    // Initialize operation buttons
    initializeOperationButtons();
    
    // Set up event listeners
    setupEventListeners();
    
    // Try to load saved game
    const loaded = GameState.loadFromStorage();
    
    if (loaded) {
        updateScores();
        updatePlayerDisplay();
        updateGameStatus(`Game loaded! Player ${GameState.currentPlayer + 1}'s turn`);
        showSaveStatus('Game loaded successfully!', 'success');
    } else {
        updateGameStatus("Player 1's turn - Roll the dice!");
    }
    
    // Update player 2 badge based on game mode
    updatePlayer2Badge();
}

/**
 * Initialize operation buttons
 */
function initializeOperationButtons() {
    DOM.operationButtons.innerHTML = '';
    
    GameState.operations.forEach((op, index) => {
        const button = document.createElement('button');
        button.className = 'op-btn';
        button.id = `op${index}`;
        button.innerHTML = `
            <span class="operation-name">${op.name}</span>
            <span class="operation-value" id="opValue${index}">?</span>
        `;
        button.disabled = true;
        
        button.addEventListener('click', () => selectOperation(index));
        DOM.operationButtons.appendChild(button);
    });
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Roll button
    DOM.rollButton.addEventListener('click', rollDice);
    
    // New game button
    DOM.newGameBtn.addEventListener('click', startNewGame);
    
    // Save game button
    DOM.saveGameBtn.addEventListener('click', saveCurrentGame);
    
    // Game mode change
    DOM.gameModeSelect.addEventListener('change', function() {
        GameState.gameMode = this.value;
        updatePlayer2Badge();
        
        // If it's computer's turn and we switch to vsComputer mode
        if (GameState.gameMode === 'vsComputer' && GameState.currentPlayer === 1 && GameState.gameActive) {
            setTimeout(computerTurn, 1000);
        }
    });
    
    // Computer difficulty change
    DOM.computerDifficultySelect.addEventListener('change', function() {
        GameState.computerDifficulty = this.value;
    });
}

// ============================================
// GAME LOGIC FUNCTIONS
// ============================================

/**
 * Roll the dice
 */
function rollDice() {
    if (!GameState.gameActive) return;
    
    // Disable roll button and reset operation buttons
    DOM.rollButton.disabled = true;
    resetOperationButtons();
    
    // Animate dice rolling
    animateDiceRoll();
    
    // Generate random dice values after animation
    setTimeout(() => {
        GameState.diceValues = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];
        
        GameState.lastRollTime = Date.now();
        
        // Update dice display
        updateDiceDisplay();
        
        // Calculate and display operation values
        updateOperationValues();
        
        // If it's computer's turn and we're in vsComputer mode
        if (GameState.gameMode === 'vsComputer' && GameState.currentPlayer === 1) {
            // Enable operation buttons briefly so user can see options
            enableOperationButtons();
            updateGameStatus(`Computer is thinking...`);
            
            // Computer makes its move after a delay
            setTimeout(computerTurn, 1500);
        } else {
            // Enable operation buttons for human player
            enableOperationButtons();
            updateGameStatus(`Player ${GameState.currentPlayer + 1}, choose how to combine ${GameState.diceValues[0]} and ${GameState.diceValues[1]}`);
        }
        
    }, 800);
}

/**
 * Animate dice rolling
 */
function animateDiceRoll() {
    [DOM.die1, DOM.die2].forEach(die => {
        die.classList.add('dice-rolling');
        die.textContent = '?';
    });
    DOM.diceTotal.textContent = 'Total: ?';
}

/**
 * Update dice display with current values
 */
function updateDiceDisplay() {
    [DOM.die1, DOM.die2].forEach((die, index) => {
        die.textContent = GameState.diceValues[index];
        die.classList.remove('dice-rolling');
    });
    
    const total = GameState.diceValues[0] + GameState.diceValues[1];
    DOM.diceTotal.textContent = `Total: ${total}`;
}

/**
 * Update operation buttons with calculated values
 */
function updateOperationValues() {
    GameState.operations.forEach((op, index) => {
        const value = op.calculate(GameState.diceValues[0], GameState.diceValues[1]);
        const valueElement = document.getElementById(`opValue${index}`);
        if (valueElement) {
            // Create a descriptive string for the operation
            let description = '';
            const [a, b] = GameState.diceValues;
            
            switch(index) {
                case 0: // Two-digit (AB)
                    description = `= ${a}${b}`;
                    break;
                case 1: // Two-digit (BA)
                    description = `= ${b}${a}`;
                    break;
                case 2: // Add
                    description = `= ${a} + ${b}`;
                    break;
                case 3: // Multiply
                    description = `= ${a} × ${b}`;
                    break;
            }
            
            valueElement.textContent = description;
        }
    });
}

/**
 * Reset operation buttons to disabled state
 */
function resetOperationButtons() {
    const opButtons = document.querySelectorAll('.op-btn');
    opButtons.forEach(btn => {
        btn.disabled = true;
        btn.classList.remove('selected-operation');
    });
}

/**
 * Enable operation buttons
 */
function enableOperationButtons() {
    const opButtons = document.querySelectorAll('.op-btn');
    opButtons.forEach(btn => {
        btn.disabled = false;
    });
}

/**
 * Select an operation
 * @param {number} operationIndex - Index of the selected operation
 */
function selectOperation(operationIndex) {
    const points = GameState.operations[operationIndex].calculate(
        GameState.diceValues[0], 
        GameState.diceValues[1]
    );
    
    // Highlight selected operation
    const opButtons = document.querySelectorAll('.op-btn');
    opButtons.forEach(btn => btn.classList.remove('selected-operation'));
    opButtons[operationIndex].classList.add('selected-operation');
    
    // Apply the operation to current player's score
    applyPoints(points, operationIndex);
}

/**
 * Apply points to current player
 * @param {number} points - Points to add
 * @param {number} operationIndex - Index of the operation used
 */
function applyPoints(points, operationIndex) {
    const currentScore = GameState.scores[GameState.currentPlayer];
    const newScore = currentScore + points;
    
    // Disable operation buttons during processing
    resetOperationButtons();
    
    // Check if player busts (goes over 100)
    if (newScore > 100) {
        handleBust(points, newScore, currentScore);
        return;
    }
    
    // Update score
    GameState.scores[GameState.currentPlayer] = newScore;
    updateScores();
    
    // Check for win
    if (newScore === 100) {
        winGame();
        return;
    }
    
    // Continue game
    const operationName = GameState.operations[operationIndex].name;
    updateGameStatus(`Player ${GameState.currentPlayer + 1} added ${points} points (${operationName})`);
    
    setTimeout(() => {
        endTurn();
    }, 1000);
}

/**
 * Handle bust scenario (player goes over 100)
 */
function handleBust(points, newScore, currentScore) {
    const bustAmount = newScore - 100;
    const finalScore = Math.max(0, currentScore - bustAmount);
    GameState.scores[GameState.currentPlayer] = finalScore;
    
    // Animate bust
    const scoreElement = GameState.currentPlayer === 0 ? DOM.score1 : DOM.score2;
    scoreElement.classList.add('bust-animation');
    
    updateGameStatus(`BUST! Went over 100 by ${bustAmount}. New score: ${finalScore}`);
    updateScores();
    
    setTimeout(() => {
        scoreElement.classList.remove('bust-animation');
        endTurn();
    }, 1500);
}

/**
 * End current player's turn
 */
function endTurn() {
    // Save game state
    GameState.saveToStorage();
    
    // Switch player
    DOM.player1.classList.remove('active');
    DOM.player2.classList.remove('active');
    GameState.currentPlayer = GameState.currentPlayer === 0 ? 1 : 0;
    
    const currentPlayerElement = GameState.currentPlayer === 0 ? DOM.player1 : DOM.player2;
    currentPlayerElement.classList.add('active');
    
    // Reset UI for next turn
    resetOperationButtons();
    DOM.rollButton.disabled = false;
    
    // Update status
    const playerName = GameState.gameMode === 'vsComputer' && GameState.currentPlayer === 1 ? 'Computer' : `Player ${GameState.currentPlayer + 1}`;
    updateGameStatus(`${playerName}'s turn - Roll the dice!`);
    
    // Reset dice display
    [DOM.die1, DOM.die2].forEach(die => {
        die.textContent = '?';
    });
    DOM.diceTotal.textContent = 'Total: ?';
    
    // If it's computer's turn and we're in vsComputer mode
    if (GameState.gameMode === 'vsComputer' && GameState.currentPlayer === 1 && GameState.gameActive) {
        // Small delay before computer rolls
        setTimeout(() => {
            DOM.rollButton.click();
        }, 1000);
    }
}

/**
 * Computer's turn logic
 */
function computerTurn() {
    if (!GameState.gameActive || GameState.gameMode !== 'vsComputer' || GameState.currentPlayer !== 1) {
        return;
    }
    
    // Add thinking animation to computer player
    DOM.player2.classList.add('computer-thinking');
    
    // Computer makes decision based on difficulty
    setTimeout(() => {
        DOM.player2.classList.remove('computer-thinking');
        const selectedOperation = getComputerMove();
        
        if (selectedOperation >= 0) {
            // Simulate click on the chosen operation button
            document.getElementById(`op${selectedOperation}`).click();
        }
    }, getComputerThinkingTime());
}

/**
 * Get computer's move based on difficulty
 * @returns {number} Index of selected operation
 */
function getComputerMove() {
    const currentScore = GameState.scores[1];
    const [die1, die2] = GameState.diceValues;
    
    // Calculate all possible moves
    const possibleMoves = GameState.operations.map((op, index) => ({
        index,
        points: op.calculate(die1, die2),
        newScore: currentScore + op.calculate(die1, die2)
    }));
    
    // Filter out moves that would bust
    const safeMoves = possibleMoves.filter(move => move.newScore <= 100);
    
    // If there are safe moves
    if (safeMoves.length > 0) {
        // Strategy based on difficulty
        switch (GameState.computerDifficulty) {
            case 'easy':
                // Easy: Random safe move
                return safeMoves[Math.floor(Math.random() * safeMoves.length)].index;
                
            case 'hard':
                // Hard: Try to get as close to 100 as possible
                const closestMove = safeMoves.reduce((best, move) => {
                    return (move.newScore > best.newScore) ? move : best;
                });
                return closestMove.index;
                
            case 'medium':
            default:
                // Medium: Prefer moves that get closer to 100, but sometimes make suboptimal choices
                if (Math.random() < 0.7) {
                    // 70% chance to choose best move
                    const bestMove = safeMoves.reduce((best, move) => {
                        return (move.newScore > best.newScore) ? move : best;
                    });
                    return bestMove.index;
                } else {
                    // 30% chance to choose random safe move
                    return safeMoves[Math.floor(Math.random() * safeMoves.length)].index;
                }
        }
    } else {
        // All moves bust - choose the one that busts the least
        const leastBustMove = possibleMoves.reduce((best, move) => {
            return (move.newScore < best.newScore) ? move : best;
        });
        return leastBustMove.index;
    }
}

/**
 * Get computer thinking time based on difficulty
 * @returns {number} Thinking time in milliseconds
 */
function getComputerThinkingTime() {
    switch (GameState.computerDifficulty) {
        case 'easy': return 800 + Math.random() * 1000;
        case 'hard': return 300 + Math.random() * 500;
        case 'medium':
        default: return 500 + Math.random() * 800;
    }
}

/**
 * Win the game
 */
function winGame() {
    GameState.gameActive = false;
    
    const winnerName = GameState.gameMode === 'vsComputer' && GameState.currentPlayer === 1 ? 'Computer' : `Player ${GameState.currentPlayer + 1}`;
    updateGameStatus(`${winnerName} wins! 🎉`);
    
    DOM.rollButton.disabled = true;
    resetOperationButtons();
    
    // Create confetti celebration
    createConfetti();
    
    // Remove saved game since this one is complete
    localStorage.removeItem('raceTo100Save');
    
    // Add restart button after a delay
    setTimeout(() => {
        const restartButton = document.createElement('button');
        restartButton.className = 'roll-button';
        restartButton.innerHTML = '<i class="fas fa-redo"></i> Play Again';
        restartButton.style.marginTop = '20px';
        restartButton.addEventListener('click', startNewGame);
        
        document.querySelector('.controls').appendChild(restartButton);
    }, 1500);
}

/**
 * Create confetti animation
 */
function createConfetti() {
    const colors = ['#FF416C', '#4D96FF', '#FFD700', '#4CAF50', '#9C27B0'];
    const container = document.getElementById('confettiContainer');
    
    // Clear any existing confetti
    container.innerHTML = '';
    
    for (let i = 0; i < 120; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random properties
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5;
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 2;
        
        // Apply styles
        confetti.style.backgroundColor = color;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.left = `${left}vw`;
        confetti.style.animationDelay = `${delay}s`;
        confetti.style.animationDuration = `${duration}s`;
        
        container.appendChild(confetti);
        
        // Remove confetti after animation completes
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.remove();
            }
        }, (delay + duration) * 1000);
    }
}

/**
 * Start a new game
 */
function startNewGame() {
    // Reset game state
    GameState.resetGame();
    
    // Update UI
    updateScores();
    updatePlayerDisplay();
    
    // Remove any restart button
    const restartButton = document.querySelector('.roll-button + .roll-button');
    if (restartButton) restartButton.remove();
    
    // Reset buttons
    DOM.rollButton.disabled = false;
    resetOperationButtons();
    
    // Update status
    updateGameStatus("New game! Player 1's turn - Roll the dice!");
    
    // Update player 2 badge
    updatePlayer2Badge();
    
    // Clear saved game
    localStorage.removeItem('raceTo100Save');
    
    // Remove any remaining confetti
    document.getElementById('confettiContainer').innerHTML = '';
}

/**
 * Save current game
 */
function saveCurrentGame() {
    const saved = GameState.saveToStorage();
    
    if (saved) {
        showSaveStatus('Game saved successfully!', 'success');
    } else {
        showSaveStatus('Failed to save game.', 'error');
    }
}

/**
 * Show save status message
 */
function showSaveStatus(message, type) {
    DOM.saveStatus.textContent = message;
    DOM.saveStatus.className = 'save-status show ' + type;
    
    setTimeout(() => {
        DOM.saveStatus.classList.remove('show');
    }, 3000);
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

/**
 * Update scores display
 */
function updateScores() {
    DOM.score1.textContent = GameState.scores[0];
    DOM.score2.textContent = GameState.scores[1];
    
    // Add animation to updated score
    if (GameState.currentPlayer === 0) {
        DOM.score1.classList.add('score-update');
        setTimeout(() => DOM.score1.classList.remove('score-update'), 500);
    } else {
        DOM.score2.classList.add('score-update');
        setTimeout(() => DOM.score2.classList.remove('score-update'), 500);
    }
}

/**
 * Update player display (active/inactive)
 */
function updatePlayerDisplay() {
    DOM.player1.classList.toggle('active', GameState.currentPlayer === 0);
    DOM.player2.classList.toggle('active', GameState.currentPlayer === 1);
}

/**
 * Update player 2 badge based on game mode
 */
function updatePlayer2Badge() {
    if (GameState.gameMode === 'vsComputer') {
        DOM.player2Badge.textContent = 'Computer';
        DOM.player2Badge.style.background = '#9C27B0';
    } else {
        DOM.player2Badge.textContent = 'Human';
        DOM.player2Badge.style.background = '#4D96FF';
    }
}

/**
 * Update game status message
 * @param {string} message - Status message to display
 */
function updateGameStatus(message) {
    DOM.gameStatus.textContent = message;
}

// ============================================
// INITIALIZE GAME WHEN PAGE LOADS
// ============================================

window.addEventListener('DOMContentLoaded', initGame);