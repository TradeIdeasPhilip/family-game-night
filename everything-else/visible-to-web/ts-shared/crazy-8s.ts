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
const NORMAL_SUITS = ["♠", "♥", "♦", "♣"] as const;

export class Card {
  private constructor(
    readonly face: Face,
    readonly suit: Suit,
    readonly sortOrder: number
  ) {
    //
  }
  static fromJson(json : JsonCard) : Card {
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
  name : string;
  id : number;
  cards : number;
  score : number;
  lastSeen : "Connected" | "Never" | Date;
}

export type ButtonStatus = {
  card : JsonCard;
  buttons : ([string] | [string, string])[];
}

export type CardStatus = {
  cards : ButtonStatus[];
  drawCode? : string;
}

export type GameStatus = {
  topCard? : JsonCard;
  playersInOrder? : JsonPlayer[];
  cardStatus? : CardStatus;
};

