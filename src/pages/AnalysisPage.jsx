import { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";
import { ArrowLeft, ChevronDown, ChevronUp, Clock3, Info, LoaderCircle, Play, Sparkles, Target, Zap } from "lucide-react";
import "./AnalysisPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AnalysisPage({ youtubeUrl, onBack }) {
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState("starting");
    const [progress, setProgress] = useState(0);
    const [videoId, setVideoId] = useState("");
    const [placements, setPlacements] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progressOpen, setProgressOpen] = useState(false);
    const [whyOpen, setWhyOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedPlacement, setSelectedPlacement] = useState(null);
    const [error, setError] = useState("");
    const playerRef = useRef(null);
    const pollRef = useRef(null);
    const timeRef = useRef(null);

    const currentAd = useMemo(() => {
        let latest = null;
        placements.forEach((p) => {
            if (Number(p.timestamp) <= currentTime && (!latest || Number(p.timestamp) > Number(latest.timestamp))) latest = p;
        });
        return latest;
    }, [placements, currentTime]);

    const ad = currentAd || selectedPlacement;

    const extractVideoId = (url) => {
        try {
            const u = new URL(url);
            if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
            if (u.hostname.includes("youtu.be")) return u.pathname.substring(1);
        } catch { }
        return null;
    };

    const startPolling = (id) => {
        if (pollRef.current) clearInterval(pollRef.current);
        const poll = async () => {
            try {
                const response = await fetch(`${API_URL}/api/analyze/${id}`);
                if (!response.ok) throw new Error("Failed to get analysis status.");
                const result = await response.json();
                console.log(result)
                const job = result.data;
                setStatus(job.status);
                setProgress(Math.min(100, Math.max(0, job.progress || 0)));
                setPlacements(job.placements || []);
                if (job.status === "completed") {
                    setProgress(100);
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
                if (job.status === "failed") {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setError(job.error || "Video analysis failed.");
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        };
        poll();
        pollRef.current = setInterval(poll, 2500);
    };

    useEffect(() => {
        const id = extractVideoId(youtubeUrl);
        if (!id) {
            setStatus("failed");
            setError("Invalid YouTube URL.");
            return;
        }
        setVideoId(id);
        (async () => {
            try {
                const response = await fetch(`${API_URL}/api/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ youtube_url: youtubeUrl }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || "Failed to start analysis.");
                setJobId(data.job_id);
                setStatus("processing");
                startPolling(data.job_id);
            } catch (e) {
                setStatus("failed");
                setError(e.message || "Unable to start analysis.");
            }
        })();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timeRef.current) clearInterval(timeRef.current);
        };
    }, [youtubeUrl]);

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        setDuration(event.target.getDuration());
    };

    const startTracking = () => {
        if (timeRef.current) clearInterval(timeRef.current);
        timeRef.current = setInterval(() => {
            if (playerRef.current) setCurrentTime(playerRef.current.getCurrentTime());
        }, 300);
    };

    const stopTracking = () => {
        if (timeRef.current) clearInterval(timeRef.current);
        timeRef.current = null;
    };

    const seekTo = (timestamp) => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(Number(timestamp), true);
        playerRef.current.playVideo();
        setCurrentTime(Number(timestamp));
    };

    const ready = status == "processing" || status == "completed" || progress > 15;
    const label = status === "completed" ? "Analysis complete" : progress < 20 ? "Preparing video" : progress < 60 ? "Understanding context" : "Finding relevant ads";

    return (
        <main className="analysis-page">
            <div className="analysis-bg"><div className="analysis-glow one" /><div className="analysis-glow two" /><div className="analysis-grid" /></div>

            <header className="analysis-nav">
                <button onSubmit={onBack} className="back-button" onClick={onBack}><ArrowLeft size={17} /><span>Back</span></button>
                <div className="analysis-brand italic text-4xl">Context<span className="italic">Ads</span></div>
                <div className={`progress-widget ${progressOpen ? "open" : ""}`} onMouseEnter={() => setProgressOpen(true)} onMouseLeave={() => setProgressOpen(false)}>
                    <button className="progress-trigger" onClick={() => setProgressOpen((v) => !v)}>
                        <span className="progress-ring" style={{ "--p": `${progress}%` }}><b>{Math.round(progress)}%</b></span>
                        <span className="progress-copy"><strong>{label}</strong><small>{ready ? "Ready to watch" : "Live analysis"}</small></span>
                        {progressOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {progressOpen && (
                        <div className="progress-panel">
                            <div className="panel-head"><div><span>PROCESSING STATUS</span><strong>{Math.round(progress)}% complete</strong></div><LoaderCircle size={19} className={!ready ? "spin" : ""} /></div>
                            <div className="wave"><svg viewBox="0 0 420 56" preserveAspectRatio="none"><path className="wave-base" d="M0 28 C18 4 34 52 52 28 S86 4 104 28 S138 52 156 28 S190 4 208 28 S242 52 260 28 S294 4 312 28 S346 52 364 28 S398 4 420 28" /><path className="wave-active" d="M0 28 C18 4 34 52 52 28 S86 4 104 28 S138 52 156 28 S190 4 208 28 S242 52 260 28 S294 4 312 28 S346 52 364 28 S398 4 420 28" style={{ strokeDasharray: 560, strokeDashoffset: 560 - 560 * progress / 100 }} /></svg></div>
                            <div className="step-list"><div className={progress >= 20 ? "done" : "active"}><Play size={13} /> Preparing video</div><div className={progress >= 55 ? "done" : progress >= 20 ? "active" : ""}><Sparkles size={13} /> Understanding context</div><div className={progress >= 85 ? "done" : progress >= 55 ? "active" : ""}><Target size={13} /> Finding relevant ads</div><div className={ready ? "done" : ""}><Zap size={13} /> Analysis complete</div></div>
                        </div>
                    )}
                </div>
            </header>

            {!ready && status !== "failed" && (
                <section className="loading-state">
                    <div className="orbit"><div /><div /><span><Sparkles size={24} /></span></div>
                    <small className="loading-eyebrow">CONTEXT ENGINE · {jobId ? `JOB ${jobId.slice(0, 8)}` : "INITIALIZING"}</small>
                    <h1>Understanding<br /><em>the moment.</em></h1>
                    <p>{label}. We are preparing your video and matching meaningful scenes with relevant advertisements.</p>
                    <div className="big-progress"><div><span>{label}</span><b>{Math.round(progress)}%</b></div><section><i style={{ width: `${progress}%` }} /></section></div>
                    <div className="hints"><span><Sparkles size={13} /> Scene understanding</span><span><Target size={13} /> Semantic matching</span><span><Zap size={13} /> Timestamp placement</span></div>
                </section>
            )}

            {status === "failed" && <section className="error-state"><div>!</div><h2>We couldn&apos;t analyze this video.</h2><p>{error}</p><button onClick={onBack}>Try another video</button></section>}

            {ready && (
                <section className="workspace">
                    <div className="workspace-title"><div><small>CONTEXTUAL ANALYSIS</small><h1>Your video, understood in context.</h1></div><span className="live"><i /> Analysis complete</span></div>
                    <div className="media-grid">
                        <div className="video-column">
                            <div className="video-card"><div className="video-top"><span><i /> PLAYBACK</span><b>{formatTime(currentTime)} / {formatTime(duration)}</b></div><div className="youtube-wrap"><YouTube className="youtube-player" iframeClassName="youtube-iframe" videoId={videoId} opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 } }} onReady={onPlayerReady} onPlay={startTracking} onPause={stopTracking} onEnd={stopTracking} /></div></div>
                            <div className="timeline-card"><div className="timeline-title"><div><small>CONTEXT TIMELINE</small><strong>Ad opportunities</strong></div><b>{formatTime(currentTime)}</b></div><div className="timeline"><div className="timeline-progress" style={{ width: duration ? `${currentTime / duration * 100}%` : 0 }} /><div className="timeline-cursor" style={{ left: duration ? `${currentTime / duration * 100}%` : 0 }} />{placements.map((p, i) => { const pos = duration ? Number(p.timestamp) / duration * 100 : 0; return <button key={`${p.timestamp}-${i}`} className={`marker ${currentAd?.timestamp === p.timestamp ? "active" : ""}`} style={{ left: `${Math.min(100, Math.max(0, pos))}%` }} onClick={() => { setSelectedPlacement(p); seekTo(p.timestamp); }}><span>{p.ad?.brand}</span><i /></button>; })}</div><div className="scale"><span>00:00</span><span>{formatTime(duration)}</span></div></div>
                        </div>

                        <aside className="ad-column">
                            <div className="ad-heading"><div><small>LIVE MATCH</small><strong>Contextual advertisement</strong></div>{ad && <b>{Math.round((Number(ad.score) || 0) * 100)}% match</b>}</div>
                            {ad ? <>
                                <div className="ad-card"><div className="ad-orb" /><div className="ad-top"><span>SPONSORED</span><b><Clock3 size={12} /> {ad.timestamp_formatted}</b></div><div className="brand-mark">{initials(ad.ad?.brand)}</div><small>{ad.ad?.category || "Contextual recommendation"}</small><h2>{ad.ad?.brand}</h2><h3>{ad.ad?.title}</h3><p>{ad.ad?.description}</p><div className="matched"><span>Matched to</span><strong>{ad.scene || "current video context"}</strong></div><button className="ad-cta flex items-center justify-between  ">Explore this ad <ArrowLeft size={16} style={{ transform: "rotate(135deg)" }} /></button></div>
                                <div className="accordion"><button onClick={() => setWhyOpen(v => !v)}><span><Info size={16} /> Why this ad?</span>{whyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{whyOpen && <div className="accordion-body"><p>ContextAds selected <b>{ad.ad?.brand}</b> because the current scene matches this advertisement semantically.</p><div className="reason-grid"><div><span>Scene</span><b>{ad.scene || "Detected context"}</b></div><div><span>Score</span><b>{Number(ad.score || 0).toFixed(3)}</b></div></div>{ad.search_query && <div className="query"><span>AI search context</span><p>{ad.search_query}</p></div>}</div>}</div>
                                <div className="accordion"><button onClick={() => setDetailsOpen(v => !v)}><span><Target size={16} /> See ad details</span>{detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{detailsOpen && <div className="accordion-body">{[["Brand", ad.ad?.brand], ["Title", ad.ad?.title], ["Category", ad.ad?.category], ["Timestamp", ad.timestamp_formatted]].map(([k, v]) => <div className="detail" key={k}><span>{k}</span><b>{v}</b></div>)}</div>}</div>
                            </> : <div className="empty-ad"><Target size={23} /><h3>Watching the context</h3><p>No contextual advertisement has been discovered for the current moment yet.</p></div>}
                        </aside>
                    </div>
                </section>
            )}
        </main>
    );
}

function initials(brand = "AD") { return brand.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase(); }
function formatTime(seconds = 0) { const s = Math.max(0, Math.floor(Number(seconds) || 0)); const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`; }
