const socket = io();

const myFace = document.querySelector("#myFace");
const mute = document.querySelector("#mute");
const camera = document.querySelector("#camera");
const camerasSelect = document.querySelector("#cameras");
const welcome = document.querySelector("#welcome");
const welcomeForm = welcome.querySelector("form");
const call = document.querySelector("#call");

//** 영상, 소리의 로컬 데이터 스트림 (Media Stream) */
// Media Stream API를 활용하면, Media Stream을 다룰 수 있다.
// - Media Stream API는 WebRTC와 연관된 API이다.
// - Media Stream API는 다음으로 구성된다.
//    - Media Stream
//    - Media Stream Track (Stream을 구성하는 Track)
//      - video, audio, subtitle 등으로 구성될 수 있다.
//      - channel로 구성된다. (media stream의 최소 단위 / 예를 들어 스테레오 사운드에서 왼쪽 사운드와 같이)
//    - 데이터 형식
//    - 비동기 요청 결과로서 성공 / 에러 callback
//    - process중 발생하는 event
// - Media Stream 객체는 하나의 input, 하나의 output을 갖는다.
//    - input을 기준으로 2가지로 나뉜다.
//      - local Media Stream : navigator.mediaDevices.getuserMedia()로 생성한 MediaStream 객체
//        - source input을 유저의 카메라나, 마이크중 하나로 갖는다.
//      - non-local Media Stream : network에서 받아온 stream / WebRTC의 RTCPeerConnection으로 받아온 Media Stream / Web Audio API의 MediaStreamAudioDestinationNode 사용하여 생성한 Media Stream
//    - Media Stream의 output은 "consumer"에 연결된다.
//      - consumer로 <video> <audio> 태그 사용 가능
//      - consumer로 WebRTC의 RTCPeerConection 사용 가능
//      - consumer로 Web Audio API의 MediaStreamAudioSourceNode 사용 가능
let myStream;

//** Peer Connection */
let myPeerConnection;

// 마이크, 카메라 상태
let muted = false;
let cameraOff = false;

// 참가한 방이름
let roomName;

// call 가리기 (초기 동영상화면 가리기)
call.hidden = true;

// 카메라 종류 선택 가능하게 만들기
// 컴퓨터에 연결되어 있는 모든 (미디어)장치 정보를 담고있는 객체의 배열 가져오기
// 정보에는 'kind'라는 프로퍼티가 존재 -> 해당 프로퍼티의 값으로 'audioinput', 'videoinput' 등이 존재한다.
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      // [InputDeviceInfo] 객체 내의 (deviceId, label) 속성 = (기기 고유 id, 기기명)
      option.value = camera.deviceId;
      option.innerText = camera.label;
      // 현재 카메라와 같은 카메라 option이라면, 선택된 것으로 보여줘라
      if (currentCamera.label === camera.label) option.selected = true;
      camerasSelect.appendChild(option);
    });
  } catch (err) {
    console.log(err);
  }
}

// 영상 보여주기
// 영상 스트림(Media Stream)을 받아서 video 태그의 srcObject에 넣어주기
async function getMedia(deviceId) {
  try {
    // 초기 영상 시트림 정보
    const initialConstraints = {
      audio: true,
      video: { facingMode: "user" },
    };
    // 특정 비디오(카메라 장치) 연결
    // {exact : id-string}으로 지정하면, 특정 비디오 기기가 없을 경우 영상 입력 안됨
    const cameraConstraints = {
      audio: true,
      video: { deviceId: { exact: deviceId } },
    };

    //** BOM (Browser Object Model 에서 접근 가능한 객체들) 에서 navigator 통해 Media Strema 추출하기 */
    // navigator 객체 : 브라우저에 대한 정보 제공
    // -> mediaDevices 프로퍼티 : 카메라, 마이크, 화면 공유 처럼 현재 연결된 미디어 입력장치에 접근할 수 있는 MediaDevices 객체 반환
    // -> MediaDevices.getUserMedia : 사용자에게 권한 요청 후, 카메라, 오디오 각각 또는 모두 활성화  => 입력 데이터를 비디오 / 오디오 트랙으로 포함한 MediaStream 객체 반환
    // -> mediaStream : media content의 stream이다.
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
  } catch (e) {
    console.log(e);
  }
}

// 방에 입장 시 실행하는 함수
async function startMedia() {
  welcome.hidden = true;
  call.hidden = false;
  // video 태그에 Media Stream 객체 연결
  await getMedia();
  // RTC 연결을 생성한다.
  makeConnection();
}

// 방 입장 핸들러
async function handleWelcomeSubmit(e) {
  e.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  // socket.emit("join_room", input.value, startMedia);
  // 위의 코드는 네트워크 요청-응답이 모두 발생한 뒤에 startMedia()를 실행시킴으로써 : join_room -> welcome -> offer -> offer 수령
  // RTCPeerConnection으로 myPeerConnection 객체를 생성하기 이전에 offer를 받게 되는 문제를 만들 수 있다.

  // 아래와 같이 RTCPeerConnection 객체 생성 후 socket event emit
  await startMedia();
  socket.emit("join_room", input.value, startMedia);
}

// 카메라 변경 (media device id로 변경해야 한다)
async function handleCameraChange(e) {
  await getMedia(camerasSelect.value);
  // myStream에서 현재 내가 선택한 videoTrack을 선택한다.
  // myPeerConnection 객체에서 P2P로 연결되어 있는 video track을 선택한다.
  // P2P로 연결된 video track을 replaceTrack() 메서드를 통해 myStream에 등록된 videoTrack으로 교체한다.
  if (myPeerConnection) {
    const curVideoTrack = myStream.getVideoTracks()[0];
    const newVideoTrack = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    newVideoTrack.replaceTrack(curVideoTrack);
  }
}

// mute event handler
function handleMuteEvent(e) {
  // Media Stream을 구성하는 audio track 들에 접근하여 각 track들을 mute 시킨다.
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    mute.innerText = "unmuted";
    muted = true;
  } else {
    mute.innerText = "muted";
    muted = false;
  }
}

// camera off event handler
function handleCameraClick(e) {
  console.log(myStream.getVideoTracks());
  // Media Stream을 구성하는 video track 들에 접근하여 각 track들을 off 시킨다.
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    camera.innerText = "turn camera ON";
    cameraOff = false;
  } else {
    camera.innerText = "turn camera OFF";
    cameraOff = true;
  }
}

// ice-candidate handler
function handleIce(data) {
  console.log("get ice candidates");
  // [WEBRTC 11] ICE candidate event 발생 감지 + ICE candidate socket.io를 통해 전송
  socket.emit("ice", data.candidate, roomName);
  console.log("send ice candidates");
}

// stream add handler
function handleAddStream(data) {
  console.log("got an event(stream) from my peer");
  console.log("Peer stream : ", data.stream);
  console.log("My Stream", myStream);

  const peersStream = document.querySelector("#peerFace");
  peersStream.srcObject = data.stream;
}

//** Socket Code */
// 입장 -> 다른 참가자들이 offer 새로 생성 + offer로 연결 설정 + 뿌리기 시작
socket.on("welcome", async () => {
  console.log("send an offer");
  // [WEBRTC 2] 다른 브라우저가 room에 참가할 경우 + 각 브라우저들이 새로 참가한 브라우저에게 + offer를 제공
  //  - 다른 브라우저에게 참가 가능한 초대장 제공
  //  - SessionDescription 객체이다.
  //  - offer로 연결을 만들어야 한다.
  const offer = await myPeerConnection.createOffer();
  // [WEBRTC 3] createOffer()로 만든 offer로 로컬에서 연결을 생성한다.
  //  - 로컬 종단의 속성과, 로컬 종단에서 주고 받고자 하는 media format의 정보를 담고 있는 session description으로 connection 설정을 수행한다.
  //  - negotiation이 모두 완료되기 전까지 합의된 connection 설정의 효력은 없다.
  myPeerConnection.setLocalDescription(offer);
  // [WEBRTC 4] 나 빼고 같은 room에 들어와 있는 다른 브라우저들에게 offer를 보낸다.
  socket.emit("offer", offer, roomName);
});

// [WEBRTC 5] 브라우저의 offer 수신
// offer 수신 -> answer 새로 생성 + answer로 연결 설정 + 뿌리기
socket.on("offer", async (offer) => {
  console.log("received an offer");
  // [WEBTRC 6] 다른 브라우저에서 받은 offer를 바탕으로 연결 생성
  //  - 원격 종단의 속성과, 원격 종단에서 주고 받고자 하는 media format의 정보를 담고 있는 session description으로 connection 설정을 수행한다.
  //  - negotiation이 모두 완료되기 전까지 합의된 connection 설정의 효력은 없다.
  myPeerConnection.setRemoteDescription(offer);
  // [WEBRTC 7] answer 생성 (session description)
  const answer = await myPeerConnection.createAnswer();
  // [WEBRTC 8] answer 로 setLocalDescription 함수 호출하여 connection 설정 수행
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("send an answer");
});

// [WEBRTC 9] 브라우저의 answer 수신
// answer 수신 -> answer로 연결 설정
socket.on("answer", (answer) => {
  console.log("received an answer");
  // [WEBRTC 10] 다른 브라우저에서 받은 answer 바탕으로 연결 완료
  myPeerConnection.setRemoteDescription(answer);
});

// [WEBRTC 12] ICE candidate 수신 + 추가
socket.on("ice", (ice) => {
  console.log("received candidates");
  myPeerConnection.addIceCandidate(ice);
});

//** Socket Code */

//** RTC Code */
function makeConnection() {
  // [WEBRTC 0] P2P 연결 생성
  myPeerConnection = new RTCPeerConnection();
  // [WEBRTC 1] 각자 브라우저에서 연결 내에 로컬 데이터 스트림 트랙 추가 (getUserMedia() + addStream() / addTrack())
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
  // [WEBRTC 0] offer + answer 송수신 과정이 끝나고 나면 icecandidate event가 발생한다.
  //  - ICE(Interactive Connectivity Establishment) candidate은 종단간 연결 위해 필요한 프로토콜과 라우팅에 관한 정보를 묘사한다.
  //  - WebRTC P2P 연결이 시작될 때 연결을 위한 여러 후보들이 제안되고, 이 중 가장 좋은 하나로 상호 동의 끝에 연결이 설정된다.
  //  - 이때 candidate의 detail 정보를 활용한다.
  //  - 해당 ice candidate들은 브라우저에서 만들어진 것일 뿐이다. ice candidate들이 만들어진 것을 eventListener로 들은 것이다.
  //  - eventListener로 ice candidate들을 알아냈다면 이를 socket 통신으로 또 다른 브라우저들에 전파시켜주어야 한다.
  myPeerConnection.addEventListener("icecandidate", handleIce);
  // [WEBRTC 0] icecandidate를 주고받는 과정이 끝나면 addstream event가 발생한다.
  //  - addstream event로 peer의 data stream을 받아올 수 있다.
  myPeerConnection.addEventListener("addstream", handleAddStream);
}
//** RTC Code */

// 함수 실행
(async () => {
  // media 스트리밍 시작
  await getMedia();

  // 연결된 미디어 장치들의 정보를 얻어온다.
  await getCameras();

  // 음소거 버튼 핸들러 장착
  mute.addEventListener("click", handleMuteEvent);

  // 비디오 끄기 핸들러 장착
  camera.addEventListener("click", handleCameraClick);

  // 카메라 변경
  camerasSelect.addEventListener("input", handleCameraChange);

  // 방 입장 handler
  welcomeForm.addEventListener("submit", handleWelcomeSubmit);
})();
