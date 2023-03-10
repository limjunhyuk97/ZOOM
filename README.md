# Web-Socket

## HTTP와 Web-Socket

<img width="457" alt="image" src="https://user-images.githubusercontent.com/59442344/217470514-a03c5460-da2f-4bae-b1f7-b3580d94556d.png">

## HTTP 프로토콜

- HTTP는 **무상태성(stateless)**을 갖는다. 즉, 서버는 클라이언트의 상태를 저장하고 있지 않는다.
- HTTP는 **비연결성(connectionless)**을 갖는다.
- **Server는 Client로부터 요청이 들어와야 응답을 보낸다.** 요청없이 클라이언트에게 응답을 보내는 경우는 없다.

## Web-socket 프로토콜

- ws://url... 처럼 HTTP와는 아예 다른 프로토콜이다.
- 연결 과정 (handshaking이 일어난다.)
  1. client가 connection request를 보낸다.
  2. server가 accept / deny를 한다. (accept를 하면 connection이 연결된거다.)
  3. connection이 생기면 **Server는 요청없이도 응답(메시지)을 날릴 수 있다.** Client 또한 아무때나 Server(메시지)에게 요청을 보낼 수 있다.
  4. server나 user가 connection을 close하면 연결상태는 끊긴다.
- **Web-socket은 프로토콜**이기 때문에, 언어와 상관없다. **언어에 국한되지 않는다**
- Web-socket 연결은 Client이던, Server이던 두 종단 간에 일어날 수 있다

## Web-Socket Implementation

- 특정 언어에서 Web-socket 프로토콜을 사용하도록 도와주는 Implementation들이 존재한다.
- **JS로 Web-Socket 프로토콜을 사용하도록 도와주는 Implementation으로 [ws](https://github.com/websockets/ws)**가 있다.

## WebSocket Event

- WebSocket 이벤트에 대해 특정 동작을 수행할 수 있도록, 이벤트를 캐치할 수 있게 해주는 WebSocket Event가 존재한다.
  - Backend에서 정의된 WebSocket 이벤트에 따라 핸들러를 동작시킬 수 있다
  - **Frontend**에서 Socket 연결을 **new WebSocket()**을 통해 만들 수 있다.

# Socket IO

## Socket IO 란

- 실시간 양방향 이벤트 기반 통신을 지원하는 JS 프레임워크
- Web socket을 사용할 수 있다면 Web Socket을 사용하지만, 만약 Web Socket을 사용하지 못한다면, 다른 프로토콜을 사용하여 실시간 양방향 통신이 가능하도록 지원한다.
- 서버와 연결이 끊어지면, 이후 연결이 복구될떄까지 계속 연결을 시도해 준다.

## emit (front -> back)

- emit 메서드를 활용하면 event 이름을 지정해줄 수 있다.
- string 뿐만 아니라, 다른 타입의 값들도 서버로 보낼 수 있다.
- 원하는 수만큼 서버로 데이터를 전송할 수 있다.
- 가장 마지막 인자로 함수를 전달한다면, 서버측 처리가 모두 끝나고 **브라우저가 실행시켜야 하는 함수를 전달**할 수 있다.

## Adapter

<img width="1085" alt="image" src="https://user-images.githubusercontent.com/59442344/219069094-e2375eb4-1161-4420-a2db-27b61c06ab7e.png">

- 서로 다른 서버와 연결되어 있는 클라이언트(어플리케이션)의 데이터를 동기화 시키는 것이 Adapter
- 서버는 다수의 클라이언트들과 connection을 open한 상태여야 한다.
- 만약 서버가 하나라면, 동기화와 관련된 문제가 없을 것이다.
- 만약 서버가 여러 개라면, 그리고 서버들이 동일한 메모리 풀(memory pool)을 공유하지 않는다면 어플리케이션 간의 데이터 동기화가 불가능하다
- 이런 경우 Adapter를 사용하여 데이터를 동기화 시켜준다
- Adapter가 room이 몇개이고, 누가 연결되어 있는지 알려줄 수 있다

```js
wsServer.on("connection", (socket) => {
  // wsServer.sockets.adapter로 server에 연결된 모든 socket과 생성된 모든 room 관련 데이터 확인할 수 있다.
  console.log(wsServer.sockets.adapter);
});
```

### 채팅방 정보 활용하기

- private / public room 찾기
  - sid 의 socketid와 rooms의 id 비교
  - rooms (Map 자료형 / room) 데이터의 key, value 쌍 중 sids(Map 자료형 / socket id) 데이터에 존재하는 key 값과 일치하지 않는 key를 갖는 값이 있다면, 해당 방은 일반 public 채팅방이다.

```js
function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;

  return [...rooms.keys()].filter((room) => ![...sids.keys()].includes(room));
}
```

### 새로운 채팅방 생성 알림

```js
socket.on("enter_room", (roomName, done) => {
  socket.join(roomName);
  done();
  socket.to(roomName).emit("welcome", socket.nickname);
  // 모든 이들에게 방 생성 알림 보내기
  wsServer.sockets.emit("room_change", publicRooms());
});
```

### 채팅방 인원수 세기

```js
// public room 참가사 수 구하기
function countMembers(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}
```

# WebRTC

## WebRTC 란?

- web real time communication을 가능하게 해주는 기술이다.
- P2P 방식을 사용한다.
  - "client -> server -> 다른 client들에게 뿌리기(Broadcast)" 의 Web-Socket 방식이 아니다.
  - "client <-> client" 의 방식이다.
- signaling을 위한 server가 필요하다.
- video, audio, text 모두 송수신 가능하다.

## Signaling 과 서버가 필요한 이유?

<img width="806" alt="image" src="https://user-images.githubusercontent.com/59442344/219947649-79796e39-41b4-48cf-817a-8cd39ae70f6c.png">

- P2P 연결을 위해 필요하다.
  - 상대 브라우저가 어디있는지 알아야 한다.
  - 상대 컴퓨터의 IP 주소를 알아야 한다.
  - 상대 프로그램의 포트번호도 알아야 한다.
- 즉, signaling을 위한 server는 상대 client들이 어디있는지 + a의 정보를 다른 client들에게 전달해주기 위해 필요
  - 자신의 IP 주소, port 번호 (위치 정보) ..
  - settings
  - configurations

## WebRTC를 이용한 화상채팅 연결 과정

<img width="747" alt="image" src="https://user-images.githubusercontent.com/59442344/220119381-f2407051-1998-4a94-9ac0-f34eeb2690ef.png">

### negotiating pattern

### STUN server

- 장치 연결 시에 상대방의 공용주소를 알려주는 서버이다.

### Data Channel

- Data Channel을 생성하면 image, file, text 전송, game 플레이 등을 P2P로 가능하게 만들 수 있다.

## WebRTC의 단점

- Peer가 너무 많아질 경우 속도가 느려질 수 있다. (Video와 Audio의 경우)
