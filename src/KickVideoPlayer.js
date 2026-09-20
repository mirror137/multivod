import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

const KickVideoPlayer = forwardRef(({ url, playing, volume, muted, playbackRate, vodStart, onPlay, onPause, channelName, publicVodId }, ref) => {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const wantPlayRef = useRef(false);
  const [showTime, setShowTime] = React.useState(false);
  const timeTimerRef = useRef(null);
  const [realTime, setRealTime] = React.useState("");

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    seekTo: (time) => { if (videoRef.current && isFinite(time)) videoRef.current.currentTime = time; },
    getInternalPlayer: () => videoRef.current,
    getMuted: () => videoRef.current?.muted ?? false,
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!url) {
      console.error('KickVideoPlayer: null or empty HLS URL');
      return;
    }

    let hls = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = async () => {
      try {
        await video.play();
        wantPlayRef.current = false;
      } catch (e) {
        // Play failed (not buffered, autoplay blocked, etc.) — keep wantPlayRef true
        wantPlayRef.current = true;
      }
    };

    if (playing) {
      wantPlayRef.current = true;
      tryPlay();
    } else {
      wantPlayRef.current = false;
      video.pause();
    }

    const handleCanPlay = () => {
      if (wantPlayRef.current) {
        tryPlay();
      }
    };

    const handleWaiting = () => {
      wantPlayRef.current = playing;
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume ?? 0.5;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate ?? 1;
  }, [playbackRate]);

   // Real-world timestamp that follows video controls
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!video || !wrapper) return;

    const update = () => {
      const sec = video.currentTime;
      const t = vodStart ? new Date(vodStart.getTime() + sec * 1000) : new Date();
      setRealTime(t.toLocaleString());
    };
    update();
    const iv = setInterval(update, 1000);

    const show = () => {
      setShowTime(true);
      if (timeTimerRef.current) clearTimeout(timeTimerRef.current);
      timeTimerRef.current = setTimeout(() => setShowTime(false), 3000);
    };
    const hide = () => setShowTime(false);

    wrapper.addEventListener('mouseenter', show);
    wrapper.addEventListener('mousemove', show);
    wrapper.addEventListener('mouseleave', hide);

    return () => {
      clearInterval(iv);
      if (timeTimerRef.current) clearTimeout(timeTimerRef.current);
      wrapper.removeEventListener('mouseenter', show);
      wrapper.removeEventListener('mousemove', show);
      wrapper.removeEventListener('mouseleave', hide);
    };
  }, [vodStart]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted ?? false;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => onPlay && onPlay();
    const handlePause = () => onPause && onPause();

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onPlay, onPause]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%' }}
        playsInline
        controls
      />
      {showTime && (
        <a
          href={(() => {
            const sec = videoRef.current?.currentTime || 0;
            if (channelName && publicVodId) return `https://kick.com/${channelName}/videos/${publicVodId}?t=${Math.floor(sec)}`;
            return null;
          })()}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            top: 'auto',
            bottom: 44,
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: '#FFC112',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            zIndex: 4,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
          title="Open VOD at current time"
        >
          {channelName} | {realTime}
        </a>
      )}
    </div>
  );
});

export default KickVideoPlayer;
