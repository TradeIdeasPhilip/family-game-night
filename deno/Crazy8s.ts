import {
  ButtonStatus,
  Card,
  CardStatus,
  GameStatus,
  JsonPlayer,
  NORMAL_SUITS,
  SingleButton,
} from "./shared/crazy-8s.ts";

// Adapted from https://stackoverflow.com/a/12646864/971955
function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export type PlayerConnection = {
  send: (toSend: GameStatus) => void;
  cancel?: () => void;
};

export type SimplePlayerInterface = {
  readonly id: number;
  readonly name: string;
  playerConnection: PlayerConnection | undefined;
};

class Player implements SimplePlayerInterface {
  score = 0;
  playerConnection: PlayerConnection | undefined;
  constructor(
    public readonly name: string,
    public readonly id: number,
    public readonly cards: Card[]
  ) {}
  export(): JsonPlayer {
    return {
      cards: this.cards.length,
      id: this.id,
      lastSeen: "Connected",
      name: this.name,
      score: this.score,
    };
  }
}

export class Game {
  private drawRequired = 0;
  private topCard = Card.randomNoWild();
  private readonly players: ReadonlyMap<number, Player>;

  /**
   * These will map to the playerNames provided in the constructor.
   * There will be the same number of these in the same order.
   */
  public get allPlayerInfo(): SimplePlayerInterface[] {
    return Array.from(this.players.values());
  }

  public getPlayerInfo(id: number): SimplePlayerInterface | undefined {
    return this.players.get(id);
  }

  private readonly playersInOrder: number[] = [];
  private static nextPlayerId = 1;
  constructor(playerNames: string[]) {
    const players = new Map<number, Player>();
    this.players = players;

    const cardsPerPlayer = playerNames.length == 2 ? 7 : 5;
    const dealTemplate = Array.from(new Array(cardsPerPlayer));
    playerNames.forEach((name) => {
      const id = Game.nextPlayerId;
      Game.nextPlayerId++;
      const deal = dealTemplate.map(() => Card.randomAny());
      if (deal.length != cardsPerPlayer) {
        throw new Error("wtf");
      }
      deal.sort((a, b) => a.sortOrder - b.sortOrder);
      players.set(id, new Player(name, id, deal));
      this.playersInOrder.push(id);
    });
  }
  /**
   * This will store the action for later use by the client.
   * @param action A callback to be performed if and when the client requests it.
   * @returns A string that we can give to the client.  The client will use this to request the corresponding action.
   */
  private registerAction(action: () => void): string {
    return "TODO";
  }
  matchesTopCard(card: Card) {
    const topCard = this.topCard;
    return (
      card.isWild || topCard.suit == card.suit || topCard.face == card.face
    );
  }
  notifyAllGeneralInfo(player?: Player | undefined) {
    const players: Iterable<Player> = player ? [player] : this.players.values();
    const gameStatus: GameStatus = {
      topCard: this.topCard,
      playersInOrder: this.playersInOrder.map((id) =>
        this.players.get(id)!.export()
      ),
    };
    const drawRequired = this.drawRequired > 0;
    for (const player of players) {
      if (player.playerConnection) {
        const isThisPlayersTurn = player.id == this.playersInOrder[0];
        const makeButton = (
          name: string,
          action: () => void,
          disable: boolean = false
        ): SingleButton => {
          if (isThisPlayersTurn && !disable) {
            return [name, this.registerAction(action)];
          } else {
            return [name];
          }
        };
        const cards: ButtonStatus[] = player.cards.map((card) => {
          let buttons: SingleButton[];
          // TODO add actual actions.
          if (card.isWild) {
            buttons = NORMAL_SUITS.map((suit) =>
              makeButton(
                suit,
                () => {
                  console.log(
                    `${player.name} is playing ${card.toString()} as a ${suit}`
                  );
                },
                drawRequired
              )
            );
          } else if (card.isReverse && this.players.size > 2) {
            const reverseTo = this.getPlayerBefore(player);
            buttons = [
              makeButton(
                `Reverse to ${reverseTo.name}`,
                () =>
                  console.log(
                    `${
                      player.name
                    } is playing ${card.toString()} to reverse to ${
                      reverseTo.name
                    }`
                  ),
                drawRequired || !this.matchesTopCard(card)
              ),
            ];
          } else if (card.isSkip) {
            const skipOver = this.getPlayerAfter(player);
            buttons = [
              makeButton(
                `Skip ${skipOver.name}`,
                () =>
                  console.log(
                    `${
                      player.name
                    } is playing ${card.toString()} to skip over ${
                      skipOver.name
                    }`
                  ),
                drawRequired || !this.matchesTopCard(card)
              ),
            ];
          } else if (card.isDraw2) {
            // TODO We say "Draw 2" for two different reasons.  We say it when you are telling the next person to draw 2, and
            // when someone does it to you.  Make this button should say `make ${nextPlayer} draw ${drawCount}`.
            if (isThisPlayersTurn) {
              const drawCount = this.drawRequired + 2;
              const victim = this.getPlayerAfter(player);
              buttons = [
                makeButton(`Draw ${drawCount}`, () =>
                  console.log(
                    `${player.name} is playing ${card.toString()} to make ${
                      victim.name
                    } draw ${drawCount}`
                  )
                ),
              ];
            } else {
              buttons = [["Draw 2"]];
            }
          } else {
            buttons = [
              makeButton(
                "Play",
                () => {
                  console.log(`${player.name} is playing ${card.toString()}`);
                },
                drawRequired || !this.matchesTopCard(card)
              ),
            ];
          }
          return { card, buttons };
        });
        const drawMultiple = drawRequired && isThisPlayersTurn;
        const drawButton = makeButton(
          drawMultiple ? `Draw ${this.drawRequired}` : "Draw",
          () =>
            console.log(
              `${player.name} is drawing ${
                drawMultiple ? this.drawRequired : 1
              }`
            )
        );
        const cardStatus: CardStatus = { cards, drawButton };
        gameStatus.cardStatus = cardStatus;
        player.playerConnection.send(gameStatus);
      }
      // TODO send gameStatus to player.
    }
  }
  sendUpdatedStatus(id: number) {
    const player = this.players.get(id);
    if (player) {
      this.notifyAllGeneralInfo(player);
      return true;
    } else {
      return false;
    }
  }
  getPlayerAfter(player: Player): Player {
    let index = this.playersInOrder.indexOf(player.id);
    index++;
    if (index >= this.playersInOrder.length) {
      index = 0;
    }
    return this.players.get(this.playersInOrder[index])!;
  }
  getPlayerBefore(player: Player): Player {
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
  setPlayerConnection(
    playerId: number,
    playerConnection: PlayerConnection | undefined
  ) {
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error("unknown playerId:  " + playerId);
    }
    player.playerConnection = playerConnection;
  }
}
