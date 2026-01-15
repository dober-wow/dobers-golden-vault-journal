/**
 * Three-Dragon Ante - Card Deck Data
 * Full 70-card standard deck with dragon powers
 */

// Dragon colors and their alignment
const DRAGON_COLORS = {
    GOLD: { name: 'Gold', alignment: 'good', cssClass: 'gold' },
    SILVER: { name: 'Silver', alignment: 'good', cssClass: 'silver' },
    BRONZE: { name: 'Bronze', alignment: 'good', cssClass: 'bronze' },
    BRASS: { name: 'Brass', alignment: 'good', cssClass: 'brass' },
    COPPER: { name: 'Copper', alignment: 'good', cssClass: 'copper' },
    RED: { name: 'Red', alignment: 'evil', cssClass: 'red' },
    BLACK: { name: 'Black', alignment: 'evil', cssClass: 'black' },
    BLUE: { name: 'Blue', alignment: 'evil', cssClass: 'blue' },
    GREEN: { name: 'Green', alignment: 'evil', cssClass: 'green' },
    WHITE: { name: 'White', alignment: 'evil', cssClass: 'white' }
};

// Card power definitions
const POWERS = {
    // Good dragon powers (generally help you gain cards/gold legitimately)
    goldDragon: (game, player) => {
        // Draw a card
        game.drawCards(player, 1);
        game.log(`${player.name} draws a card (Gold Dragon)`);
    },
    silverDragon: (game, player) => {
        // Gain 1 gold from stakes
        const gained = Math.min(1, game.stakes);
        game.stakes -= gained;
        player.gold += gained;
        game.log(`${player.name} takes 1 gold from stakes (Silver Dragon)`);
    },
    bronzeDragon: (game, player) => {
        // Gain 2 gold from stakes
        const gained = Math.min(2, game.stakes);
        game.stakes -= gained;
        player.gold += gained;
        game.log(`${player.name} takes 2 gold from stakes (Bronze Dragon)`);
    },
    brassDragon: (game, player) => {
        // Draw a card, then discard a card
        game.drawCards(player, 1);
        game.log(`${player.name} draws and will discard (Brass Dragon)`);
        game.pendingDiscard = player;
    },
    copperDragon: (game, player) => {
        // Each opponent pays 1 gold to stakes
        game.getOpponents(player).forEach(opp => {
            const paid = Math.min(1, opp.gold);
            opp.gold -= paid;
            game.stakes += paid;
        });
        game.log(`Opponents each pay 1 gold to stakes (Copper Dragon)`);
    },

    // Evil dragon powers (steal, drain, manipulate)
    redDragon: (game, player) => {
        // Steal 1 gold from each opponent
        game.getOpponents(player).forEach(opp => {
            const stolen = Math.min(1, opp.gold);
            opp.gold -= stolen;
            player.gold += stolen;
        });
        game.log(`${player.name} steals 1 gold from each opponent (Red Dragon)`);
    },
    blackDragon: (game, player) => {
        // Each opponent discards a card
        game.getOpponents(player).forEach(opp => {
            if (opp.hand.length > 0) {
                const discarded = opp.hand.pop();
                game.discard.push(discarded);
            }
        });
        game.log(`Opponents each discard a card (Black Dragon)`);
    },
    blueDragon: (game, player) => {
        // Take 2 gold from stakes (or add to stakes if empty)
        if (game.stakes >= 2) {
            game.stakes -= 2;
            player.gold += 2;
            game.log(`${player.name} takes 2 gold from stakes (Blue Dragon)`);
        } else {
            player.gold -= 1;
            game.stakes += 1;
            game.log(`${player.name} adds 1 gold to stakes (Blue Dragon - stakes low)`);
        }
    },
    greenDragon: (game, player, cardPlayed) => {
        // Copy the power of the card to your right (previous player's last card)
        const prevPlayer = game.getPreviousPlayer(player);
        const prevFlight = prevPlayer.flight;
        if (prevFlight.length > 0) {
            const copiedCard = prevFlight[prevFlight.length - 1];
            if (copiedCard.power && copiedCard.color !== 'GREEN') {
                game.log(`${player.name} copies ${copiedCard.name}'s power (Green Dragon)`);
                copiedCard.power(game, player, cardPlayed);
            }
        }
    },
    whiteDragon: (game, player) => {
        // Opponent with most gold pays 2 to stakes
        const opponents = game.getOpponents(player);
        const richest = opponents.reduce((a, b) => a.gold > b.gold ? a : b);
        const paid = Math.min(2, richest.gold);
        richest.gold -= paid;
        game.stakes += paid;
        game.log(`${richest.name} pays 2 gold to stakes (White Dragon)`);
    },

    // No power (for low-strength cards)
    none: () => { }
};

// Generate the 70-card standard deck
function createDeck() {
    const deck = [];
    let cardId = 0;

    // Each color has cards of strengths 1-13, but distribution varies
    // Simplified: each color gets strengths 1, 2, 4, 6, 8, 10, 12 (7 cards per color = 70 total)
    const strengths = [1, 2, 4, 6, 8, 10, 12];

    Object.entries(DRAGON_COLORS).forEach(([colorKey, colorData]) => {
        strengths.forEach(strength => {
            const power = getPowerForColor(colorKey, strength);
            deck.push({
                id: cardId++,
                strength: strength,
                color: colorKey,
                colorData: colorData,
                name: `${colorData.name} Dragon (${strength})`,
                power: power.fn,
                powerDesc: power.desc
            });
        });
    });

    return deck;
}

// Assign powers based on color and strength
function getPowerForColor(color, strength) {
    // Lower strength = more likely to trigger, so give weaker powers
    // Higher strength = powerful card, give stronger powers

    if (strength <= 2) {
        return { fn: POWERS.none, desc: 'No power' };
    }

    const powerMap = {
        GOLD: { fn: POWERS.goldDragon, desc: 'Draw 1 card' },
        SILVER: { fn: POWERS.silverDragon, desc: 'Take 1 gold from stakes' },
        BRONZE: { fn: POWERS.bronzeDragon, desc: 'Take 2 gold from stakes' },
        BRASS: { fn: POWERS.brassDragon, desc: 'Draw 1, discard 1' },
        COPPER: { fn: POWERS.copperDragon, desc: 'Opponents pay 1 to stakes' },
        RED: { fn: POWERS.redDragon, desc: 'Steal 1 gold from each opponent' },
        BLACK: { fn: POWERS.blackDragon, desc: 'Opponents discard 1 card' },
        BLUE: { fn: POWERS.blueDragon, desc: 'Take 2 from stakes' },
        GREEN: { fn: POWERS.greenDragon, desc: 'Copy previous card\'s power' },
        WHITE: { fn: POWERS.whiteDragon, desc: 'Richest opponent pays 2 to stakes' }
    };

    return powerMap[color] || { fn: POWERS.none, desc: 'No power' };
}

// Shuffle using Fisher-Yates
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Check for special flights
function checkSpecialFlight(flight) {
    if (flight.length < 3) return null;

    // Color flight: all same color
    const colors = flight.map(c => c.color);
    if (colors.every(c => c === colors[0])) {
        return { type: 'color', bonus: 5, desc: `${flight[0].colorData.name} Flight!` };
    }

    // Strength flight: all same strength
    const strengths = flight.map(c => c.strength);
    if (strengths.every(s => s === strengths[0])) {
        return { type: 'strength', bonus: 10, desc: `Strength ${strengths[0]} Flight!` };
    }

    return null;
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDeck, shuffleDeck, checkSpecialFlight, DRAGON_COLORS };
}
