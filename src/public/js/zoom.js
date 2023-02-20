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
  await getMedia();
  // RTC 연결을 생성한다.
  makeConnection();
}

// 방 입장 핸들러
async function handleWelcomeSubmit(e) {
  e.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  socket.emit("join_room", input.value, startMedia);
}

// 카메라 변경 (media device id로 변경해야 한다)
async function handleCameraChange(e) {
  await getMedia(camerasSelect.value);
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

//** Socket Code */
socket.on("welcome", async () => {
  // [WEBRTC 2] 다른 브라우저가 room에 참가할 경우 + 각 브라우저들이 새로 참가한 브라우저에게 + offer를 제공
  //  - 다른 브라우저에게 참가 가능한 초대장 제공
  //  - 실시간 세션에 대한 정보이다.
  //  - offer로 연결을 만들어야 한다.
  const offer = await myPeerConnection.createOffer();
  // [WEBRTC 3] createOffer()로 만든 offer로 로컬에서 연결을 생성한다.
  myPeerConnection.setLocalDescription(offer);
  // [WEBRTC 4] 나 빼고 같은 room에 들어와 있는 다른 브라우저들에게 offer를 보낸다.
  //  - offer를 주고 받은 뒤에는 각 브라우저들이
  socket.emit("offer", offer, roomName);
});

// [WERTC 5] 브라우저의 offer 수신
socket.on("offer", (offer) => {});
//** Socket Code */

//** RTC Code */
function makeConnection() {
  // [WEBRTC 0] P2P 연결 생성
  myPeerConnection = new RTCPeerConnection();
  // [WEBRTC 1] 각자 브라우저에서 연결 내에 로컬 데이터 스트림 트랙 추가 (getUserMedia() + addStream() / addTrack())
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
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
