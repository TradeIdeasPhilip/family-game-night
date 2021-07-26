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
    const game = new Game(playerNames);
    // TODO game object needs to be persistent.  The url should include enough info to efficiently find the game.
    game.playerInfo.forEach((player) => {
      result.nameToUrl[player.name] = "./PlayCrazy8s.html?id=" + player.id;
      player.playerConnection = (toSend) => {
        console.log({player : player.name, toSend /*: JSON.stringify(toSend)*/ });
      }
    });
    game.notifyAllGeneralInfo();
    request.respond({ body: JSON.stringify(result) });
    return true;
  }
);
webServer.addPrefixAction("/streaming/crazy-eights", async (request, remainder) => {
  const { conn, r: bufReader, w: bufWriter, headers } = request;
  acceptWebSocket({
    conn,
    bufReader,
    bufWriter,
    headers,
  })
    .then(async (webSocket) => {
      console.log(
        "opened new web socket",
        request.path,
        request.searchParams,
        remainder
      );
      for await (const ev of webSocket) {
        console.log("webSocket event", ev);
      }
    })
    .catch(async (err) => {
      console.error(`failed to accept websocket: ${err}`);
      await request.respond({ status: 400 });
    });
  return true;
});
webServer.start();

console.log("running out of", Deno.cwd());
console.log("Listening.", "http://127.0.0.1:9000/static/", new Date().toLocaleString());
