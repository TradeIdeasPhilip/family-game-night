import { getById } from "./client-misc.js";

const namesTextArea = getById("names", HTMLTextAreaElement);
const goButton = getById("go", HTMLButtonElement);
const showLinksDiv = getById("showLinks", HTMLDivElement);
const listOfLinks = getById("listOfLinks", HTMLUListElement);

let names : string[] = [];

namesTextArea.addEventListener("input", updateFromNames);

function updateFromNames() {
  names = namesTextArea.value.split(/[\r\n]+/).map(line => line.trim()).filter(line => line != "");
  if (names.length == 0) {
    goButton.innerText = "Type 2 names to start."
    goButton.disabled = true;
  } else if (names.length == 1) {
    goButton.innerText = "Type another name to start."
    goButton.disabled = true;
  } else {
    goButton.innerText = "Start " + names.length + " player game.";
    goButton.disabled = false;
  }
}

goButton.addEventListener("click", async ev => {
  const response = await fetch("/js-bin/start-new-game", { body: JSON.stringify(names), method : "post"});
  const body = await response.text();
  const parsed = JSON.parse(body) as { nameToUrl : Record<string, string> }
  // TODO this type should be defined in a file shared by client and server.
  const { nameToUrl } = parsed;
  showLinksDiv.style.display = "";
  listOfLinks.innerText = "";
  for (const name in nameToUrl) {
    const a = document.createElement("a");
    a.innerText = name;
    a.href = nameToUrl[name];
    a.target="new";
    const li = document.createElement("li");
    li.appendChild(a);
    listOfLinks.appendChild(li);
  }
});

