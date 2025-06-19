class WordleGame {
    constructor() {
        this.currentRow = 0;
        this.currentTile = 0;
        this.gameBoard = document.getElementById('game-board');
        this.keyboard = document.getElementById('keyboard');
        this.message = document.getElementById('message');
        this.newGameBtn = document.getElementById('new-game-btn');
        
        this.initializeBoard();
        this.attachEventListeners();
        this.loadGameState();
    }

    initializeBoard() {
        this.gameBoard.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('data-row', i);
            
            for (let j = 0; j < 5; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.setAttribute('data-row', i);
                tile.setAttribute('data-col', j);
                row.appendChild(tile);
            }
            
            this.gameBoard.appendChild(row);
        }
    }

    attachEventListeners() {
        // Keyboard clicks
        this.keyboard.addEventListener('click', (e) => {
            if (e.target.classList.contains('key')) {
                const key = e.target.getAttribute('data-key');
                this.handleKeyPress(key);
            }
        });

        // Physical keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleKeyPress('Enter');
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('Backspace');
            } else if (e.key.match(/[a-zA-Z]/) && e.key.length === 1) {
                this.handleKeyPress(e.key.toUpperCase());
            }
        });

        // New game button
        this.newGameBtn.addEventListener('click', () => {
            this.newGame();
        });
    }

    handleKeyPress(key) {
        if (key === 'Enter') {
            this.submitGuess();
        } else if (key === 'Backspace') {
            this.deleteLetter();
        } else if (key.match(/[A-Z]/) && key.length === 1) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.currentTile < 5) {
            const tile = document.querySelector(`[data-row="${this.currentRow}"][data-col="${this.currentTile}"]`);
            tile.textContent = letter;
            tile.classList.add('filled');
            this.currentTile++;
        }
    }

    deleteLetter() {
        if (this.currentTile > 0) {
            this.currentTile--;
            const tile = document.querySelector(`[data-row="${this.currentRow}"][data-col="${this.currentTile}"]`);
            tile.textContent = '';
            tile.classList.remove('filled');
        }
    }

    async submitGuess() {
        if (this.currentTile !== 5) {
            this.showMessage('Not enough letters', 'error');
            return;
        }

        const guess = this.getCurrentGuess();
        
        try {
            const response = await fetch('/guess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guess: guess })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showMessage(data.error, 'error');
                return;
            }

            this.animateGuess(data.result);
            this.updateKeyboard(guess, data.result);

            if (data.won) {
                setTimeout(() => {
                    this.showMessage('Congratulations! You won!', 'success');
                }, 1500);
            } else if (data.game_over) {
                setTimeout(() => {
                    this.showMessage(`Game Over! The word was: ${data.target_word}`, 'error');
                }, 1500);
            }

            this.currentRow++;
            this.currentTile = 0;

        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    getCurrentGuess() {
        let guess = '';
        for (let i = 0; i < 5; i++) {
            const tile = document.querySelector(`[data-row="${this.currentRow}"][data-col="${i}"]`);
            guess += tile.textContent;
        }
        return guess;
    }

    animateGuess(result) {
        for (let i = 0; i < 5; i++) {
            const tile = document.querySelector(`[data-row="${this.currentRow}"][data-col="${i}"]`);
            
            setTimeout(() => {
                tile.classList.add('flip');
                setTimeout(() => {
                    tile.classList.add(result[i]);
                }, 300);
            }, i * 100);
        }
    }

    updateKeyboard(guess, result) {
        for (let i = 0; i < 5; i++) {
            const letter = guess[i];
            const keyElement = document.querySelector(`[data-key="${letter}"]`);
            
            if (keyElement) {
                const currentClass = keyElement.className;
                
                if (result[i] === 'correct') {
                    keyElement.classList.remove('present', 'absent');
                    keyElement.classList.add('correct');
                } else if (result[i] === 'present' && !currentClass.includes('correct')) {
                    keyElement.classList.remove('absent');
                    keyElement.classList.add('present');
                } else if (result[i] === 'absent' && !currentClass.includes('correct') && !currentClass.includes('present')) {
                    keyElement.classList.add('absent');
                }
            }
        }
    }

    showMessage(text, type = '') {
        this.message.textContent = text;
        this.message.className = `message ${type}`;
        this.message.classList.remove('hidden');
        
        setTimeout(() => {
            this.message.classList.add('hidden');
        }, 3000);
    }

    async loadGameState() {
        try {
            const response = await fetch('/game-state');
            const data = await response.json();
            
            // Restore previous guesses
            data.guesses.forEach((guess, rowIndex) => {
                for (let i = 0; i < 5; i++) {
                    const tile = document.querySelector(`[data-row="${rowIndex}"][data-col="${i}"]`);
                    tile.textContent = guess.word[i];
                    tile.classList.add('filled', guess.result[i]);
                }
                this.updateKeyboard(guess.word, guess.result);
            });
            
            this.currentRow = data.guesses.length;
            
            if (data.game_over) {
                if (data.won) {
                    this.showMessage('Congratulations! You won!', 'success');
                } else {
                    this.showMessage(`Game Over! The word was: ${data.target_word}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
    }

    async newGame() {
        try {
            const response = await fetch('/new-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Reset the board
                this.currentRow = 0;
                this.currentTile = 0;
                this.initializeBoard();
                
                // Reset keyboard
                const keys = document.querySelectorAll('.key');
                keys.forEach(key => {
                    key.classList.remove('correct', 'present', 'absent');
                });
                
                this.showMessage('New game started!', 'success');
            }
        } catch (error) {
            this.showMessage('Failed to start new game', 'error');
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WordleGame();
});