import { makeWebSocketUrl } from "./ts-shared/useful-stuff.js";
import { getById } from "./ts/client-misc.js";

const todoDiv = getById("todo", HTMLDivElement);

const searchParams = new URLSearchParams(location.search);
const userId = searchParams.get("id");
if (userId === null) {
  todoDiv.innerText = "User id not found! 😟";
} else {
  todoDiv.innerText = "Your user id is " + userId;
}

let connection = new WebSocket(makeWebSocketUrl("/streaming/crazy-eights" + location.search, location.toString()));
connection.onclose = event => {
  console.log("WebSocket.onclose", event);
};
connection.onerror = event => {
  console.log("WebSocket.onerror", event);
};
connection.onmessage = event => {
  console.log("WebSocket.onmessage", event);
};
connection.onopen = event => {
  console.log("WebSocket.onopen", event);
};
        
