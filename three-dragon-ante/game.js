/**
 * Three-Dragon Ante - Core Game Logic
 */

class ThreeDragonAnte {
    constructor() {
        this.players = [];
        this.deck = [];
        this.discard = [];
        this.stakes = 0;
        this.currentPlayerIndex = 0;
        this.phase = 'setup'; // setup, ante, play, score, draw, gameover
        this.round = 0;
        this.gambit = 0;
        this.logs = [];
        this.pendingDiscard = null;
        this.anteCards = [];
        this.leaderIndex = 0;

        this.onStateChange = null; // UI callback
    }

    // Initialize a new game
    init(playerName = 'You') {
        // Create players
        this.players = [
            {
                id: 0,
                name: playerName,
                gold: 30,
                hand: [],
                flight: [],
                anteCard: null,
                isAI: false
            },
            {
                id: 1,
                name: 'Infernal Dealer',
                gold: 30,
                hand: [],
                flight: [],
                anteCard: null,
                isAI: true,
                personality: 'conservative'
            },
            {
                id: 2,
                name: 'High Roller',
                gold: 30,
                hand: [],
                flight: [],
                anteCard: null,
                isAI: true,
                personality: 'aggressive'
            }
        ];

        // Create and shuffle deck
        this.deck = shuffleDeck(createDeck());
        this.discard = [];
        this.stakes = 0;
        this.gambit = 0;
        this.logs = [];

        // Deal 6 cards to each player
        this.players.forEach(player => {
            this.drawCards(player, 6);
        });

        this.log('🎴 Game started! Each player has 30 gold and 6 cards.');
        this.startGambit();
    }

    // Start a new gambit
    startGambit() {
        this.gambit++;
        this.round = 0;
        this.phase = 'ante';
        this.anteCards = [];

        // Clear flights
        this.players.forEach(p => {
            p.flight = [];
            p.anteCard = null;
        });

        this.log(`\n--- Gambit ${this.gambit} ---`);
        this.log('Choose your ante card.');
        this.notifyStateChange();
    }

    // Player selects ante card
    selectAnte(player, cardIndex) {
        if (this.phase !== 'ante') return false;
        if (player.anteCard) return false; // Already anted

        const card = player.hand.splice(cardIndex, 1)[0];
        player.anteCard = card;
        this.anteCards.push({ player, card });

        if (!player.isAI) {
            this.log(`You ante with ${card.name}`);
        }

        // Check if all players have anted
        if (this.anteCards.length === this.players.length) {
            this.resolveAnte();
        } else {
            this.notifyStateChange();
        }

        return true;
    }

    // Resolve the ante phase
    resolveAnte() {
        // Reveal all ante cards
        this.log('\n🃏 Ante cards revealed:');
        this.anteCards.forEach(({ player, card }) => {
            this.log(`  ${player.name}: ${card.name}`);
        });

        // Find highest ante
        let maxStrength = Math.max(...this.anteCards.map(a => a.card.strength));
        let leaders = this.anteCards.filter(a => a.card.strength === maxStrength);

        if (leaders.length > 1) {
            // Tie - for simplicity, random selection
            this.log('Tie! Randomly selecting leader...');
            leaders = [leaders[Math.floor(Math.random() * leaders.length)]];
        }

        const leader = leaders[0].player;
        this.leaderIndex = this.players.indexOf(leader);

        // Leader sets stakes based on their ante strength
        const stakeAmount = leaders[0].card.strength;
        this.log(`${leader.name} leads with strength ${maxStrength}!`);
        this.log(`Stakes set to ${stakeAmount} gold.`);

        // Each player pays into stakes
        this.players.forEach(p => {
            const payment = Math.min(stakeAmount, p.gold);
            p.gold -= payment;
            this.stakes += payment;
        });
        this.log(`Total stakes: ${this.stakes} gold`);

        // Move ante cards to flights
        this.anteCards.forEach(({ player, card }) => {
            player.flight.push(card);
        });
        this.anteCards = [];

        // Start play phase
        this.phase = 'play';
        this.round = 1;
        this.currentPlayerIndex = this.leaderIndex;
        this.log('\n▶ Play Phase - Round 1');
        this.notifyStateChange();
    }

    // Player plays a card from hand
    playCard(player, cardIndex) {
        if (this.phase !== 'play') return false;
        if (this.players[this.currentPlayerIndex] !== player) return false;

        const card = player.hand.splice(cardIndex, 1)[0];
        player.flight.push(card);

        this.log(`${player.name} plays ${card.name}`);

        // Check if power triggers
        // Power triggers if: first to play this round, OR card strength <= previous player's last card
        const prevPlayer = this.getPreviousPlayer(player);
        const prevCard = prevPlayer.flight.length > 0 ? prevPlayer.flight[prevPlayer.flight.length - 1] : null;

        const isFirst = player === this.players[this.leaderIndex] && this.round === 1 && player.flight.length === 1;
        const triggersOnStrength = prevCard && card.strength <= prevCard.strength;

        if ((isFirst || triggersOnStrength) && card.power && card.strength > 2) {
            this.log(`  ⚡ Power triggers!`);
            card.power(this, player, card);
        }

        // Next player
        this.advancePlayer();
        return true;
    }

    advancePlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

        // Check if round is complete (everyone played one card this round)
        const minFlightSize = Math.min(...this.players.map(p => p.flight.length));

        if (this.currentPlayerIndex === this.leaderIndex) {
            // Back to leader - round complete
            this.round++;

            if (this.round > 3) {
                // Gambit complete - score
                this.scoreGambit();
            } else {
                this.log(`\n▶ Play Phase - Round ${this.round}`);
                this.notifyStateChange();
            }
        } else {
            this.notifyStateChange();
        }
    }

    // Score the gambit
    scoreGambit() {
        this.phase = 'score';
        this.log('\n🏆 Scoring Gambit...');

        // Calculate flight strengths
        const scores = this.players.map(p => ({
            player: p,
            total: p.flight.reduce((sum, c) => sum + c.strength, 0),
            special: checkSpecialFlight(p.flight)
        }));

        scores.forEach(s => {
            let msg = `${s.player.name}: ${s.total}`;
            if (s.special) {
                msg += ` + ${s.special.bonus} (${s.special.desc})`;
                s.total += s.special.bonus;
            }
            this.log(`  ${msg}`);
        });

        // Find winner
        const maxScore = Math.max(...scores.map(s => s.total));
        let winners = scores.filter(s => s.total === maxScore);

        if (winners.length > 1) {
            this.log('Tie! Stakes split.');
            const share = Math.floor(this.stakes / winners.length);
            winners.forEach(w => {
                w.player.gold += share;
            });
        } else {
            const winner = winners[0].player;
            this.log(`${winner.name} wins ${this.stakes} gold!`);
            winner.gold += this.stakes;
        }

        this.stakes = 0;

        // Check for game end
        const busted = this.players.filter(p => p.gold <= 0);
        if (busted.length > 0) {
            this.endGame();
            return;
        }

        // Draw phase
        this.phase = 'draw';
        this.log('\n📥 Draw Phase - Each player draws 2 cards');

        this.players.forEach(p => {
            this.drawCards(p, 2);
            // Discard flights
            p.flight.forEach(c => this.discard.push(c));
            p.flight = [];
        });

        // Enforce max hand size of 10
        this.players.forEach(p => {
            while (p.hand.length > 10) {
                const discarded = p.hand.pop();
                this.discard.push(discarded);
            }
        });

        // Start next gambit
        setTimeout(() => {
            this.startGambit();
        }, 1500);
    }

    endGame() {
        this.phase = 'gameover';

        // Find winner (most gold)
        const winner = this.players.reduce((a, b) => a.gold > b.gold ? a : b);

        this.log('\n🎰 GAME OVER!');
        this.players.forEach(p => {
            this.log(`  ${p.name}: ${p.gold} gold`);
        });
        this.log(`\n👑 ${winner.name} wins the game!`);

        this.notifyStateChange();
    }

    // Utility functions
    drawCards(player, count) {
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                // Reshuffle discard
                if (this.discard.length === 0) break;
                this.deck = shuffleDeck(this.discard);
                this.discard = [];
                this.log('🔄 Deck reshuffled');
            }
            player.hand.push(this.deck.pop());
        }
    }

    getOpponents(player) {
        return this.players.filter(p => p !== player);
    }

    getPreviousPlayer(player) {
        const idx = this.players.indexOf(player);
        const prevIdx = (idx - 1 + this.players.length) % this.players.length;
        return this.players[prevIdx];
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getHumanPlayer() {
        return this.players.find(p => !p.isAI);
    }

    log(message) {
        this.logs.push(message);
        console.log(message);
    }

    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }

    getState() {
        return {
            phase: this.phase,
            round: this.round,
            gambit: this.gambit,
            stakes: this.stakes,
            currentPlayerIndex: this.currentPlayerIndex,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                gold: p.gold,
                handCount: p.hand.length,
                hand: p.isAI ? [] : p.hand, // Only show human's hand
                flight: p.flight,
                anteCard: p.anteCard,
                isAI: p.isAI,
                isCurrentPlayer: this.players[this.currentPlayerIndex] === p
            })),
            logs: this.logs.slice(-20) // Last 20 log entries
        };
    }
}
