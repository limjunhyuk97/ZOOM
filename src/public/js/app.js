const socket = new WebSocket(`ws://${globalThis.location.host}`);
const ul = document.querySelector("ul");
const nickForm = document.querySelector("#nickname");
const msgForm = document.querySelector("#message");

// webSocket 연결이 생긴 경우
socket.addEventListener("open", () => console.log("Connected to Server!"));

// server가 닫힌 경우
socket.addEventListener("close", () => {
  console.log("Disconnected to Server");
});

// socket 연결 듣기
socket.addEventListener("message", (message) => {
  const li = document.createElement("li");
  li.textContent = message.data;
  ul.appendChild(li);
});

// 닉네임 등록
nickForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = nickForm.querySelector("input");
  // JS 객체를 보낼 수 없다. -> 서버에서 String 형식으로 받아야 처리가 용이하다. 만약 다른 언어로 작성된 서버이면 어떻게 하겠는가?
  socket.send(JSON.stringify({ type: "nickname", payload: input.value }));
});

// 메시지 내용
msgForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = msgForm.querySelector("input");
  socket.send(JSON.stringify({ type: "message", payload: input.value }));
  input.value = "";
});
