const socket = io();

const welcome = document.querySelector("#welcome");
const form = document.querySelector("form");
const room = document.querySelector("#room");
const roomBtnWrapper = document.querySelector(".room--btn-wrapper");
const exitBtn = document.querySelector("#exit--btn");
const sendBtn = document.querySelector("#send--btn");

room.hidden = true;
roomBtnWrapper.style.display = "flex";
roomBtnWrapper.style.gap = "4px";

let roomName = "";

function showRoom() {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = document.querySelector("h3");
  h3.textContent = roomName;
  const form = room.querySelector("form");
  form.addEventListener("submit", handlerMessageSubmit);
}

function exitRoom(event) {
  event.preventDefault();
  welcome.hidden = false;
  room.hidden = true;
}

function backendDone(msg) {
  console.log(msg);
}

// 방 생성시의 이벤트
function handlerRoomSubmit(event) {
  event.preventDefault();
  const input = form.querySelector("input");

  // socket.io 사용하면, 사용자 정의 event를 생성가능하다.
  // ws와는 다르게 string만 주고 받을 수 있는 것이 아니다.
  // 세번째 이상의 인자(arguments)로 함수를 전달하면 -> 백에서 프론트에서 작동할 함수를 어떻게 실행시킬지 로직 정의 가능하다
  socket.emit("enter_room", input.value, backendDone);
  roomName = input.value;
  input.value = "";
  showRoom();
}

// 메시지 전송 시 이벤트
function handlerMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("input");
  socket.emit(
    "send_message",
    input.value,
    roomName,
    handleAddMessage(`YOU says : "${input.value}"`)
  );
  input.value = "";
}

// 메시지 전송 시 채팅 생성
function handleAddMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

form.addEventListener("submit", handlerRoomSubmit);
exitBtn.addEventListener("click", exitRoom);
sendBtn.addEventListener("click", handlerMessageSubmit);

// 브라우저에서 특정 event에 반응하도록 구현 - 이 경우에서는 다른 사람이 방에 입장한 경우
socket.on("welcome", () => {
  handleAddMessage("Fucker joined");
});

// 특정 socket의 연결이 끊기면 bye 메시지 보내기
socket.on("bye", () => {
  handleAddMessage("BYE");
});

// 새로운 메시지 받을 경우 처리
socket.on("receive_message", handleAddMessage);
