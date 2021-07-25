import { getById } from "./client-misc.js";

const namesTextArea = getById("names", HTMLTextAreaElement);
const goButton = getById("go", HTMLButtonElement);
const showLinksDiv = getById("showLinks", HTMLDivElement);
const listOfLinks = getById("listOfLinks", HTMLUListElement);

let names : string[] = [];

namesTextArea.addEventListener("change", () => {
  names = namesTextArea.value.split(/[\r\n]+/).map(line => line.trim()).filter(line => line != "");
  goButton.innerText = "go: " + names.join(", ");
});

goButton.addEventListener("click", async ev => {

});

