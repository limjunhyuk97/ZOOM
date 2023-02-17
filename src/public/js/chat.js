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
  const msgForm = room.querySelector("#msg");
  const nameForm = room.querySelector("#name");
  msgForm.addEventListener("submit", handleMessageSubmit(msgForm));
  nameForm.addEventListener("submit", handleNameSubmit(nameForm));
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
function handleRoomSubmit(event) {
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

// 닉네임 설정 이벤트
function handleNameSubmit(form) {
  return (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("send_nickname", input.value);
  };
}

// 메시지 전송 시 이벤트
function handleMessageSubmit(form) {
  return (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit(
      "send_message",
      input.value,
      roomName,
      handleAddMessage(`YOU says : "${input.value}"`)
    );
    input.value = "";
  };
}

// 메시지 전송 시 채팅 생성
function handleAddMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

form.addEventListener("submit", handleRoomSubmit);
exitBtn.addEventListener("click", exitRoom);

// 브라우저에서 특정 event에 반응하도록 구현 - 이 경우에서는 다른 사람이 방에 입장한 경우
socket.on("welcome", (userName, cnt) => {
  const h3 = document.querySelector("h3");
  h3.innerText = `Room ${roomName} (${cnt})`;
  handleAddMessage(`${name} joined`);
});

// 특정 socket의 연결이 끊기면 bye 메시지 보내기
socket.on("bye", (name, cnt) => {
  const h3 = document.querySelector("h3");
  h3.innerText = `Room ${roomName} (${cnt})`;
  handleAddMessage(`${name} has left!`);
});

// 새로운 메시지 받을 경우 처리
socket.on("receive_message", (msg, nickname) => {
  handleAddMessage(`${nickname} : ${msg}`);
});

// 새로운 방 생성 알림 받기
socket.on("room_change", (rooms) => {
  const ul = welcome.querySelector("#roomlist");
  ul.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    ul.appendChild(li);
  });
});

// 방 제거 알림 받기
socket.on("disconnect", (msg) => console.log(msg));
