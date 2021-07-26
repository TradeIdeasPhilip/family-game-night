import { getById } from "./ts/client-misc.js";

const todoDiv = getById("todo", HTMLDivElement);

const searchParams = new URLSearchParams(location.search);
const userId = searchParams.get("id");
if (userId === null) {
  todoDiv.innerText = "User id not found! 😟";
} else {
  todoDiv.innerText = "Your user id is " + userId;
}
