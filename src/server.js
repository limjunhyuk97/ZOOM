import express from "express";
import http from "http";
import { Server } from "socket.io";
import { WebSocket } from "ws";
import { instrument } from "@socket.io/admin-ui";

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
// admin UI 확인
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(wsServer, {
  auth: false,
  mode: "development",
});

wsServer.on("connection", (socket) => {
  wsServer.sockets.emit("room_change", publicRooms());
  // 초기 닉네임 설정
  socket["nickname"] = "anon";
  // socket.io 사용하면, 사용자 정의 event를 생성가능하다.
  // ws와는 다르게 string만 주고 받을 수 있는 것이 아니다.
  // 세번째 이상의 인자(arguments)로 함수를 전달하면 -> 백에서 프론트에서 작동할 함수를 어떻게 실행시킬지 로직 정의 가능하다
  // 초기 방 입장 시 처리
  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    done();
    socket
      .to(roomName)
      .emit("welcome", socket.nickname, countMembers(roomName));
    // 모든 이들에게 방 생성 알림 보내기
    wsServer.sockets.emit("room_change", publicRooms());
  });
  // 연결에서 끊어지기 '직전'에 socket이 들어있는 room들에 대해서 disconnection 메시지 보냄
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket
        .to(room)
        .emit("bye", `${socket.nickname} has left`, countMembers(room) - 1)
    );
  });
  // 연결이 끊어진 '직후'에 메시지 보냄
  socket.on("disconnect", () => {
    // 모든 이들에게 방 제거 알림 보내기
    wsServer.sockets.emit("room_change", publicRooms());
  });
  // 메시지 전송 시 처리
  socket.on("send_message", (msg, room) => {
    socket.to(room).emit("receive_message", msg, socket["nickname"]);
  });
  // 닉네임 설정 처리 : 닉네임은 socket 객체에 저장할 수 있다.
  socket.on("send_nickname", (nickname) => (socket["nickname"] = nickname));

  // 모든 종류의 이벤트들에 대해서 받아봄
  socket.onAny((event) => {
    console.log(`socket event ${event}`);
  });
});

// public room 생성 알리기
function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;

  return [...rooms.keys()].filter((room) => ![...sids.keys()].includes(room));
}

// public room 참가사 수 구하기
function countMembers(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

httpServer.listen(3000, handleListen);
