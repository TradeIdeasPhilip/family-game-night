import { ButtonPressEvent, Card, GameStatus } from "./ts-shared/crazy-8s.js";
import { makeWebSocketUrl } from "./ts-shared/useful-stuff.js";
import { getById } from "./ts/client-misc.js";

// TODO What about invalid id?  Like refreshing after the game has ended.
// The server is closing the WebSocket with a code of 1003 and the reason
// set to "Unknown user id."  The client ignored that.  Unless the user
// looks at the JavaScript console, there is no indication of what went
// wrong.

const todoDiv = getById("todo", HTMLDivElement);
const topCardSpan = getById("topCard", HTMLSpanElement);
const userListTable = getById("userList", HTMLTableElement);
const myCardsDiv = getById("my-cards", HTMLDivElement);
const drawDiv = getById("drawDiv", HTMLDivElement);
const drawButton = getById("drawButton", HTMLButtonElement);

const searchParams = new URLSearchParams(location.search);
const userId = searchParams.get("id");
if (userId === null) {
  todoDiv.innerText = "User id not found! 😟";
} else {
  todoDiv.innerText = "Your user id is " + userId;
}

let connection = new WebSocket(
  makeWebSocketUrl(
    "/streaming/crazy-eights" + location.search,
    location.toString()
  )
);
connection.onclose = (event) => {
  console.log("WebSocket.onclose", event);
};
connection.onerror = (event) => {
  console.log("WebSocket.onerror", event);
};

function sendButtonResponse(code : string) {
  const message : ButtonPressEvent = { code, type: "ButtonPressEvent" };
  connection.send(JSON.stringify(message));
  myCardsDiv.querySelectorAll("button").forEach(button => button.disabled = true);
}

let drawButtonAction : string | undefined;

drawButton.addEventListener("click", () => {
  if (drawButtonAction === undefined) {
    console.log("That's not right!  if drawButtonAction is undefined, drawButton should be disabled.");
  } else {
    sendButtonResponse(drawButtonAction);
  }
});

connection.onmessage = (event) => {
  try {
    const gameStatus: GameStatus = JSON.parse(event.data);
    if (gameStatus.topCard) {
      const topCard = Card.fromJson(gameStatus.topCard);
      topCardSpan.innerText = topCard.toString();
      topCardSpan.className = topCard.isRed ? "red-card" : "black-card";
    }
    if (gameStatus.playersInOrder) {
      // Clear out old info before adding new info.
      Array.from(
        userListTable.querySelectorAll("tr:not(:first-child)")
      ).forEach((element) => element.remove());
      gameStatus.playersInOrder.forEach((player) => {
        const tr = userListTable.insertRow();
        if (userId && (player.id == +userId)) {
          // The user running this script is the player in this row.
          tr.className = "thisUsersInfo";
        }
        const nameTd = tr.insertCell();
        nameTd.innerText = player.name;
        const cardsTd = tr.insertCell();
        cardsTd.innerText = player.cards.toString();
        const scoreTd = tr.insertCell();
        scoreTd.innerText = player.score.toString();
        const lastSeenTd = tr.insertCell();
        lastSeenTd.innerText = player.lastSeen.toLocaleString();
      });
    }
    if (gameStatus.cardStatus) {
      // Clear out old buttons before adding new ones.
      Array.from(myCardsDiv.querySelectorAll(".my-card:not(#drawDiv)")).forEach(
        (element) => element.remove()
      );
      drawButton.innerText = gameStatus.cardStatus.drawButton[0];
      drawButtonAction = gameStatus.cardStatus.drawButton[1];
      drawButton.disabled = drawButtonAction === undefined;
      gameStatus.cardStatus.cards.forEach((buttonStatus) => {
        const topLevel = document.createElement("div");
        topLevel.className = "my-card";
        const cardDiv = document.createElement("div");
        topLevel.appendChild(cardDiv);
        const card = Card.fromJson(buttonStatus.card);
        cardDiv.innerText = card.toString();
        if (card.isRed) {
          cardDiv.className = "red-card";
        } else if (card.isWild) {
          cardDiv.className = "wild-card";
        }
        let buttonGroup: HTMLDivElement | undefined;
        buttonStatus.buttons.forEach((buttonInfo) => {
          if (!buttonGroup) {
            buttonGroup = document.createElement("div");
            topLevel.appendChild(buttonGroup);
          } else {
            buttonGroup.append(" ");
          }
          const button = document.createElement("button");
          const buttonText = buttonInfo[0];
          button.innerText = buttonText;
          const code = buttonInfo[1];
          if (code === undefined) {
            button.disabled = true;
          } else {
            button.addEventListener("click", () => {
              sendButtonResponse(code);
            });            
          }
          if (buttonText == "♥" || buttonText == "♦") {
            button.className = "red-card";
          }
          buttonGroup.appendChild(button);
        });
        myCardsDiv.insertBefore(topLevel, drawDiv);
      });
    }
  } catch (ex) {
    console.error(`error in connection.onmessage: ${ex}`);
  }
  console.log("WebSocket.onmessage", event);
};
connection.onopen = (event) => {
  console.log("WebSocket.onopen", event);
};
