import { useEffect, useRef, useState } from 'react';

export default function IntroVideo({ onFinish }) {
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);

  function finish() {
    if (fading) return;
    setFading(true);
    setTimeout(onFinish, 350);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Try to autoplay with sound. Most browsers only block unmuted autoplay on a
    // visitor's very first interaction with the site — if that happens, fall back
    // to muted playback rather than leaving the intro frozen on its first frame.
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, []);

  return (
    <div className={`intro-video-overlay ${fading ? 'fading' : ''}`}>
      <video
        ref={videoRef}
        className="intro-video"
        src="/media/deal-breaker-intro.mp4"
        autoPlay
        playsInline
        onEnded={finish}
        onError={finish}
      />
      <button type="button" className="intro-skip-btn" onClick={finish}>
        Skip →
      </button>
    </div>
  );
}
