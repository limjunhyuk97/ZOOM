import express from "express";
import http from "http";
import SocketIO from "socket.io";
import { WebSocket } from "ws";

//** express 프레임워크로 http 요청 듣기 */

const app = express();

// pug 사용 위한 세팅
// 템플릿 엔진을 Pug로 설정
app.set("view engine", "pug");
// views 디렉토리 위치 설정
app.set("views", __dirname + "/views");

// public 폴더를 유저가 볼 수 있게 지정
app.use("/public", express.static(__dirname + "/public"));

// base url로 접근할 경우 home.pug 파일을 보여줘라
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:3000");

//** server생성 <- (3000 포트의 http 프로토콜 사용하는 express 서버 + 동일 포트에서 webSocket 프로토콜 사용하는 서버 )*/
// request listener(: http.createServer의 첫번째 인자로 전달)로 express 서버를 사용한다.
// server를 만드는 것. 3000번 포트에서 http 프로토콜을 사용하는 express를 사용하여 요청을 듣고 있는 server 생성
const httpServer = http.createServer(app);

//** ws 사용하여 WebSocket 프로토콜 사용하는 서버 생성 */
// const wss = new WebSocket.Server({ httpServer });

// const sockets = [];

// wss.on("connection", (socket) => {
//   console.log("connection opened");
//   socket["nickname"] = "Anon";
//   sockets.push(socket);
//   socket.on("close", () => {
//     "connection closed";
//   });
//   socket.on("message", (message) => {
//     const received = JSON.parse(message.toString("utf-8"));
//     if (received.type === "message") {
//       sockets.forEach((aSocket) =>
//         aSocket.send(`${socket.nickname} : ${received.payload}`)
//       );
//     } else if (received.type === "nickname") {
//       socket["nickname"] = received.payload;
//     }
//   });
// });

//** SocketIo 사용하여 실시간 양방향 이벤트 기반 통신 가능한 서버 생성 */
const wsServer = SocketIO(httpServer);
wsServer.on("connection", (socket) => {
  // socket.io 사용하면, 사용자 정의 event를 생성가능하다.
  // ws와는 다르게 string만 주고 받을 수 있는 것이 아니다.
  // 세번째 이상의 인자(arguments)로 함수를 전달하면 -> 백에서 프론트에서 작동할 함수를 어떻게 실행시킬지 로직 정의 가능하다
  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome");
  });
  // 연결에서 끊어지면 socket이 들어있는 room들에 대해서 disconnection 메시지 보냄
  socket.on("disconnecting", () => {
    console.log(socket.rooms.forEach((room) => socket.to(room).emit("bye")));
  });
  // 메시지 전송 시 처리
  socket.on("send_message", (msg, room) => {
    socket.to(room).emit("receive_message", msg);
  });

  socket.onAny((event) => {
    console.log(`socket event ${event}`);
  });
});

httpServer.listen(3000, handleListen);
