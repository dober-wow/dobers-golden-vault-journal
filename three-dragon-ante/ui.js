/**
 * Three-Dragon Ante - UI Rendering
 */

const UI = {
    elements: {},

    init() {
        this.elements = {
            gameTable: document.getElementById('game-table'),
            playerHand: document.getElementById('player-hand'),
            playerGold: document.getElementById('player-gold'),
            playerFlight: document.getElementById('player-flight'),
            ai1Hand: document.getElementById('ai1-hand'),
            ai1Gold: document.getElementById('ai1-gold'),
            ai1Flight: document.getElementById('ai1-flight'),
            ai1Name: document.getElementById('ai1-name'),
            ai2Hand: document.getElementById('ai2-hand'),
            ai2Gold: document.getElementById('ai2-gold'),
            ai2Flight: document.getElementById('ai2-flight'),
            ai2Name: document.getElementById('ai2-name'),
            stakes: document.getElementById('stakes-amount'),
            gameLog: document.getElementById('game-log'),
            phase: document.getElementById('game-phase'),
            message: document.getElementById('game-message'),
            newGameBtn: document.getElementById('new-game-btn')
        };
    },

    render(state) {
        this.renderPlayerHand(state);
        this.renderFlights(state);
        this.renderGold(state);
        this.renderStakes(state);
        this.renderPhase(state);
        this.renderLog(state);
        this.renderAIHands(state);
        this.updateMessage(state);
    },

    renderPlayerHand(state) {
        const player = state.players.find(p => !p.isAI);
        const container = this.elements.playerHand;
        container.innerHTML = '';

        const isPlayerTurn = state.players[state.currentPlayerIndex].id === player.id;
        const canPlay = (state.phase === 'ante' && !player.anteCard) ||
            (state.phase === 'play' && isPlayerTurn);

        player.hand.forEach((card, index) => {
            const cardEl = this.createCardElement(card, !canPlay);
            if (canPlay) {
                cardEl.addEventListener('click', () => {
                    window.handleCardClick(index);
                });
                cardEl.classList.add('playable');
            }
            container.appendChild(cardEl);
        });
    },

    renderAIHands(state) {
        // AI 1
        const ai1 = state.players[1];
        this.elements.ai1Hand.innerHTML = '';
        this.elements.ai1Name.textContent = ai1.name;
        for (let i = 0; i < ai1.handCount; i++) {
            const card = document.createElement('div');
            card.className = 'card card-back';
            this.elements.ai1Hand.appendChild(card);
        }

        // AI 2
        const ai2 = state.players[2];
        this.elements.ai2Hand.innerHTML = '';
        this.elements.ai2Name.textContent = ai2.name;
        for (let i = 0; i < ai2.handCount; i++) {
            const card = document.createElement('div');
            card.className = 'card card-back';
            this.elements.ai2Hand.appendChild(card);
        }
    },

    renderFlights(state) {
        state.players.forEach((player, idx) => {
            const container = idx === 0 ? this.elements.playerFlight :
                idx === 1 ? this.elements.ai1Flight : this.elements.ai2Flight;
            container.innerHTML = '';

            player.flight.forEach(card => {
                const cardEl = this.createCardElement(card, true);
                cardEl.classList.add('in-flight');
                container.appendChild(cardEl);
            });
        });
    },

    renderGold(state) {
        state.players.forEach((player, idx) => {
            const element = idx === 0 ? this.elements.playerGold :
                idx === 1 ? this.elements.ai1Gold : this.elements.ai2Gold;
            element.textContent = `🪙 ${player.gold}`;

            // Highlight current player
            const parent = element.closest('.player-area') || element.parentElement;
            if (parent) {
                parent.classList.toggle('current-turn', player.isCurrentPlayer);
            }
        });
    },

    renderStakes(state) {
        this.elements.stakes.textContent = state.stakes;
    },

    renderPhase(state) {
        const phases = {
            setup: 'Setting Up',
            ante: `Gambit ${state.gambit} - Ante`,
            play: `Gambit ${state.gambit} - Round ${state.round}`,
            score: 'Scoring',
            draw: 'Drawing Cards',
            gameover: 'Game Over'
        };
        this.elements.phase.textContent = phases[state.phase] || state.phase;
    },

    renderLog(state) {
        const logContainer = this.elements.gameLog;
        logContainer.innerHTML = state.logs
            .map(log => `<div class="log-entry">${log}</div>`)
            .join('');
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    updateMessage(state) {
        const player = state.players.find(p => !p.isAI);
        const isPlayerTurn = state.players[state.currentPlayerIndex].id === player.id;

        let msg = '';
        if (state.phase === 'gameover') {
            const winner = state.players.reduce((a, b) => a.gold > b.gold ? a : b);
            msg = winner.id === 0 ? '🎉 You win!' : `${winner.name} wins!`;
        } else if (state.phase === 'ante') {
            msg = player.anteCard ? 'Waiting for opponents...' : 'Choose a card to ante';
        } else if (state.phase === 'play') {
            msg = isPlayerTurn ? 'Your turn - play a card' : 'Opponent\'s turn...';
        } else if (state.phase === 'score') {
            msg = 'Calculating scores...';
        } else if (state.phase === 'draw') {
            msg = 'Drawing cards...';
        }

        this.elements.message.textContent = msg;
    },

    createCardElement(card, disabled = false) {
        const el = document.createElement('div');
        el.className = `card ${card.colorData.cssClass}`;
        if (disabled) el.classList.add('disabled');

        el.innerHTML = `
            <div class="card-strength">${card.strength}</div>
            <div class="card-color">${card.colorData.name}</div>
            <div class="card-dragon">🐉</div>
            <div class="card-power">${card.powerDesc}</div>
        `;

        el.title = `${card.name}\n${card.powerDesc}`;
        return el;
    },

    showNewGameButton() {
        this.elements.newGameBtn.style.display = 'block';
    },

    hideNewGameButton() {
        this.elements.newGameBtn.style.display = 'none';
    }
};
