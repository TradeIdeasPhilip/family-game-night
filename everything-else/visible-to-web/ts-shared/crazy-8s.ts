export type Face =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export type NormalSuit = "♠" | "♥" | "♦" | "♣";
export type Suit = "●" | NormalSuit;

export type FaceInfo = {
  isWild?: boolean;
  isReverse?: boolean;
  isDraw2?: boolean;
  isSkip?: boolean;
  points: number;
};

const FACES: ReadonlyMap<Face, FaceInfo> = new Map([
  ["A", { points: 1, isReverse: true }],
  ["2", { points: 2, isDraw2: true }],
  ["3", { points: 3 }],
  ["4", { points: 4 }],
  ["5", { points: 5 }],
  ["6", { points: 6 }],
  ["7", { points: 7 }],
  ["8", { points: 50, isWild: true }],
  ["9", { points: 9 }],
  ["10", { points: 10 }],
  ["J", { points: 10 }],
  ["Q", { points: 10, isSkip: true }],
  ["K", { points: 10 }],
]);

export const NORMAL_SUITS = ["♠", "♥", "♦", "♣"] as const;

export class Card {
  toString() {
    return this.face + this.suit;
  }
  private constructor(
    readonly face: Face,
    readonly suit: Suit,
    readonly sortOrder: number
  ) {
    //
  }
  static fromJson(json: JsonCard): Card {
    return new Card(json.face, json.suit, json.sortOrder);
  }
  static createDeck(count = 1): Card[] {
    let result: Card[] = [];
    let sortOrder = 1;
    for (let i = 0; i < 4 * count; i++) {
      result.push(new Card("8", "●", sortOrder++));
    }
    NORMAL_SUITS.forEach((suit) => {
      FACES.forEach((faceInfo, face) => {
        if (!faceInfo.isWild) {
          for (let i = 0; i < count; i++) {
            result.push(new Card(face, suit, sortOrder++));
          }
        }
      });
    });
    return result;
  }
  get isWild() {
    return FACES.get(this.face)!.isWild;
  }
  get isReverse() {
    return FACES.get(this.face)!.isReverse;
  }
  get isDraw2() {
    return FACES.get(this.face)!.isDraw2;
  }
  get isSkip() {
    return FACES.get(this.face)!.isSkip;
  }
  get isRed() {
    return (this.suit == "♥") || (this.suit == "♦");
  }
  get isBlack() {
    return (this.suit == "♠") || (this.suit == "♣");
  }
  get points() {
    return FACES.get(this.face)!.points;
  }
}

export type JsonCard = {
  face: Face;
  suit: Suit;
  sortOrder: number;
};

export type JsonPlayer = {
  name: string;
  id: number;
  cards: number;
  score: number;
  lastSeen: "Connected" | "Never" | Date;
};

export type SingleButton = [string] | [string, string];

export type ButtonStatus = {
  card: JsonCard;
  buttons: SingleButton[];
};

export type CardStatus = {
  cards: ButtonStatus[];
  drawButton: SingleButton;
};

export type GameStatus = {
  topCard?: JsonCard;
  playersInOrder?: JsonPlayer[];
  cardStatus?: CardStatus;
};

/**
 * I'm using this for invalid input.  E.g. the client specified an invalid player id.
 * Source:  https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#properties
 */
export const WEB_SOCKET_CLOSE_UNSUPPORTED_DATA = 1003;

/**
 * I'm using this for random exceptions.  We can add more specific things, but this is the
 * catchall for catching an exception and not knowing what else to do with it.
 * Source:  https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#properties
 */
export const WEB_SOCKET_CLOSE_INTERNAL_ERROR = 1011;

/**
 * I'm using this when a user tries to make a second connection the server and the
 * server closes down the first connection.
 * More info:  https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#properties
 */
export const WEB_SOCKET_CLOSE_NO_RETRY = 4000;
