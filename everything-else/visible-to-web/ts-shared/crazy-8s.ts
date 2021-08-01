import { pickOneRandomly } from "./useful-stuff.js";

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
  sortOrder: number;
};

const FACES: ReadonlyMap<Face, FaceInfo> = new Map([
  ["A", { sortOrder: 1, points: 1, isReverse: true }],
  ["2", { sortOrder: 2, points: 2, isDraw2: true }],
  ["3", { sortOrder: 3, points: 3 }],
  ["4", { sortOrder: 4, points: 4 }],
  ["5", { sortOrder: 5, points: 5 }],
  ["6", { sortOrder: 6, points: 6 }],
  ["7", { sortOrder: 7, points: 7 }],
  ["8", { sortOrder: 8, points: 50, isWild: true }],
  ["9", { sortOrder: 9, points: 9 }],
  ["10", { sortOrder: 10, points: 10 }],
  ["J", { sortOrder: 11, points: 10 }],
  ["Q", { sortOrder: 12, points: 10, isSkip: true }],
  ["K", { sortOrder: 13, points: 10 }],
]);

const FACES_IN_ORDER: ReadonlyArray<Face> = Array.from(FACES.keys());

const FACES_NO_WILD: ReadonlyArray<Face> = FACES_IN_ORDER.filter(
  (face) => !FACES.get(face)!.isWild
);

export const NORMAL_SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

const SUITS: Suit[] = ["●", ...NORMAL_SUITS];

const sortOrderBySuit: ReadonlyMap<Suit, number> = new Map(
  SUITS.map((suit, index) => [suit, (index + 1) * 100])
);

export class Card {
  toString() {
    return this.face + this.suit;
  }
  readonly sortOrder: number;
  private constructor(readonly face: Face, readonly suit: Suit) {
    this.sortOrder = FACES.get(face)!.sortOrder + sortOrderBySuit.get(suit)!;
  }
  static fromJson(json: JsonCard): Card {
    return new Card(json.face, json.suit);
  }

  /**
   *
   * @returns A randomly selected card that is not wild.
   */
  static randomNoWild() {
    return new Card(
      pickOneRandomly(FACES_NO_WILD),
      pickOneRandomly(NORMAL_SUITS)
    );
  }

  /**
   *
   * @returns A randomly selected card.  8's are wild.
   */
  static randomAny() {
    // We always pick a random card to make things easier.  We don't have to keep track of the cards
    // in play.  And we don't have to test a lot of edge cases, like running out of cards in a draw 6
    // situation.
    const face = pickOneRandomly(FACES_IN_ORDER);
    if (FACES.get(face)!.isWild) {
      return new Card(face, "●");
    } else {
      return new Card(face, pickOneRandomly(NORMAL_SUITS));
    }
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
    return this.suit == "♥" || this.suit == "♦";
  }
  get isBlack() {
    return this.suit == "♠" || this.suit == "♣";
  }
  get points() {
    return FACES.get(this.face)!.points;
  }
}

export type JsonCard = {
  face: Face;
  suit: Suit;
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

/**
 * Goes from the client back to the server.
 */
export type ButtonPressEvent = {
  type : "ButtonPressEvent",
  /**
   * This is a cookie which was sent by the server to the client.
   * Each button gets its own code.
   */
  code : string;
}

export function isButtonPressEvent(e : any) : e is ButtonPressEvent {
  return ((typeof e == "object") && (e.type == "ButtonPressEvent") && (typeof e.code == "string"));
}
