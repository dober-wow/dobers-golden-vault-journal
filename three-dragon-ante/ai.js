/**
 * Three-Dragon Ante - AI Opponent Logic
 */

const AI = {
    // Main decision function
    chooseCard(player, game, purpose = 'play') {
        const hand = player.hand;
        if (hand.length === 0) return null;

        if (purpose === 'ante') {
            return this.chooseAnteCard(player, game);
        } else {
            return this.choosePlayCard(player, game);
        }
    },

    // Choose ante card based on personality
    chooseAnteCard(player, game) {
        const hand = player.hand;
        const sorted = [...hand].sort((a, b) => a.strength - b.strength);

        if (player.personality === 'conservative') {
            // Conservative: play mid-range card to avoid high stakes
            const midIndex = Math.floor(hand.length / 2);
            return hand.indexOf(sorted[midIndex]);
        } else {
            // Aggressive: play high card to lead and set high stakes
            // But save the absolute highest for play phase
            const highIndex = Math.min(sorted.length - 1, sorted.length - 2);
            return hand.indexOf(sorted[Math.max(0, highIndex)]);
        }
    },

    // Choose play card based on game state
    choosePlayCard(player, game) {
        const hand = player.hand;
        if (hand.length === 0) return null;

        const prevPlayer = game.getPreviousPlayer(player);
        const prevFlight = prevPlayer.flight;
        const prevCard = prevFlight.length > 0 ? prevFlight[prevFlight.length - 1] : null;

        // Calculate current flight strength
        const myFlightStrength = player.flight.reduce((sum, c) => sum + c.strength, 0);
        const roundsLeft = 3 - player.flight.length;

        if (player.personality === 'conservative') {
            return this.conservativePlay(player, game, prevCard, myFlightStrength, roundsLeft);
        } else {
            return this.aggressivePlay(player, game, prevCard, myFlightStrength, roundsLeft);
        }
    },

    // Conservative AI: protect gold, steady plays
    conservativePlay(player, game, prevCard, myFlightStrength, roundsLeft) {
        const hand = player.hand;
        const sorted = [...hand].sort((a, b) => a.strength - b.strength);

        // If we can trigger a power and it's beneficial, do it
        if (prevCard) {
            const triggerCandidates = hand.filter(c =>
                c.strength <= prevCard.strength && c.strength > 2
            );

            // Prefer cards that draw or gain gold
            const beneficialTriggers = triggerCandidates.filter(c =>
                ['GOLD', 'SILVER', 'BRONZE', 'BRASS'].includes(c.color)
            );

            if (beneficialTriggers.length > 0) {
                // Play the highest strength among beneficial triggers
                const best = beneficialTriggers.reduce((a, b) =>
                    a.strength > b.strength ? a : b
                );
                return hand.indexOf(best);
            }
        }

        // Otherwise, play a medium-strength card
        const midIndex = Math.floor(sorted.length / 2);
        return hand.indexOf(sorted[midIndex]);
    },

    // Aggressive AI: go for big plays and flight bonuses
    aggressivePlay(player, game, prevCard, myFlightStrength, roundsLeft) {
        const hand = player.hand;
        const sorted = [...hand].sort((a, b) => b.strength - a.strength); // High to low

        // Check for potential color flight
        const colorCounts = {};
        player.flight.forEach(c => {
            colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
        });

        for (const [color, count] of Object.entries(colorCounts)) {
            if (count >= 2) {
                // Try to complete color flight
                const matchingCards = hand.filter(c => c.color === color);
                if (matchingCards.length > 0) {
                    const best = matchingCards.reduce((a, b) =>
                        a.strength > b.strength ? a : b
                    );
                    return hand.indexOf(best);
                }
            }
        }

        // Check for strength flight potential
        const strengthCounts = {};
        player.flight.forEach(c => {
            strengthCounts[c.strength] = (strengthCounts[c.strength] || 0) + 1;
        });

        for (const [strength, count] of Object.entries(strengthCounts)) {
            if (count >= 2) {
                const matching = hand.filter(c => c.strength === parseInt(strength));
                if (matching.length > 0) {
                    return hand.indexOf(matching[0]);
                }
            }
        }

        // If last round, play highest card
        if (roundsLeft === 1) {
            return hand.indexOf(sorted[0]);
        }

        // Try to trigger steal powers
        if (prevCard) {
            const stealTriggers = hand.filter(c =>
                c.strength <= prevCard.strength &&
                ['RED', 'BLACK', 'WHITE'].includes(c.color)
            );
            if (stealTriggers.length > 0) {
                const best = stealTriggers.reduce((a, b) =>
                    a.strength > b.strength ? a : b
                );
                return hand.indexOf(best);
            }
        }

        // Default: play a high card
        return hand.indexOf(sorted[0]);
    },

    // Process AI turn with delay for visual effect
    async processTurn(game) {
        const currentPlayer = game.getCurrentPlayer();

        if (!currentPlayer.isAI) return false;

        // Add thinking delay
        await this.delay(800 + Math.random() * 600);

        if (game.phase === 'ante' && !currentPlayer.anteCard) {
            const cardIndex = this.chooseCard(currentPlayer, game, 'ante');
            if (cardIndex !== null) {
                game.selectAnte(currentPlayer, cardIndex);
            }
            return true;
        } else if (game.phase === 'play') {
            const cardIndex = this.chooseCard(currentPlayer, game, 'play');
            if (cardIndex !== null) {
                game.playCard(currentPlayer, cardIndex);
            }
            return true;
        }

        return false;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
