const socket = io();

const myFace = document.querySelector("#myFace");
const mute = document.querySelector("#mute");
const camera = document.querySelector("#camera");

// 영상, 소리의 데이터 스트림
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
