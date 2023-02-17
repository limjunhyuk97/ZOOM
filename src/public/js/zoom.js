const socket = io();

const myFace = document.querySelector("#myFace");
const mute = document.querySelector("#mute");
const camera = document.querySelector("#camera");

// 영상, 소리의 데이터 스트림 (Media Stream)
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

// 마이크, 카메라 상태
let muted = false;
let cameraOff = false;

// 영상 스트림을 받아서 video 태그의 srcObject에 넣어주기
async function getMedia() {
  try {
    // BOM (Browser Object Model 에서 접근 가능한 객체들)
    // navigator 객체 : 브라우저에 대한 정보 제공
    // -> mediaDevices 프로퍼티 : 카메라, 마이크, 화면 공유 처럼 현재 연결된 미디어 입력장치에 접근할 수 있는 MediaDevices 객체 반환
    // -> MediaDevices.getUserMedia : 사용자에게 권한 요청 후, 카메라, 오디오 각각 또는 모두 활성화  => 입력 데이터를 비디오 / 오디오 트랙으로 포함한 MediaStream 객체 반환
    // -> mediaStream : media content의 stream이다.
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    myFace.srcObject = myStream;
  } catch (e) {
    console.log(e);
  }
}

// mute event handler
function handleMuteEvent(e) {
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
  if (cameraOff) {
    camera.innerText = "turn camera ON";
    cameraOff = false;
  } else {
    camera.innerText = "turn camera OFF";
    cameraOff = true;
  }
}

// media 스트리밍 시작
getMedia();

// 음소거 버튼 핸들러 장착
mute.addEventListener("click", handleMuteEvent);

// 비디오 끄기 핸들러 장착
camera.addEventListener("click", handleCameraClick);
