import React from 'react';
import './App.css';
import ReactPlayer from 'react-player'
import {isMobile} from 'react-device-detect'
import KickVideoPlayer from './KickVideoPlayer';
import {gqlVideoQuery, gqlVideosQuery} from "./gqlQueries";

const minHeight = 225
const defaultVolume = 1
const progressInterval = 1000
const twitchPurple = "#9147ff"
const kickGreen = "#52fc71"

const colors = {
  pageBg: "#161618",
  barBg: "#232326",
  buttonBg: "#34343a",
  buttonBorder: "#4d4d55",
  text: "#e8e8ec",
  inputBg: "#1d1d21",
  popupBg: "#2a2a2f",
  popupShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
  accent: "#c9b3ff",
}

const iconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
}

const Back60Icon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M11 17l-5-5 5-5" />
    <path d="M18 17l-5-5 5-5" />
  </svg>
)
const Back10Icon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const Fwd10Icon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const Fwd60Icon = () => (
  <svg {...iconProps} aria-hidden="true">
    <path d="M13 17l5-5-5-5" />
    <path d="M6 17l5-5-5-5" />
  </svg>
)
const PlayIcon = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5l13 7.5-13 7.5z" />
  </svg>
)
const PauseIcon = () => (
  <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="4.5" width="4.5" height="15" rx="1" />
    <rect x="13.5" y="4.5" width="4.5" height="15" rx="1" />
  </svg>
)

const MediaButton = ({ onClick, title, children }) => (
  <div
    className="mediaButton"
    style={{
      ...style.control,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={onClick}
    title={title}
  >
    {children}
  </div>
)

const style= {
  bar: showBar => ({
    background: colors.barBg,
    minHeight: showBar ? 25 : 0,
    display: showBar ? "flex" : "none",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  }),
  buttonContainer: {
    display: "flex",
    alignItems: "center",
  },
  button: isActive => ({
    background: colors.buttonBg,
    color: colors.text,
    border: `1px solid ${colors.buttonBorder}`,
    padding: "1px 8px",
    fontSize: "13px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    height: "26px",
    transition: "background 120ms ease, color 120ms ease, box-shadow 120ms ease",
    boxShadow: isActive ? `inset 1px 1px 3px ${twitchPurple}, inset -1px -1px 3px ${twitchPurple}` : "",
    whiteSpace: "nowrap",
  }),
  link: {
    color: colors.accent,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  control: {
    margin: "0 6px",
    color: colors.text,
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    cursor: "pointer",
  },
  angle: barShown => ({
    margin: "9px 9px",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    MsUserSelect: "none",
    borderRadius: "6px",
    padding: "7px",
    color: "white",
    position: "absolute",
    right: 0,
    zIndex: 2,
    cursor: "pointer",
  }),
  textbox: {
    background: colors.inputBg,
    color: colors.text,
    border: `1px solid ${colors.buttonBorder}`,
    outline: "none",
    borderRadius: "6px",
  },
  instructions: {
    fontSize: "15px",
    marginTop: "8px",
  },
  popup: {
    position: "absolute",
    flexDirection: "column",
    background: colors.popupBg,
    color: colors.text,
    borderRadius: "8px",
    padding: "8px 10px",
    boxShadow: colors.popupShadow,
    zIndex: 10,
  }
}

const duration = String.raw`(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)`
const durationRE = new RegExp(`${duration}`)
const vId = String.raw`\d{9,10}`
const videoIdRE = new RegExp(`^(${vId})$|.*twitch\\.tv\\/videos\\/(${vId})(?:.*)?$`)
const videoWithTimestampRE = new RegExp(`(${vId})(?:\\?t=(${duration}))?`)
const validUsernameRE = new RegExp(`^[\\w\\d_]{1,50}$`)

// Kick URL patterns
const kickVideoUrlRE = /kick\.com\/([a-zA-Z0-9_-]+)\/videos?\/([a-zA-Z0-9_-]+)(?:\?t=(.+))?/i


// Ratio is width:height.
function findBoxSize(windowSize, boxes, ratio, showBar) {
  const adjustedWindowSize = {
    width: windowSize.width,
    height: windowSize.height - style.bar(showBar).minHeight,
  }
  let bestBox = {width: minHeight*ratio, height: minHeight}
  // let bestBox = {width: 0, height: 0}
  for (let rows = 1; rows <= boxes; rows++) {
    let cols = Math.ceil(boxes/rows)
    if (adjustedWindowSize.height*ratio/rows > adjustedWindowSize.width/cols) {
      // Width bottlenecked
      let w = adjustedWindowSize.width/cols
      if (w > bestBox.width) {
        bestBox = {width: w, height: w/ratio}
      }
    } else {
      // Height bottlenecked
      let h = adjustedWindowSize.height/rows
      if (h > bestBox.height) {
        bestBox = {width: h*ratio, height: h}
      }
    }
  }
  return bestBox
}

function anyPlaying(vods) {
  for (let v of vods) {
    if (v.playing) {
      return true
    }
  }
  return false
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "LIVE"
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

// Adapted from https://usehooks.com/useWindowSize/
function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = React.useState({
    width: undefined,
    height: undefined,
  });

  React.useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
}

// Copied from https://usehooks.com/useOnClickOutside/
function useOnClickOutside(ref, handler) {
  React.useEffect(
    () => {
      const listener = event => {
        // Do nothing if clicking ref's element or descendent elements
        if (!ref.current || ref.current.contains(event.target)) {
          return;
        }

        handler(event);
      };

      document.addEventListener('mousedown', listener);
      document.addEventListener('touchstart', listener);

      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('touchstart', listener);
      };
    },
    // Add ref and handler to effect dependencies
    // It's worth noting that because passed in handler is a new ...
    // ... function on every render that will cause this effect ...
    // ... callback/cleanup to run every render. It's not a big deal ...
    // ... but to optimize you can wrap handler in useCallback before ...
    // ... passing it into this hook.
    [ref, handler]
  );
}

function getMilliseconds(durationString) {
  let match = durationString.match(durationRE)
  const msFromSecs = match[3] === undefined ? 0 : parseInt(match[3]) * 1000
  const msFromMins = match[2] === undefined ? 0 : parseInt(match[2]) * 60 * 1000
  const msFromHours = match[1] === undefined ? 0 : parseInt(match[1]) * 60 * 60 * 1000
  return msFromSecs + msFromMins + msFromHours
}

function toTwitchTime(seconds) {
  let secondsLeft = seconds
  const hours = Math.floor(secondsLeft/(60*60))
  secondsLeft = secondsLeft - hours*60*60
  const minutes = Math.floor(secondsLeft/60)
  secondsLeft = Math.round(secondsLeft - minutes*60)
  return `${hours}h${minutes}m${secondsLeft}s`
}

const urlPath = window.location.hash.substr(2)
// Track the initial timestamped VOD and its initial timestamp so we don't remove it from the URL
// when updating it.
let initialTimestampedVOD = {
  id: "",
  timestamp: "",
}

function App() {

  const [vodState, setVodState] = React.useState({
    active: -1,
    vods: [],
  })

  // These are used when we need to asynchronously remove buttons, which accidentally delete vods
  // sometimes due to not knowing new vods were added.
  const vodsRef = React.useRef(vodState.vods)
  vodsRef.current = vodState.vods
  const activeVod = React.useRef(vodState.active)
  activeVod.current = vodState.active

  const [newVodText, setNewVodText] = React.useState("")

  const [smartMute, setSmartMute] = React.useState(true)
  const [smartPlay, setSmartPlay] = React.useState(true)
  const [showBar, setShowBar] = React.useState(true)
  const [shareState, setShareState] = React.useState({
    show: false,
    useTimestamp: true,
    url: "",
    timestamp: "",
  })
  const [chooseVodState, setChooseVodState] = React.useState({
    show: false,
    vods: [],
  })
  const [error, setError] = React.useState("")
  const [initialSync, setInitialSync] = React.useState(null)
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.5)
  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  const [mainRealTime, setMainRealTime] = React.useState("")
  const [editingSyncTime, setEditingSyncTime] = React.useState(false)
  const [syncDateInput, setSyncDateInput] = React.useState("")
  const [syncTimeInput, setSyncTimeInput] = React.useState("")
  const [syncFocusField, setSyncFocusField] = React.useState("date")
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (vodState.vods.length === 0) {
        setMainRealTime("");
        return;
      }
      let idx = activeVod.current === -1 ? 0 : activeVod.current;
      const v = vodState.vods[idx];
      if (v && v.ref && v.ref.current && v.start) {
        const sec = v.ref.current.getCurrentTime();
        if (sec > 0) {
          const t = new Date(v.start.getTime() + sec * 1000);
          setMainRealTime(t.toLocaleString());
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [vodState.vods, vodState.active])

  // Save playback progress to localStorage every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      const progress = {};
      for (const v of vodState.vods) {
        if (v.ref?.current) {
          const sec = v.ref.current.getCurrentTime();
          if (sec > 0) {
            const key = `${v.platform}:${v.id}`;
            progress[key] = sec;
          }
        }
      }
      try { localStorage.setItem("multivod-progress", JSON.stringify(progress)); } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [vodState.vods]);

  const shareWindow = React.useRef()
  useOnClickOutside(shareWindow, () => setShareState({...shareState, show: false}))
  const shareText = React.useRef()
  const chooseVodWindow = React.useRef()
  useOnClickOutside(chooseVodWindow, () => setChooseVodState({show: false, vods: []}))

  const windowSize = useWindowSize()
  const boxSize = findBoxSize(windowSize, vodState.vods.length, 16/9, showBar)

  const getVod = (vodId) => {
    return fetch(`https://gql.twitch.tv/gql`, {
      method: `POST`, // eslint-disable-next-line
      body: JSON.stringify({query: gqlVideoQuery, variables: {videoID: vodId}}),
      headers: {
        "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
      }
    })
    .then(resp => resp.json())
    .then(data => {
      if (data.data.video) {
        // Find starting and ending times for this video.
        const vodData = data.data.video
        return formatNewVod(vodData)
      } else {
        throw new Error(`Video ${vodId} unavailable`)
      }
    })
  }

  const formatNewVod = (vodData, platform = "twitch", channelSlug = null, publicId = null) => {
    if (platform === "kick") {
      // Kick VOD data (from REST API)
      // Kick timestamps may have no timezone or already include one
      const rawStart = vodData.start_time || vodData.created_at || new Date(0)
      let startStr = typeof rawStart === 'string' ? rawStart : new Date(0)
      // Ensure timezone info — if no offset/Z, assume UTC
      if (typeof startStr === 'string' && !startStr.endsWith('Z') && !startStr.match(/[+-]\d{2}:\d{2}$/)) {
        startStr = `${startStr}Z`
      }
      const start = new Date(startStr)
      let end
      // Try end_time first
      if (vodData.end_time) {
        let endStr = typeof vodData.end_time === 'string' ? vodData.end_time : ''
        if (!endStr.endsWith('Z') && !endStr.match(/[+-]\d{2}:\d{2}$/)) endStr = `${endStr}Z`
        end = new Date(endStr)
      } else if (vodData.duration || vodData.livestream?.duration) {
        // Fallback: compute from duration
        let durationMs = vodData.duration || vodData.livestream?.duration
        if (durationMs > 3600000) {
          // Already milliseconds
        } else {
          durationMs = durationMs * 1000
        }
        end = new Date(start.getTime() + durationMs)
      } else {
        // Ongoing stream: use current time as end (no need for 24h padding)
        end = new Date()
      }
      const duration = Math.round((end.getTime() - start.getTime()) / 1000)
      const thumbnailUrl = vodData.thumbnail ? (vodData.thumbnail.src || vodData.thumbnail) : ""
      const sessionTitle = vodData.session_title || vodData.livestream?.session_title || vodData.title || ""
      const username = channelSlug || vodData.livestream?.channel?.slug || vodData.channel?.slug || vodData.channel_slug || "Unknown"
      const channelName = vodData.livestream?.channel?.name || vodData.channel?.username || username
      const hlsUrl = vodData.source || vodData.recording_url || extractKickHlsUrl(thumbnailUrl, vodData.start_time)
      if (!hlsUrl) {
        console.warn('Kick HLS extraction failed', {thumbnailUrl, startTime: start, vodData: JSON.stringify(vodData).substring(0, 500)})
      }

      return {
        id: vodData.id || vodData.video?.uuid || vodData.uuid || publicId || null,
        // videoUuid: internal video.uuid (api/v1/video/ + deep link)
        // publicVodId: livestream.vod_id (kick.com/<channel>/videos/<id> links)
        videoUuid: vodData.video?.uuid || vodData.uuid || null,
        publicVodId: vodData.livestream?.vod_id || publicId || null,
        channelSlug: channelSlug || vodData.livestream?.channel?.slug || vodData.channel?.slug || null,
        start: start,
        end: end,
        duration: duration,
        ref: React.createRef(),
        playing: false,
        volume: defaultVolume,
        muted: true,
        showButtons: false,
        buttonTimeoutRef: React.createRef(),
        vodData: vodData,
        username: username,
        channelName: channelName,
        platform: "kick",
        sessionTitle: sessionTitle,
        hlsUrl: hlsUrl,
      }
    } else {
      // Twitch VOD data (from GraphQL)
      const start = new Date(vodData.recordedAt)
      const end = new Date(start.getTime() + getMilliseconds(vodData.duration))
      return {
        id: vodData.id,
        start: start,
        end: end,
        duration: vodData.duration,
        ref: React.createRef(),
        playing: false,
        volume: defaultVolume,
        muted: true,
        showButtons: false,
        buttonTimeoutRef: React.createRef(),
        vodData: vodData,
        username: vodData.creator.displayName,
        channelName: vodData.creator.displayName,
        platform: "twitch",
      }
    }
  }

  // Extract Kick HLS master playlist URL from thumbnail URL and start time
  const extractKickHlsUrl = (thumbnailUrl, startTime) => {
    const match = thumbnailUrl.match(/video_thumbnails\/([^/]+)\/([^/]+)\//)
    if (!match) return null
    const sessionId = match[1]
    const segmentId = match[2]
    // Parse Kick timestamp string directly — no Date object needed to avoid timezone shifts
    const [datePart, timePart] = startTime.split(' ')
    const [yyyy, M, dd] = datePart.split('-').map(Number)
    const [HH, mm] = timePart.split(':').map(Number)
    return `https://stream.kick.com/3c81249a5ce0/ivs/v1/196233775518/${sessionId}/${yyyy}/${M}/${dd}/${HH}/${mm}/${segmentId}/media/hls/master.m3u8`
  }

  const getVodsForUser = (username, start, end, cursor="", vods=[]) => {
    return fetch(`https://gql.twitch.tv/gql`, {
      method: `POST`, // eslint-disable-next-line
      body: JSON.stringify({query: gqlVideosQuery, variables: {login: username, cursor: cursor}}),
      headers: {
        "Client-Id": "kd1unb4b3q4t58fwlpcbzcbnm76a8fp",
      }
    })
    .then(resp => resp.json())
    .then(data => {
      if (data.data.user) {
        let objs = data.data.user.videos.edges
        if (objs.length === 0) {
          throw new Error(`user "${username}" has no VODs`)
        }
        for (let obj of objs) {
          let v = obj.node
          vods.push(formatNewVod(v))
          // This is when no VODs existed (thus no bounds). Return last 5 VODs.
          if (vods.length >= 10) {
            return vods
          }
        }
        return getVodsForUser(username, start, end, objs[objs.length-1].cursor, vods)
      } else {
        throw new Error(`user "${username}" does not exist`)
      }
    })
  }

  // web.kick.com omits Access-Control-Allow-Origin for origins it doesn't
  // whitelist (the direct call works from localhost, but the deployed site
  // is blocked). The browser reports that as a TypeError, so retry through
  // the Cloudflare relay, which mirrors the response with CORS headers.
  // Empty = no relay configured.
  const KICK_API_RELAY = "https://mirror4.pages.dev/api/proxy"
  const fetchKickJson = (url) =>
    fetch(url, { headers: {"Accept": "application/json"} }).catch(err => {
      if (!(err instanceof TypeError) || !KICK_API_RELAY) throw err
      return fetch(`${KICK_API_RELAY}?url=${encodeURIComponent(url)}`, {
        headers: {"Accept": "application/json"}
      })
    })

  const getKickVod = (vodId, channelSlug) => {
    if (channelSlug) {
      // Channel-scoped endpoint (web.kick.com) — accepts the public VOD id
      // from kick.com/<channel>/videos/<id> URLs. The channel response
      // provides the numeric channel id that endpoint requires.
      return fetchKickJson(`https://kick.com/api/v1/channels/${channelSlug}`)
      .then(resp => {
        if (!resp.ok) throw new Error(`Kick channel "${channelSlug}" returned HTTP ${resp.status}`)
        return resp.json()
      })
      .then(channel => {
        if (!channel.id) throw new Error(`Kick channel "${channelSlug}" not found`)
        return fetchKickJson(`https://web.kick.com/api/v1/channels/${channel.id}/videos/${vodId}`)
      })
      .then(resp => {
        if (!resp.ok) throw new Error(`Kick video "${vodId}" returned HTTP ${resp.status} in channel "${channelSlug}"`)
        return resp.json()
      })
      .then(body => {
        if (!body.data) throw new Error(`Kick video "${vodId}" not found in channel "${channelSlug}"`)
        const vod = formatNewVod(body.data, "kick", channelSlug, vodId)
        // Keep id consistent with the deep link and URL sync matching
        vod.id = vodId
        return vod
      })
    }
    // Legacy: internal video.uuid via the single-video endpoint
    return fetchKickJson(`https://kick.com/api/v1/video/${vodId}`)
    .then(resp => {
      if (!resp.ok) {
        if (/^\d+$/.test(vodId)) {
          throw new Error(`Kick video ID "${vodId}" is numeric and can't be resolved. Paste the full Kick video URL instead.`)
        }
        throw new Error(`Kick video ${vodId} returned HTTP ${resp.status}`)
      }
      return resp.json()
    })
    .then(data => {
      if (data.id) {
        return formatNewVod(data, "kick", channelSlug)
      } else {
        console.warn('Kick API returned no id for', vodId, data)
        throw new Error(`Kick video ${vodId} unavailable`)
      }
    })
  }

  const getKickVodsForChannel = (channelSlug, start, end) => {
    return fetch(`https://kick.com/api/v1/channels/${channelSlug}`, {
      headers: {"Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
      mode: "cors"
    })
    .then(resp => resp.json())
    .then(data => {
      if (!data.previous_livestreams || data.previous_livestreams.length === 0) {
        throw new Error(`channel "${channelSlug}" has no VODs`)
      }
         // Filter livestreams by time window, then fetch full video data for HLS source
      let matching = []
      let seenUuids = new Set()
      for (let ls of data.previous_livestreams) {
        // Kick previous_livestreams have video.uuid, video.start_time, video.duration
        let rawStart = ls.start_time || ls.video?.start_time || ls.livestream?.start_time || ls.created_at
        if (!rawStart) continue
        // Ensure timezone info
        let startStr = typeof rawStart === 'string' ? rawStart : ''
        if (!startStr.endsWith('Z') && !startStr.match(/[+-]\d{2}:\d{2}$/)) startStr = `${startStr}Z`
        let vodStart = new Date(startStr)
        // If start_time parsed to epoch 0 (invalid), skip
        if (isNaN(vodStart.getTime()) || vodStart.getTime() === 0) continue
        let uuid = ls.video?.uuid || ls.id
        if (uuid && seenUuids.has(uuid)) continue
        seenUuids.add(uuid)
        matching.push(ls)
        if (matching.length >= 10) break
      }
      // Use channel data directly — only fetch video source when VOD is actually selected
      let vods = matching.map(ls => formatNewVod(ls, "kick", channelSlug))
      return vods
    })
  }

  const syncVods = (time, mustSyncAll) => {
    let syncVods = []
    for (let v of vodState.vods) {
      if (v.end < time || v.start > time) {
        let clamped = Math.max(v.start, Math.min(time, v.end))
        let offset = (clamped - v.start) / 1000
        v.ref.current.seekTo(offset, "seconds")
      } else {
        syncVods.push(v)
      }
    }
    for (let v of syncVods) {
      let offset = (time - v.start)/1000
      v.ref.current.seekTo(offset, "seconds")
    }
    setVodState({
      active: vodState.active,
      vods: [...vodState.vods],
    })
  }

  const getTimestamp = (timestampIndex) => {
    if (timestampIndex === -1) {
      return toTwitchTime(vodState.vods[0].ref.current.getCurrentTime())
    } else {
      return toTwitchTime(vodState.vods[timestampIndex].ref.current.getCurrentTime())
    }
  }

  const getLink = (useTimestamp) => {
    // pathname matters for GitHub Pages project sites (served under /repo),
    // which window.location.origin omits
    const base = window.location.origin+window.location.pathname+"#"
    let timestampIndex = vodState.active === -1 ? 0 : vodState.active
    timestampIndex = useTimestamp ? timestampIndex : -1
    let timestamp = getTimestamp(timestampIndex)
    let vods = getLinkRoute(timestampIndex, timestamp)
    return `${base}${vods}`
  }

  // This returns everything after the "#" in a link. For no timestamp, pass -1 for timestampIndex.
const getLinkRoute = (timestampIndex, timestamp) => {
    let vods = ""
    for (let i = 0; i < vodState.vods.length; i++) {
      const vod = vodState.vods[i]
      const prefix = vod.platform === "kick" ? "k" : "t"
      // Kick: prefer the channel-scoped link k/<channel>:<public_id> so all
      // generated links use one format and resolve via the channel endpoint.
      // VODs whose public id never loaded fall back to the internal uuid for
      // the legacy single-video endpoint.
      const routeId = vod.platform === "kick"
        ? ((vod.channelSlug && vod.publicVodId) ? `${vod.channelSlug}:${vod.publicVodId}` : (vod.videoUuid || vod.id))
        : vod.id
      vods = i === timestampIndex ? `${vods}/${prefix}/${routeId}?t=${timestamp}` : `${vods}/${prefix}/${routeId}`
    }
    return vods
  }

  const addVodtoList = (vod) => {
    // For Kick VODs, fetch video API to get correct HLS source URL (CDN path uses internal session time)
    if (vod.platform === "kick" && vod.videoUuid && !vod._sourceFetched) {
      fetch(`https://kick.com/api/v1/video/${vod.videoUuid}`, {
        headers: {"Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
      })
      .then(resp => resp.json())
      .then(data => {
        if (data.source) {
          vod.hlsUrl = data.source;
          vod.vodData = {...vod.vodData, source: data.source};
        }
        if (data.livestream?.vod_id) {
          vod.publicVodId = data.livestream.vod_id;
        }
        vod._sourceFetched = true;
        addVodtoList(vod);
      })
      .catch(() => addVodtoList(vod))
      return;
    }
    // Kick VODs carry different ids per add path (public id for pasted URLs,
    // livestream/uuid for channel search), so match on any identity we have.
    const isSameVod = (existingVod) =>
      (vod.id && existingVod.id === vod.id) ||
      (vod.platform === "kick" && vod.videoUuid &&
       (existingVod.videoUuid === vod.videoUuid || existingVod.id === vod.videoUuid)) ||
      (vod.platform === "kick" && vod.publicVodId &&
       (existingVod.publicVodId === vod.publicVodId || existingVod.id === vod.publicVodId))
    if (vodsRef.current.find(isSameVod)) {
      setError(vod.id + " already added!");
    }
    else{
      const isFirstVod = (vodState.vods.length === 0)
      vod.muted = !isFirstVod
      setVodState({
        //active: isFirstVod ? 0 : vodState.active,
        vods: vodState.vods.concat(vod)
      })
    }
  }

  const handleVodResults = (vods) => {
    if (vods.length > 1) {
      setChooseVodState({show: true, vods: vods})
    } else if (vods.length === 1) {
      addVodtoList(vods[0]);
    } else {
      setError(`No vods from ${newVodText} occur during these videos.`)
    }
  }

  const addVodHandler = () => {
    const vodMatch = newVodText.match(videoIdRE)
    const kickUrlMatch = newVodText.match(kickVideoUrlRE)
    const usernameMatch = validUsernameRE.test(newVodText)

    if (vodMatch !== null) {
      // Twitch video ID or URL
      const vodId = vodMatch[2] === undefined ? vodMatch[1] : vodMatch[2]
      getVod(vodId)
      .then((vod) => {
        addVodtoList(vod);
      })
      .catch(error => {
        setError(`Could not add video: ${error.message}`)
      })

    } else if (kickUrlMatch !== null) {
      // Kick video URL: kick.com/channel/videos/<livestream.vod_id> —
      // resolve via the channel-scoped endpoint (2 calls, any VOD)
      const channelSlug = kickUrlMatch[1]
      const videoSlug = kickUrlMatch[2]
      getKickVod(videoSlug, channelSlug)
      .then((vod) => {
        addVodtoList(vod);
      })
      .catch(error => {
        setError(`Could not add Kick video: ${error.message}`)
      })

    } else if (usernameMatch) {
      // It's a valid username — try both Twitch and Kick in parallel
      let currentTime = new Date()
      let bestTime = new Date(0)
      for (let v of vodState.vods) {
        const player = v.ref?.current
        if (player) {
          const currentSec = player.getCurrentTime()
          const t = new Date(v.start.getTime() + currentSec * 1000)
          if (t > bestTime) {
            bestTime = t
            currentTime = t
          }
        }
      }
      let searchWindow = 7200000 // 2 hours on either side
      let latestStart = new Date(currentTime.getTime() - searchWindow)
      let earliestEnd = new Date(currentTime.getTime() + searchWindow)

      Promise.allSettled([
        getKickVodsForChannel(newVodText, latestStart, earliestEnd),
        getVodsForUser(newVodText, latestStart, earliestEnd)
      ])
      .then(results => {
        const kickResult = results[0]
        const twitchResult = results[1]
        const kickVods = kickResult.status === 'fulfilled' ? kickResult.value : []
        const twitchVods = twitchResult.status === 'fulfilled' ? twitchResult.value : []

        // Only show VODs within the search window, max 1 per platform
        const hasVods = vodState.vods.length > 0
        if (hasVods) {
          const kickMatch = kickVods.filter(v => v.start <= earliestEnd && v.end >= latestStart)
          kickVods.length = 0; kickVods.push(...kickMatch.slice(0, 1))
          const twitchMatch = twitchVods.filter(v => v.start <= earliestEnd && v.end >= latestStart)
          twitchVods.length = 0; twitchVods.push(...twitchMatch.slice(0, 1))
        }

        // If only one platform has results, use it directly
        if (kickVods.length > 0 && twitchVods.length === 0) {
          handleVodResults(kickVods)
        } else if (twitchVods.length > 0 && kickVods.length === 0) {
          handleVodResults(twitchVods)
        } else if (twitchVods.length > 0 && kickVods.length > 0) {
          // Both have results — prefix with platform for disambiguation
          const combined = [
            ...kickVods.map(v => ({...v, label: `Kick: ${v.username}` })),
            ...twitchVods.map(v => ({...v, label: `Twitch: ${v.username}` }))
          ].slice(0, 10)
          setChooseVodState({show: true, vods: combined})
        } else {
          // Neither has results
          const kickErr = kickResult.status === 'rejected' ? kickResult.reason.message : ''
          const twitchErr = twitchResult.status === 'rejected' ? twitchResult.reason.message : ''
          setError(`Can't get video: ${kickErr}${kickErr && twitchErr ? ' / ' : ''}${twitchErr}`)
        }
      })
      .catch(error => {
        setError(`Can't get video: ${error.message}`)
      })

    } else {
      setError(`Could not parse video ID, URL, or username from "${newVodText}"`)
    }
    setNewVodText("")
  }

  // In charge of making sure vods maintain a single mute.
  React.useEffect(() => {
    // Set interval to watch for change in mutes.
    const interval = setInterval(() => {
      try {
        if (smartMute) {
          let newActive = -1
          for (let i = 0; i < vodState.vods.length; i++) {
            let player = vodState.vods[i].ref.current.getInternalPlayer()
            if (player !== undefined) {
              let muted = vodState.vods[i].platform === "kick" ? player.muted : player.getMuted()
              if (!muted) {
                // If this is a new active vod, remember it.
                if (i !== vodState.active) {
                  newActive = i
                }
              }
            }
          }
          if (newActive !== -1) {
            vodState.vods[newActive].muted = false
            if (vodState.active !== -1 && vodState.vods[vodState.active]) {
              vodState.vods[vodState.active].muted = true
            }
            setVodState({
              active: newActive,
              vods: vodState.vods,
            })
          }
        }
      } catch (error) {
        setVodState({
          active: -1,
          vods: vodsRef.current,
        })
        console.log(error)
      }
    }, 50)
    return () => clearTimeout(interval)
  })

  React.useEffect(() => {
    if (urlPath) {
      // Parse videos out of the urlPath and check that they are valid ID strings. Also, if there
      // is a timestamp, store it.
      const segments = urlPath.split("/")
      let syncVod = null
      const vodPromises = []
      let i = 0
      while (i < segments.length) {
        let segment = segments[i]
        // Most likely this is just a trailing slash.
        if (segment === "") {
          i++
          continue
        }
        // Check for platform prefix
        let platform = "twitch"
        if (segment === "t" || segment === "k") {
          platform = segment === "t" ? "twitch" : "kick"
          i++
          if (i >= segments.length) break
          segment = segments[i]
        }
        // Kick channel-scoped links (k/<channel>:<vod_id>): channel slug followed by the
        // public VOD id. Slugs never contain ":", so the split is unambiguous. Legacy
        // k/<uuid> links still resolve via the single-video endpoint.
        let kickChannel = null
        if (platform === "kick") {
          const sepIndex = segment.indexOf(":")
          if (sepIndex !== -1) {
            const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const vodSegment = segment.slice(sepIndex + 1).split("?")[0]
            if (uuidRE.test(vodSegment)) {
              kickChannel = segment.slice(0, sepIndex)
              segment = segment.slice(sepIndex + 1)
            }
          }
        }
        // Parse video ID with optional timestamp
        let match = segment.match(videoWithTimestampRE)
        // If no match with numeric ID, treat as Kick UUID
        if (match === null && platform === "kick") {
          const kickTimestampRE = new RegExp(`^(.+?)(?:\\?t=(${String.raw`(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)`}))?$`)
          match = segment.match(kickTimestampRE)
        }
        // Make sure this is a valid ID.
        if (match === null) {
          setError(`Incorrect ID in url: ${segment}`)
          return
        }
        let vodId = match[1] || segment.split("?")[0]
        // If it has a timestamp, throw an error if it's an inaccurate timestamp or if we already
        // had a timestamp.
        if (segment.includes("?t=")) {
          const timestampMatch = segment.match(/\?t=(.+)/)
          if (timestampMatch === null) {
            setError(`Invalid timestamp here: ${segment}`)
            return
          } else if (syncVod !== null) {
            setError(`URL has multiple timestamps: ${segment}`)
            return
          } else {
            initialTimestampedVOD = {id: vodId, timestamp: timestampMatch[1]}
            syncVod = {milliseconds: getMilliseconds(timestampMatch[1]), id: vodId}
          }
        }
        if (platform === "twitch") {
          vodPromises.push(getVod(vodId))
        } else {
          // Kick: fetch by ID (channel-scoped when the link carries a channel)
          vodPromises.push(getKickVod(vodId, kickChannel))
        }
        i++
      }
      // Wait for all vods to finish loading, then set their state.
      Promise.all(vodPromises)
      .then((vods) => {
        // If we don't need to sync to a time, then just set state.
        if (!syncVod) {
          setVodState({
            active: -1,
            vods: vods
          })
        } else {
          // Set vods to playing before running a seek. Also, get the vod that we'll sync to.
          let timeToSync = new Date(0)
          for (let vod of vods) {
            vod.playing = true
            if (vod.id === syncVod.id) {
              timeToSync = new Date(vod.start.getTime() + syncVod.milliseconds)
            }
          }
          setInitialSync(timeToSync)
          setVodState({
            active: 0,
            vods: vods
          })
        }
      })
      .catch(error => {
        setError(`Error loading link: ${error.message}`)
      })
    } // eslint-disable-next-line
  }, [])

  React.useEffect(() => {
    if (initialSync) {
      // Make sure refs exist for each vod.
      for (let vod of vodState.vods) {
        if (vod.ref.current === null) {
          return
        }
      }
      syncVods(initialSync, false)
      setInitialSync(null)
    } // eslint-disable-next-line
  }, [vodState])

  // Restore saved progress (only when no URL timestamp was provided)
  const progressRestored = React.useRef(false)
  React.useEffect(() => {
    if (progressRestored.current) return;
    if (initialTimestampedVOD.id) return; // URL has timestamp, skip restore
    if (vodState.vods.length === 0) return;
    // Wait for all refs to be ready
    for (const v of vodState.vods) {
      if (!v.ref.current) return;
    }
    progressRestored.current = true;
    let anySeek = false;
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem("multivod-progress") || "{}"); } catch {}
    for (let i = 0; i < vodState.vods.length; i++) {
      const v = vodState.vods[i];
      const key = `${v.platform}:${v.id}`;
      const saved = progress[key];
      if (saved && v.ref.current) {
        const dur = v.end ? (v.end - v.start) / 1000 : saved;
        const seek = Math.min(saved, dur);
        v.ref.current.seekTo(seek, 'seconds');
        anySeek = true;
      }
      if (i === 0) {
        v.muted = false;
      } else {
        v.muted = true;
      }
    }
    if (anySeek) {
      setVodState({ active: vodState.active, vods: [...vodState.vods] });
    }
   }, [vodState.vods, vodState.active]);

  // In charge of updating the URL with vods added.
  const firstRender = React.useRef(true)
  React.useEffect(() => {
    // Skip first render.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // If this isn't the first render act normally.
    if (vodState.vods.length > 0) {
      // Get index of initial timestamped VOD if it's there.
      let initialIndex = -1
      for (let i = 0; i < vodState.vods.length; i++) {
        const vod = vodState.vods[i]
        if (vod.id === initialTimestampedVOD.id) {
          initialIndex = i
        }
      }
      // If initialIndex is -1, this won't return a timestamp.
      let route = getLinkRoute(initialIndex, initialTimestampedVOD.timestamp)
      try { window.location.hash = route } catch {}
    } else {
      try { window.location.hash = "" } catch {}
    } // eslint-disable-next-line
  }, [vodState])

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        flexDirection: "column",
        background: colors.pageBg,
      }}
    >
      {/* Header */}
      <div style={{
        ...style.bar(showBar),
        padding: "0px 5px",
        justifyContent: isMobile ? "flex-start" : style.bar(showBar).justifyContent,
      }}>
        {/* Left of input */}
        {!isMobile &&
        <div style={{display: "flex", flexGrow: 1, flexBasis: 0, alignItems: "center"}}>
          {/* Error message */}
          <div style={{
            display: error === "" ? "none" : "flex",
            alignItems: "center",
            marginLeft: "10px",
            marginRight: "10px",
            padding: "4px",
            fontSize: "13px",
            color: "#f2c9cf",
            background: "#3a2026",
            boxShadow: "0 0 0 1px #b50000",
            borderRadius: "6px",
            maxHeight: `${style.bar(true).minHeight-8}px`,
            overflow: "auto",
            boxSizing: "border-box",
          }}>
            <div>{error}</div>
            <div className="closeError"
              style={{
                padding: "3px",
                marginLeft: "7px",
                borderRadius: "2px",
                cursor: "pointer",
                fontSize: "18px",
              }}
              onClick={() => {setError("")}}>✕</div>
          </div>
        </div>
        }
        {/* Inputs */}
        <div style={{
          ...style.buttonContainer,
          flexGrow: 1,
          justifyContent: "center",
          maxWidth: isMobile ? "350px" : "450px",
        }}>
          <input
            type="text"
            value={newVodText}
            onChange={e => setNewVodText(e.target.value.replace(/ /g, ""))}
            placeholder="channel name or twitch/kick video url"
            id="twitchsource"
            style={{
              ...style.textbox,
              paddingLeft: "5px",
              height: style.button(false).height,
              width: "100%",
              fontSize: isMobile? "16px" : "auto",
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                addVodHandler()
              }
            }}
          />
          {/* Add video button */}
          <div ref={chooseVodWindow} style={{display: "flex", flexDirection: "column", alignItems: "center", position: "relative"}}>
            <div
              style={{
                ...style.button(false),
                marginLeft: "5px",
              }}
              onClick={() => addVodHandler()}
            >
              Add Video
            </div>
            <div
              style={{
                display: chooseVodState.show ? "flex" : "none",
                top: style.bar(true).minHeight+1,
                ...style.popup,
              }}
            >
              {/* Header of add video element */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}>
                <div style={{fontSize: "14px"}}>Choose video</div>
                <div className="shareButton"
                  style={{
                    padding: "2px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "20px",
                  }}
                  onClick={() => {setChooseVodState({show: false, vods: []})}}>✕</div>
              </div>
              {/* Render each VOD as an addable VOD */}
              {chooseVodState.vods.map((vod, index) => {
                return (
                  <div
                    style={{
                      display: "flex",
                      paddingBottom: "5px",
                      fontSize: "14px",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    key={`${vod.platform}-${vod.id}-${index}`}
                  >
                    <div>
                      <span style={{color: vod.platform === "kick" ? kickGreen : twitchPurple}}>[{vod.platform === "kick" ? "K" : "T"}]</span>{' '}
                      <a href={`https://twitch.tv/videos/${vod.id}`} style={style.link}>{vod.id}</a> ({vod.start.toLocaleString()}, {formatDuration(vod.duration)})
                    </div>
                    <div
                      style={{
                        ...style.button(false),
                        height: "20px",
                        margin: "1px 7px 1px 15px",

                      }}
                      onClick={() => {
                        addVodtoList(vod);
                        // const isFirstVod = (vodState.vods.length === 0)
                        // vod.muted = !isFirstVod
                        // setVodState({
                        //   active: isFirstVod ? 0 : vodState.active,
                        //   vods: vodState.vods.concat(vod)
                        // })
                        setChooseVodState({show: false, vods: []})
                      }}
                    >
                      Add
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Share button */}
          <div ref={shareWindow} style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
            <div style={{...style.button(false), marginLeft: "5px", position: "relative"}}
              onClick={() => {
                if (vodState.vods.length === 0) {
                  setError("You can't share before adding videos!")
                  return
                }
                let timestampIndex = vodState.active === -1 ? 0 : vodState.active
                setShareState({...shareState, url: getLink(shareState.useTimestamp), show: !shareState.show, timestamp: getTimestamp(timestampIndex)})
              }}
            >
              Share
            </div>
            {/* Share window */}
            <div
              style={{
                display: shareState.show ? "flex" : "none",
                top: style.bar(true).minHeight+1,
                ...style.popup,
              }}
            >
              <div style={{display: "flex", justifyContent: "space-between"}}>
                <div style={{fontSize: "14px"}}>Share</div>
                <div className="shareButton"
                  style={{
                    padding: "2px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "20px",
                  }}
                  onClick={() => {setShareState({...shareState, show: false})}}>✕</div>
              </div>
              <div style={{display: "flex", alignSelf: "center", alignItems: "center", margin: "10px 0px"}}>
                <input
                  ref={shareText}
                  type="text"
                  size={shareState.url.length || 1}
                  style={{
                    ...style.textbox,
                    padding: "5px 2px",
                    textAlign: "center",
                  }}
                  value={shareState.url}
                  readOnly={true}
                />
                {/* </div> */}
                <div className="shareButton"
                  style={{
                    marginLeft: "6px",
                    marginRight: "-2px",
                    padding: "6px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "20px",
                    lineHeight: "1",
                  }}
                  onClick={() => {
                    shareText.current.select()
                    document.execCommand('copy')
                  }}>⧉</div>
              </div>
              <div style={{display: "flex", alignSelf: "center"}}>
                <input
                  type="checkbox"
                  checked={shareState.useTimestamp}
                  onChange={(e) => {
                    let timestampIndex = vodState.active === -1 ? 0 : vodState.active
                    setShareState({
                      ...shareState,
                      useTimestamp: e.target.checked,
                      url: getLink(e.target.checked),
                      timestamp: getTimestamp(timestampIndex),
                    })
                  }}
                />
                <div
                  style={{
                    fontSize: "14px"
                  }}
                >
                  Start at {shareState.timestamp}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Right of input */}
        {/* Center controls */}
        <div style={style.buttonContainer}>
          <MediaButton title="Back 60 seconds"
            onClick={() => {
              setSmartPlay(true)
              for (let v of vodState.vods) {
                v.playing = true
              }
              setVodState({
                active: vodState.active,
                vods: vodState.vods,
              })
              for (let v of vodState.vods) {
                let currentTime = v.ref.current.getCurrentTime()
                v.ref.current.seekTo(currentTime - 60)
              }
            }}
          ><Back60Icon /></MediaButton>
          <MediaButton title="Back 10 seconds"
            onClick={() => {
              setSmartPlay(true)
              for (let v of vodState.vods) {
                v.playing = true
              }
              setVodState({
                active: vodState.active,
                vods: vodState.vods,
              })
              for (let v of vodState.vods) {
                let currentTime = v.ref.current.getCurrentTime()
                v.ref.current.seekTo(currentTime - 10)
              }
            }}
          ><Back10Icon /></MediaButton>
          <MediaButton title={anyPlaying(vodState.vods) ? "Pause all" : "Play all"}
            onClick={() => {
              setSmartPlay(true)
              let anyVodsPlaying = anyPlaying(vodState.vods)
              for (let v of vodState.vods) {
                v.playing = !anyVodsPlaying
              }
              setVodState({
                active: vodState.active === -1 ? 0 : vodState.active,
                vods: vodState.vods,
              })
            }}
          >{anyPlaying(vodState.vods) ? <PauseIcon /> : <PlayIcon />}</MediaButton>
          <MediaButton title="Forward 10 seconds"
            onClick={() => {
              setSmartPlay(true)
              for (let v of vodState.vods) {
                v.playing = true
              }
              setVodState({
                active: vodState.active,
                vods: vodState.vods,
              })
              for (let v of vodState.vods) {
                let currentTime = v.ref.current.getCurrentTime()
                v.ref.current.seekTo(currentTime + 10)
              }
            }}
          ><Fwd10Icon /></MediaButton>
          <MediaButton title="Forward 60 seconds"
            onClick={() => {
              setSmartPlay(true)
              for (let v of vodState.vods) {
                v.playing = true
              }
              setVodState({
                active: vodState.active,
                vods: vodState.vods,
              })
              for (let v of vodState.vods) {
                let currentTime = v.ref.current.getCurrentTime()
                v.ref.current.seekTo(currentTime + 60)
              }
            }}
          ><Fwd60Icon /></MediaButton>
          <div style={{pointerEvents: "auto"}}>
          <select
            defaultValue={playbackSpeed}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPlaybackSpeed(val);
            }}
            style={{
              background: colors.buttonBg,
              color: colors.text,
              border: `1px solid ${colors.buttonBorder}`,
              padding: "2px 8px",
              fontSize: "13px",
              borderRadius: "6px",
              cursor: "pointer",
              height: "26px",
              WebkitUserSelect: "auto",
              MozUserSelect: "auto",
              msUserSelect: "auto",
              userSelect: "auto",
            }}
          >
            {playbackSpeeds.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </div>
          <div style={{...style.buttonContainer, marginLeft: "10px"}}>
            {(() => {
              const t = new Date(mainRealTime);
              const syncParts = isNaN(t.getTime())
                ? {date: mainRealTime || "---", time: ""}
                : {date: t.toLocaleDateString(), time: t.toLocaleTimeString()};
              const openSyncEditor = (field) => {
                setSyncDateInput(syncParts.date);
                setSyncTimeInput(syncParts.time);
                setSyncFocusField(field);
                setEditingSyncTime(true);
              };
              const commitSyncTime = () => {
                if (syncDateInput && syncTimeInput) {
                  const t = new Date(syncDateInput + " " + syncTimeInput);
                  if (!isNaN(t.getTime())) {
                    setError("");
                    syncVods(t, false);
                  }
                }
                setEditingSyncTime(false);
                setSyncDateInput("");
                setSyncTimeInput("");
              };
              return editingSyncTime ? (
                <div
                  style={{display: "flex", gap: "4px", alignItems: "center"}}
                  onBlur={(e) => {
                    // Commit only when focus leaves both fields, not when
                    // moving between the date and time inputs
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      commitSyncTime();
                    }
                  }}
                >
                  <input
                    type="text"
                    value={syncDateInput}
                    onChange={(e) => setSyncDateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitSyncTime();
                        e.target.blur();
                      }
                    }}
                    autoFocus={syncFocusField === "date"}
                    style={{
                      ...style.textbox,
                      padding: "2px 4px",
                      fontSize: "12px",
                      width: "95px",
                      height: "20px",
                    }}
                    placeholder="e.g. 6/11/2026"
                  />
                  <input
                    type="text"
                    value={syncTimeInput}
                    onChange={(e) => setSyncTimeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitSyncTime();
                        e.target.blur();
                      }
                    }}
                    autoFocus={syncFocusField === "time"}
                    style={{
                      ...style.textbox,
                      padding: "2px 4px",
                      fontSize: "12px",
                      width: "100px",
                      height: "20px",
                    }}
                    placeholder="e.g. 3:45:00 PM"
                  />
                </div>
            ) : (
              <div
                style={{
                  ...style.control,
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: "2px 4px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                }}
              >
                <span onClick={() => openSyncEditor("date")}>{syncParts.date}</span>
                <span onClick={() => openSyncEditor("time")}>{syncParts.time}</span>
              </div>
            );
            })()}
          </div>
        </div>
        {!isMobile &&
        <div
          style={{
            flexGrow: 1,
            flexBasis: 0,
            marginLeft: "10px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div style={{...style.button(false), margin: "0px"}}
            onClick={() => {
              if (vodState.vods.length > 0) {
                let latestVod = vodState.vods[0]
                for (let vod of vodState.vods) {
                  if (vod.start > latestVod.start) {
                    latestVod = vod
                  }
                }
                syncVods(latestVod.start, true)
              }
            }
          }
          >
            Earliest Sync
          </div>
          <div style={{...style.button(smartMute), margin: "0px 5px 0px 5px", width: "95px"}}
            onClick={() => setSmartMute(!smartMute)}
          >
            Smart Mute {smartMute ? "On" : "Off"}
          </div>
          <div style={{...style.button(smartPlay), margin: "0px 5px 0px 5px", width: "95px"}}
            onClick={() => setSmartPlay(!smartPlay)}
          >
            Smart Play {smartPlay ? "On" : "Off"}
          </div>
        </div>}
      </div>
      {/* Hide/show bar icon */}
      <div
        className="showhide"
        style={{...style.angle(showBar), top: 0, fontSize: "20px"}}
        onClick={() => setShowBar(!showBar)}
      >{showBar ? "⌃" : "⌄"}</div>
      {/* Main body */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          flexBasis: 0,
          flexWrap: "wrap",
          minWidth: "0%",
          overflow: "auto",
        }}
      >
        {vodState.vods.length === 0 &&
          <div>
            {/* <div
              style={{
                color: style.link.color,
                boxShadow: `0 0 0 1px rgb(209, 160, 0)`,
                background: "rgb(43, 33, 0)",
                borderRadius: "2px",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                maxWidth: "580px",
                margin: "20px",
              }}
            >
              <div style={{
                alignSelf: "center",
                marginBottom: "10px",
                fontSize: style.instructions.fontSize+2
              }}>Announcement</div>
              <div style={{fontSize: style.instructions.fontSize}}>
                New feature!
                You can now add VODs using a streamer's name. If you have VODs open, it will automatically add a syncable VOD.
                If you don't have anything open, it will let you choose from the streamer's last five VODs.
                Hope you enjoy!</div>
            </div> */}
            <div
              style={{
                color: colors.text,
                background: "#1e1e23",
                boxShadow: `0 0 0 1px ${colors.buttonBorder}`,
                borderRadius: "10px",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                maxWidth: "580px",
                margin: "20px",
              }}
            >
              <div style={{
                alignSelf: "center",
                marginBottom: "15px",
                fontSize: style.instructions.fontSize+2,
                fontWeight: "bold",
              }}>Instructions</div>
              <div style={style.instructions}>1. Enter a Twitch or Kick username, a Twitch VOD link/ID, or a Kick video URL into the text box
              at the top and click "Add Video".</div>
              <div style={style.instructions}>2. Find a point in a video where you want to watch, and
              use that video's "Sync To This" button to watch all videos at that real time. You can
              also use "Earliest Sync" to sync all videos to the earliest time where they were all live.</div>
              <div style={style.instructions}>3. Click "Share" to get a link to the set of videos you
              are watching and (optionally) a timestamp to sync them all to. The timestamp is whichever
              video is unmuted at the time, and if they're all muted it defaults to the first video.</div>

              <div style={style.instructions}>Other controls:</div>
              <div style={style.instructions}>
                <ul style={{paddingLeft: "20px", margin: "6px 0px"}}>
                  <li>Smart mute forces at most one video to be unmuted</li>
                  <li>Smart play forces all videos to pause/play together. You can use it to
                  get a bit more fine grained control over video sync, as it's not perfect.</li>
                  <li>Controls at the bottom apply to all videos. The skips go forward/back by 10 seconds.</li>
                  <li>The arrows on the top/bottom bars will show/hide those bars, if you want the extra space.</li>
                </ul>
              </div>
              <div style={style.instructions}>Sorry if it's not perfect, I am limited in annoying
              ways by the Twitch and Kick APIs. If you notice a bug, feel free to report it <a href="https://github.com/mirror137/multivod/issues/new" style={{color: colors.accent}}>here</a>.</div>
              <div style={style.instructions}>Hope you enjoy!</div>
            </div>
          </div>
        }
        {vodState.vods.map((vod, index) => {
          return (
            <div
              key={vod.id}
              style={{
                display: "flex",
                width: boxSize.width,
                height: boxSize.height,
                boxSizing: "border-box",
                padding: "2px",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
                marginTop: "auto",
                marginBottom: "auto",
              }}
              onMouseMove={() => {
                vod.showButtons = true
                setVodState({
                  active: vodState.active,
                  vods: vodState.vods,
                })
                if (vod.buttonTimeoutRef !== null) {
                  clearTimeout(vod.buttonTimeoutRef.current)
                }
                vod.buttonTimeoutRef.current = setTimeout(() => {
                  vod.showButtons = false
                  setVodState({
                    active: activeVod.current,
                    vods: vodsRef.current,
                  })
                }, 2000)
              }}
            >
              {/* Buttons for closing */}
            <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  display: "flex",
                  margin: "12px",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              >
                {/* Sync button */}
                <div
                  className="syncPulse"
                  style={{
                    ...style.button(false),
                    marginRight: "10px",
                    height: "34px",
                    boxSizing: "border-box",
                    visibility: vod.showButtons ? "visible" : "hidden",
                    pointerEvents: "auto",
                  }}
                  onClick={() => {
                    // Check if the videos are syncable.
                    const currentSeconds = vod.ref.current.getCurrentTime()
                    const currentTime = new Date(vod.start.getTime() + currentSeconds*1000)
                    syncVods(currentTime, false)
                  }}
                >
                  Sync To This
                </div>
                {/* Close button */}
                <div
                  style={{
                    ...style.button(false),
                    width: "34px",
                    height: "34px",
                    boxSizing: "border-box",
                    padding: "6px",
                    fontSize: "18px",
                    visibility: vod.showButtons ? "visible" : "hidden",
                    pointerEvents: "auto",
                  }}
                  onClick={() => {
                    if (vod.buttonTimeoutRef !== null) {
                      clearTimeout(vod.buttonTimeoutRef.current)
                    }
                    // vodState.vods.splice(index, 1)
                    /*
                    vodState.vods.filter((vod, vod_index) => {
                      return vod_index != index;
                     } )*/
                    setVodState({
                      active: vodState.active === index ? -1 : (vodState.active > index ? vodState.active - 1 : vodState.active),
                      vods: vodState.vods.filter((_,idx) => idx !== index),
                    })
                  }}>✕</div>
              </div>
              {/* Player itself */}
              {vod.platform === "kick" ? (
                <KickVideoPlayer
                  ref={vod.ref}
                  url={vod.hlsUrl}
                  volume={vod.volume}
                  muted={vod.muted}
                  playing={vod.playing}
                  playbackRate={playbackSpeed}
                  vodStart={vod.start}
                  channelName={vod.vodData?.livestream?.channel?.name || vod.vodData?.livestream?.channel?.slug || vod.username}
                  publicVodId={vod.publicVodId || vod.vodData?.livestream?.vod_id}
                  onPlay={() => {
                    if (smartPlay) {
                      for (let v of vodState.vods) {
                        v.playing = true
                      }
                    }
                    vod.playing = true
                    setVodState({
                      active: vodState.active,
                      vods: vodState.vods,
                    })
                  }}
                  onPause={() => {
                    const currentSec = vod.ref.current.getCurrentTime();
                    const dur = (vod.end - vod.start) / 1000;
                    if (smartPlay && currentSec + 1 < dur) {
                      for (let v of vodState.vods) {
                        v.playing = false
                      }
                    }
                    vod.playing = false
                    setVodState({
                      active: vodState.active,
                      vods: vodState.vods,
                    })
                  }}
                  progressInterval={progressInterval}
                />
              ) : (
                <ReactPlayer
                  ref={vod.ref}
                  url={"https://www.twitch.tv/videos/" + vod.id}
                  width="100%"
                  height="100%"
                  controls={true}
                  playbackRate={playbackSpeed}
                  config={{
                    twitch: {
                      options: {
                        time: "0h0m0s",
                        autoplay: false,
                        parent: "localhost",
                      },
                    },
                  }}
                  volume={vod.volume}
                  muted={vod.muted}
                  playing={vod.playing}
                  onPlay={() => {
                    if (smartPlay) {
                      for (let v of vodState.vods) {
                        v.playing = true
                      }
                    }
                    vod.playing = true
                    setVodState({
                      active: vodState.active,
                      vods: vodState.vods,
                    })
                  }}
                  onPause={() => {
                    const currentSec = vod.ref.current.getCurrentTime();
                    const dur = (vod.end - vod.start) / 1000;
                    if (smartPlay && currentSec + 1 < dur) {
                      for (let v of vodState.vods) {
                        v.playing = false
                      }
                    }
                    vod.playing = false
                    setVodState({
                      active: vodState.active,
                      vods: vodState.vods,
                    })
                  }}
                  progressInterval={progressInterval}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}

export default App;
