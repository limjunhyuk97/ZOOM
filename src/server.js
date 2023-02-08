import express from "express";
import http from "http";
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
const server = http.createServer(app);

// ws 사용하여 WebSocket 프로토콜 사용하는 서버 생성
const wss = new WebSocket.Server({ server });

const sockets = [];

wss.on("connection", (socket) => {
  console.log("connection opened");
  socket["nickname"] = "Anon";
  sockets.push(socket);
  socket.on("close", () => {
    "connection closed";
  });
  socket.on("message", (message) => {
    const received = JSON.parse(message.toString("utf-8"));
    if (received.type === "message") {
      sockets.forEach((aSocket) =>
        aSocket.send(`${socket.nickname} : ${received.payload}`)
      );
    } else if (received.type === "nickname") {
      socket["nickname"] = received.payload;
    }
  });
});

wss.on("close", () => {
  console.log("shit");
});

server.listen(3000, handleListen);
