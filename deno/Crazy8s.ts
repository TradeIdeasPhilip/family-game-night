import { ButtonStatus, Card, CardStatus, GameStatus, JsonPlayer, NORMAL_SUITS, SingleButton } from "./shared/crazy-8s.ts";

// Adapted from https://stackoverflow.com/a/12646864/971955
function shuffleArray<T>(array : T[]) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) |0;
      [array[i], array[j]] = [array[j], array[i]];
  }
}

export type PlayerConnection = { send : (toSend: GameStatus) => void , cancel? : () => void };

export type SimplePlayerInterface = {
  readonly id : number;
  readonly name : string;
  playerConnection : PlayerConnection | undefined;
};

class Player implements SimplePlayerInterface {
  score = 0;
  playerConnection : PlayerConnection | undefined;
  constructor(public readonly name : string, public readonly id : number, public readonly cards : Card[]) {

  }
  export() : JsonPlayer {
    return { cards : this.cards.length, id : this.id, lastSeen : "Connected", name : this.name, score : this.score };
  }
}

export class Game {
  private drawRequired = 0;
  private discardPile : Card[] = [];
  private stock : Card[];
  private checkStock() {
    if (this.stock.length == 0) {
      const visibleDiscard = this.discardPile.pop();
      if (!visibleDiscard) {
        // There should always be at least one discard, the top one that the next player is trying to match.
        throw new Error("wtf");
      }
      // Move everything from but the top card from the discardPile to the stock.
      [this.stock, this.discardPile] = [this.discardPile, this.stock];
      // The discard pile will only contain that one visible card.
      this.discardPile.push(visibleDiscard);
      shuffleArray(this.stock);
      // TODO should we notify people of the shuffle?
    }
  }
  private readonly players : ReadonlyMap<number, Player>;

  /**
   * These will map to the playerNames provided in the constructor.
   * There will be the same number of these in the same order.
   */
  public get allPlayerInfo() : SimplePlayerInterface[] {
    return Array.from(this.players.values());
  }

  public getPlayerInfo(id : number) : SimplePlayerInterface | undefined {
    return this.players.get(id);
  }

  private readonly playersInOrder : number[] = [];
  private static nextPlayerId = 1;
  constructor(playerNames : string[]) {
    const players = new Map<number, Player>();
    this.players = players;
    this.stock = Card.createDeck();
    // TODO if there are "a lot of players" we should use 2 decks.  Presumably we could 
    // use even more based on the number of players.
    shuffleArray(this.stock);

    // Turn over one card.  If it's wild, bury it and try again until you find a card that is not wild.
    //
    // The original rules said to deal to the players first.  This seems easier, mostly to avoid running
    // of non-wild cards before getting here!  This change in order leads to a very slight difference in
    // the chance of a player getting a wild card in his initial hand, but very little difference.  And
    // the effect is the same for all players, so it's fair.
    while (true) {
      const drawn = this.stock.pop();
      if (!drawn) {
        throw new Error("wtf");
      }
      if (!drawn.isWild) {
        this.discardPile.push(drawn);
        break;
      }
      this.stock.splice((Math.random() * this.stock.length) |0, 0, drawn);
    }

    const cardsPerPlayer = (playerNames.length == 2)?7:5;
    if (cardsPerPlayer * playerNames.length + 1 > this.stock.length) {
      throw new Error("Not enough cards!");
    }
    playerNames.forEach(name => {
      const id = Game.nextPlayerId;
      Game.nextPlayerId++;
      const deal = this.stock.splice(this.stock.length - cardsPerPlayer, cardsPerPlayer);
      if (deal.length != cardsPerPlayer) {
        throw new Error("wtf");
      }
      deal.sort((a, b) => a.sortOrder - b.sortOrder);
      players.set(id, new Player(name, id, deal));
      this.playersInOrder.push(id);
    })
  }
  get topCard() : Card {
    return this.discardPile[this.discardPile.length - 1];
  }
  /**
   * This will store the action for later use by the client.
   * @param action A callback to be performed if and when the client requests it.
   * @returns A string that we can give to the client.  The client will use this to request the corresponding action.
   */
  private registerAction(action : () => void) : string {
    return "TODO";
  }
  notifyAllGeneralInfo(player? : Player | undefined) {
    const players : Iterable<Player> = player?[player]:this.players.values();
    const gameStatus : GameStatus = { topCard: this.topCard, playersInOrder : this.playersInOrder.map(id => this.players.get(id)!.export()) };
    for (const player of players) {
      if (player.playerConnection) {
        const isThisPlayersTurn = player.id == this.playersInOrder[0];
        const makeButton = (name : string, action : () => void) : SingleButton => {
          if (isThisPlayersTurn) {
            return [name, this.registerAction(action)];
          } else {
            return [name];
          }
        }
        const cards : ButtonStatus[] = player.cards.map(card => {
          let buttons : SingleButton[];
          // TODO add actual actions.
          // TODO add more special cases, e.g. reverse, skip, draw 2.
          if (card.isWild) {
            buttons = NORMAL_SUITS.map(suit => makeButton(suit, ()=> {console.log(`${player.name} is playing ${card.toString()} as a ${suit}`)}));
          } else {
            buttons = [makeButton("Play", () => {console.log(`${player.name} is playing ${card.toString()}`)})];
          }
          return { card, buttons };
        });
        const cardStatus : CardStatus = { cards };
        if (isThisPlayersTurn) {
          // TODO what about draw 2, draw 4, etc.
          cardStatus.drawCode = this.registerAction(() => console.log(`${player.name} is drawing a card.`))
        }
        gameStatus.cardStatus = cardStatus;
        player.playerConnection.send(gameStatus);
      } 
      // TODO send gameStatus to player.
    }
  }
  sendUpdatedStatus(id : number) {
    const player = this.players.get(id);
    if (player) {
      this.notifyAllGeneralInfo(player);
      return true;
    } else {
      return false;
    }
  }
  getPlayerAfter(player : Player) : Player {
    let index = this.playersInOrder.indexOf(player.id);
    index++;
    if (index >= this.playersInOrder.length) {
      index = 0;
    }
    return this.players.get(this.playersInOrder[index])!;
  }
  getPlayerBefore(player : Player) : Player {
    let index = this.playersInOrder.indexOf(player.id);
    index--;
    if (index < 0) {
      index = this.playersInOrder.length - 1;
    }
    return this.players.get(this.playersInOrder[index])!;
  }
  reversePlayers() {
    this.playersInOrder.reverse();
  }
  advancePlayers(by = 1) {
    this.playersInOrder.push(...this.playersInOrder.splice(0, by));
  }
  setPlayerConnection(playerId : number, playerConnection  : PlayerConnection | undefined) {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error("unknown playerId:  " + playerId);
    }
    player.playerConnection = playerConnection;
  }
}