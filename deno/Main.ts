import { addTsCompiler } from "./AutoCompile.ts";
import { AugmentedRequest, WebServer } from "./Dispatcher.ts";
import { tripleRot13 } from "./shared/high-security.ts";
import { copyrightString, sleep } from "./shared/useful-stuff.ts";
import { EchoRequest } from "./shared/web-socket-protocol.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
WebSocketEvent,
} from "https://deno.land/std/ws/mod.ts";

const webServer: WebServer = new WebServer();

const textEncoder = new TextEncoder();

async function readerToString(reader : Deno.Reader) {
  let result = "";
  const buffer = new Uint8Array(5);
  const decoder = new TextDecoder();
  while (true) {
    const numberOfBytesRead = await reader.read(buffer);
    if (numberOfBytesRead === null) {
      break;
    }
    const viewOfBytesRead = new Uint8Array(buffer.buffer, 0, numberOfBytesRead);
    result += decoder.decode(viewOfBytesRead, { stream: true});
  }
  result += decoder.decode();
  return result;
}

function isNumericArray(value : any) : value is number[] {
  if (!(value instanceof Array)) {
    return false;
  }
  return !value.some(element => typeof element != "number");
}

function isStringArray(value : any) : value is string[] {
  if (!(value instanceof Array)) {
    return false;
  }
  return !value.some(element => typeof element != "string");
}

let nextPlayerId = 1;
const allPlayers = new Map<number, string>();

webServer.addFileHandler("/static", "../everything-else/visible-to-web/", addTsCompiler);
webServer.addPrefixAction("/js-bin/start-new-game", async (request: AugmentedRequest, remainder: string) => {
  // TODO Add an exception handler!
  const requestBody = await readerToString(request.body);
  console.log({requestBody});
  const playerNames = JSON.parse(requestBody);
  if (!isStringArray(playerNames)) {
    throw new Error("invalid input");
  }
  if (playerNames.length < 2) {
    throw new Error("invalid input");
  }
  const result = {success : true, nameToUrl : {} as Record<string, string>};
  playerNames.forEach(playerName => {
    const idNumber = nextPlayerId;
    nextPlayerId++;
    allPlayers.set(idNumber, playerName);
    result.nameToUrl[playerName] = "./PlayCrazy8s.html?id=" + idNumber;
  });
  request.respond({body: JSON.stringify(result)});
  return true;
});
///js-bin/greet?encrypted_name
webServer.addPrefixAction("/streaming", async (request, remainder) => {
  const { conn, r: bufReader, w: bufWriter, headers } = request;
  acceptWebSocket({
    conn,
    bufReader,
    bufWriter,
    headers,
  })
    .then(async (webSocket) => {
      console.log("opened new web socket", request.path, request.searchParams, remainder);
      for await  (const ev of webSocket) {
        console.log("webSocket event", ev);
        const echoRequest = EchoRequest.tryDecode(ev);
        if (echoRequest) {
          (async () => {
            for (let i = 0; i < echoRequest.repeatCount; i++) {
              await sleep(echoRequest.delay);
              //console.log({ i, echoRequest });
              if (i % 2) {
                // Odd Numbers
                webSocket.send(textEncoder.encode(echoRequest.message));
              } else {
                // Even Numbers
                webSocket.send(echoRequest.message);
              }
            }
          })();
          console.log("TODO handle echo request", echoRequest);
        }
      }
    })
    .catch(async (err) => {
      console.error(`failed to accept websocket: ${err}`);
      await request.respond({ status: 400 });
    });
  return true;
})
webServer.start();

console.log("running out of", Deno.cwd());
console.log("Listening.", "http://127.0.0.1:9000/static/", copyrightString);
