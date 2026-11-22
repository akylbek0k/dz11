export const DEFAULT_SIGNALING_URL = 'wss://inai-col3.fishrungames.com/signaling/';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Generates a mock synthetic canvas stream in case the user has no physical camera or denies access
export function createSyntheticStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  let hue = 220;
  function draw() {
    ctx.fillStyle = `hsl(${hue}, 40%, 15%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Собеседование (Виртуальная камера)', canvas.width / 2, canvas.height / 2 + 70);

    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Камера не обнаружена или доступ ограничен', canvas.width / 2, canvas.height / 2 + 105);

    hue = (hue + 0.2) % 360;
    requestAnimationFrame(draw);
  }
  draw();

  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);

  // Add dummy silent audio track using Web Audio API
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const dummyAudioTrack = dst.stream.getAudioTracks()[0];
    if (dummyAudioTrack) {
      dummyAudioTrack.enabled = false;
      stream.addTrack(dummyAudioTrack);
    }
  } catch {
    // Audio synthesis not available
  }

  return stream;
}
