import { addTsCompiler } from "./AutoCompile.ts";
import { AugmentedRequest, WebServer } from "./Dispatcher.ts";
import { sleep } from "./shared/useful-stuff.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
  WebSocketEvent,
} from "https://deno.land/std/ws/mod.ts";
import { Game } from "./Crazy8s.ts";
import {
  WEB_SOCKET_CLOSE_INTERNAL_ERROR,
  WEB_SOCKET_CLOSE_UNSUPPORTED_DATA,
  WEB_SOCKET_CLOSE_NO_RETRY,
} from "./shared/crazy-8s.ts";

const webServer: WebServer = new WebServer();

const textEncoder = new TextEncoder();

async function readerToString(reader: Deno.Reader) {
  let result = "";
  const buffer = new Uint8Array(5);
  const decoder = new TextDecoder();
  while (true) {
    const numberOfBytesRead = await reader.read(buffer);
    if (numberOfBytesRead === null) {
      break;
    }
    const viewOfBytesRead = new Uint8Array(buffer.buffer, 0, numberOfBytesRead);
    result += decoder.decode(viewOfBytesRead, { stream: true });
  }
  result += decoder.decode();
  return result;
}

function isNumericArray(value: any): value is number[] {
  if (!(value instanceof Array)) {
    return false;
  }
  return !value.some((element) => typeof element != "number");
}

function isStringArray(value: any): value is string[] {
  if (!(value instanceof Array)) {
    return false;
  }
  return !value.some((element) => typeof element != "string");
}

// TODO we should be able to support multiple games at once.
let game: Game | undefined;

webServer.addFileHandler(
  "/static",
  "../everything-else/visible-to-web/",
  addTsCompiler
);
webServer.addPrefixAction(
  "/js-bin/start-new-game",
  async (request: AugmentedRequest, remainder: string) => {
    // TODO Add an exception handler!
    const requestBody = await readerToString(request.body);
    console.log({ requestBody });
    const playerNames = JSON.parse(requestBody);
    if (!isStringArray(playerNames)) {
      throw new Error("invalid input");
    }
    if (playerNames.length < 2) {
      throw new Error("invalid input");
    }
    const result = { success: true, nameToUrl: {} as Record<string, string> };
    game = new Game(playerNames);
    game.allPlayerInfo.forEach((player) => {
      result.nameToUrl[player.name] = "./PlayCrazy8s.html?id=" + player.id;
      player.playerConnection = {
        send(toSend) {
          console.log({
            player: player.name,
            toSend /*: JSON.stringify(toSend)*/,
          });
        },
      };
    });
    game.notifyAllGeneralInfo();
    request.respond({ body: JSON.stringify(result) });
    return true;
  }
);

/**
 * This will run until the WebSocket is closed.
 * @param request As given by the web server callback.
 * @param remainder As given by the seb server callback.
 */
async function streamingCrazyEights(
  request: AugmentedRequest,
  remainder: string
) {
  const { conn, r: bufReader, w: bufWriter, headers } = request;
  let webSocket: WebSocket | undefined;
  try {
    webSocket = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    });
    console.log(
      "opened new web socket",
      request.path,
      request.searchParams,
      remainder
    );
    const id = +(request.searchParams.get("id") ?? "");
    const player = game?.getPlayerInfo(id);
    if (!player) {
      console.log("Can't find user with id=" + id);
      webSocket.close(WEB_SOCKET_CLOSE_UNSUPPORTED_DATA, "Unknown user id.");
    } else {
      player.playerConnection?.cancel?.();
      player.playerConnection = {
        send(toSend) {
          webSocket?.send(JSON.stringify(toSend));
          console.log({
            player: player.name,
            toSend /*: JSON.stringify(toSend)*/,
          });
        },
        cancel() {
          if (webSocket && !webSocket.isClosed) {
            webSocket.close(WEB_SOCKET_CLOSE_NO_RETRY);
          }
        },
      };
      game?.sendUpdatedStatus(id);
    }
    for await (const ev of webSocket) {
      // TODO if we get an event, pass it on to the corresponding game
      console.log("webSocket event", ev);
    }
  } catch (err) {
    if (!webSocket) {
      // We failed before we created the WebSocket.  Send an HTTP error.
      console.error(`failed to accept websocket: ${err}`);
      request.respond({ status: 400 });
    } else {
      // We failed after creating the WebSocket.  Close it to notify the other end.
      console.error(
        `Error while handing WebSocket: ${err}.  WebSocket is open: ${
          webSocket.isClosed ? "No" : "Yes"
        }`
      );
      if (!webSocket.isClosed) {
        webSocket.close(
          WEB_SOCKET_CLOSE_INTERNAL_ERROR,
          "Unexpected server error."
        );
      }
    }
  }
  // Now what?  Do we need to do something with the response?  Do we need to close the websocket first?
}

webServer.addPrefixAction(
  "/streaming/crazy-eights",
  (request, remainder): Promise<true> => {
    streamingCrazyEights(request, remainder);
    return Promise.resolve(true);
  }
);
webServer.start();

console.log("running out of", Deno.cwd());
console.log(
  "Listening.",
  "http://127.0.0.1:9000/static/",
  new Date().toLocaleString()
);
