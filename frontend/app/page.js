"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLES = [
  { src: "/samples/normal-1.jpeg", name: "Normal", alt: "Sample chest X-ray labelled normal, first" },
  { src: "/samples/normal-2.jpeg", name: "Normal", alt: "Sample chest X-ray labelled normal, second" },
  { src: "/samples/pneumonia-1.jpeg", name: "Pneumonia", alt: "Sample chest X-ray labelled pneumonia, first" },
  { src: "/samples/pneumonia-2.jpeg", name: "Pneumonia", alt: "Sample chest X-ray labelled pneumonia, second" },
];

const STEPS = [
  {
    title: "Upload",
    text: "Choose a JPG or PNG chest X-ray, or pick a sample.",
  },
  {
    title: "Read",
    text: "DenseNet121 scores it from 0 to 1 for pneumonia.",
  },
  {
    title: "Show",
    text: "Grad-CAM paints the regions that drove the score.",
  },
  {
    title: "Explain",
    text: "A language model explains the result in plain words.",
  },
];

function StepVisual({ kind }) {
  if (kind === "Upload")
    return (
      <div className="vis vis-upload">
        <img src="/samples/normal-1.jpeg" alt="" />
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
        <span className="chip">chest-xray.jpeg</span>
      </div>
    );
  if (kind === "Read")
    return (
      <div className="vis vis-read">
        <img src="/samples/pneumonia-2.jpeg" alt="" />
        <span className="grid" />
        <span className="scan" aria-hidden="true" />
        <span className="chip">150 × 150</span>
      </div>
    );
  if (kind === "Show")
    return (
      <div className="vis vis-show">
        <img src="/samples/pneumonia-1.jpeg" alt="" />
        <span className="blob" />
        <span className="chip">Illustration</span>
      </div>
    );
  return <ExplainVisual />;
}

const SAMPLE_REPLY = "No clear signs of pneumonia. If you have a cough, fever or trouble breathing, see a doctor.";

function ExplainVisual() {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(SAMPLE_REPLY.length); return; }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setStarted(true), io.disconnect()), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let i = 0, id;
    const t = setTimeout(() => {
      id = setInterval(() => { i += 1; setN(i); if (i >= SAMPLE_REPLY.length) clearInterval(id); }, 28);
    }, 700);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [started, run]);
  const replay = () => { if (n >= SAMPLE_REPLY.length) { setN(0); setRun((x) => x + 1); } };
  const typing = started && n === 0;
  const done = n >= SAMPLE_REPLY.length;
  return (
    <div className="vis vis-explain" ref={ref} onMouseEnter={replay}>
      <span className="chip">Example wording</span>
      <div className="reply">
        <img className="av" src="/logo.png" alt="" />
        <div className="bubble" aria-label={SAMPLE_REPLY}>
          {typing ? <span className="typing" aria-hidden="true"><i /><i /><i /></span> : (
            <span aria-hidden="true">{SAMPLE_REPLY.slice(0, n) || " "}{!done && n > 0 && <b className="caret" />}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const COLS = 40, ROWS = 25, TOTAL = COLS * ROWS, WRONG = 50; // 95% of 1,000 (94.63% rounded)

// Deterministic scatter so the 54 misses sit at fixed, random-looking positions.
const WRONG_SET = (() => {
  let x = 94630;
  const rnd = () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const set = new Set();
  while (set.size < WRONG) set.add(Math.floor(rnd() * TOTAL));
  return set;
})();

function DotMatrix() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({ progress: 0, hover: -1, focus: "all" });
  const drawRef = useRef(() => {});
  const [pct, setPct] = useState(0);
  const [focus, setFocusState] = useState("all");
  const [tip, setTip] = useState(null);

  function setFocus(next) {
    const f = st.current.focus === next ? "all" : next;
    st.current.focus = f;
    setFocusState(f);
    drawRef.current();
  }

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, started = false, w = 0, h = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const { progress, hover, focus: f } = st.current;
      ctx.clearRect(0, 0, w, h);
      const pitch = w / COLS, r = pitch * 0.34;
      const shown = Math.floor(progress * TOTAL);
      for (let i = 0; i < TOTAL; i++) {
        const cx = (i % COLS) * pitch + pitch / 2, cy = Math.floor(i / COLS) * pitch + pitch / 2;
        const wrong = WRONG_SET.has(i);
        ctx.beginPath();
        if (i >= shown) { ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = "rgba(198,209,255,0.16)"; ctx.fill(); continue; }
        const dim = (f === "miss" && !wrong) || (f === "ok" && wrong);
        const big = i === hover ? 1.55 : f === "miss" && wrong ? 1.3 : 1;
        ctx.globalAlpha = dim ? 0.14 : 1;
        ctx.arc(cx, cy, r * big, 0, Math.PI * 2);
        if (wrong) { ctx.lineWidth = Math.max(1.5, r * 0.4); ctx.strokeStyle = "#ffd21f"; ctx.stroke(); }
        else { ctx.fillStyle = "#ffffff"; ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    };
    drawRef.current = draw;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = wrap.clientWidth; h = (w / COLS) * ROWS;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const run = () => {
      if (reduce) { st.current.progress = 1; setPct(95); draw(); return; }
      const t0 = performance.now(), dur = 2200;
      const tick = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        st.current.progress = 1 - Math.pow(1 - k, 3);
        setPct(95 * st.current.progress);
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const b = canvas.getBoundingClientRect(), pitch = b.width / COLS;
      const col = Math.floor((e.clientX - b.left) / pitch), row = Math.floor((e.clientY - b.top) / pitch);
      const idx = row * COLS + col;
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS || idx >= Math.floor(st.current.progress * TOTAL)) { onLeave(); return; }
      st.current.hover = idx;
      setTip({ x: (col + 0.5) * pitch, y: row * pitch, wrong: WRONG_SET.has(idx) });
      draw();
    };
    const onLeave = () => { st.current.hover = -1; setTip(null); draw(); };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; run(); } }, { threshold: 0.35 });
    io.observe(wrap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave); };
  }, []);

  return (
    <figure className="matrix" ref={wrapRef}>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} role="img" aria-label="1,000 dots: 950 white for correct predictions and 50 yellow rings for incorrect ones" />
        {tip && (
          <div className="tip" style={{ left: tip.x, top: tip.y }}>
            <b>{tip.wrong ? "Missed prediction" : "Correct prediction"}</b>
            <span>One dot is 1 in 1,000 X-rays</span>
          </div>
        )}
      </div>
      <figcaption>
        <b>{Math.round(pct)}%</b>
        <span className="key">
          <button type="button" className="key-btn" aria-pressed={focus === "ok"} onClick={() => setFocus("ok")}><i className="k-ok" /> Correct</button>
          <button type="button" className="key-btn" aria-pressed={focus === "miss"} onClick={() => setFocus("miss")}><i className="k-no" /> Incorrect</button>
        </span>
        <small>Hover a dot, or pick Correct or Incorrect to isolate them. 94.63% measured, rounded to 95%.</small>
      </figcaption>
    </figure>
  );
}

function Arrow({ dir = "right", size = 28, className = "" }) {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <svg className={`arrow ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
      <path d="M3 12h17M13 5l7 7-7 7" />
    </svg>
  );
}

function CountUp({ to, decimals = 1 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    let raf, t0;
    const tick = (t) => {
      t0 ??= t;
      const k = Math.min((t - t0) / 900, 1);
      setV(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toFixed(decimals)}</>;
}

function Reveal({ as: Tag = "div", index = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${className} reveal ${seen ? "in" : ""}`} style={{ "--i": index }} {...rest}>
      {children}
    </Tag>
  );
}

export default function Home() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explainFailed, setExplainFailed] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const [split, setSplit] = useState(50);
  const [active, setActive] = useState("try");
  const [flash, setFlash] = useState(false);
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const logRef = useRef(null);
  const filmRef = useRef(null);
  const [ratio, setRatio] = useState(1);
  const [lens, setLens] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const els = ["try", "how", "limits"].map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-40% 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function reset(keepInput) {
    setChat([]);
    setDraft("");
    setResult(null);
    setExplanation(null);
    setExplainFailed(false);
    setError(null);
    setSplit(50);
    if (!keepInput && inputRef.current) inputRef.current.value = "";
  }

  function pick(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That file is not an image. Choose a JPG or PNG chest X-ray.");
      return;
    }
    reset(true);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function pickSample(src) {
    try {
      const blob = await (await fetch(src)).blob();
      pick(new File([blob], src.split("/").pop(), { type: blob.type || "image/jpeg" }));
    } catch {
      setError("Could not load that sample. Refresh the page and try again.");
    }
  }

  async function sendChat(text) {
    const q = (text ?? draft).trim();
    if (!q || !result || chatBusy) return;
    const next = [...chat, { role: "user", content: q }];
    setChat(next);
    setDraft("");
    setChatBusy(true);
    try {
      const r = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: result.label, confidence: result.confidence, messages: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error();
      setChat([...next, { role: "assistant", content: j.reply }]);
    } catch {
      setChat([...next, { role: "assistant", content: "I couldn't answer that just now. Please try again in a moment.", failed: true }]);
    } finally {
      setChatBusy(false);
    }
  }

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat, chatBusy]);

  const ZOOM = 2.6, LENS = 150;

  function moveLens(e) {
    if (e.pointerType === "touch") return;
    const el = filmRef.current;
    if (!el) return;
    const b = el.getBoundingClientRect(), W = b.width, H = b.height;
    const x = e.clientX - b.left, y = e.clientY - b.top;
    const dw = ratio >= 1 ? W : H * ratio, dh = ratio >= 1 ? W / ratio : H;
    const ox = (W - dw) / 2, oy = (H - dh) / 2;
    if (x < ox || x > ox + dw || y < oy || y > oy + dh) return setLens(null);
    const useHeat = result?.heatmap && (x / W) * 100 > split;
    setLens({ x, y, ox, oy, dw, dh, src: useHeat ? result.heatmap : preview });
  }

  async function saveCard() {
    if (!result || saving) return;
    setSaving(true);
    try {
      await document.fonts.ready;
      const W = 1200, H = 630;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const g = cv.getContext("2d");
      const fam = getComputedStyle(document.body).fontFamily;
      const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const positive = result.label === "PNEUMONIA";
      g.fillStyle = "#0a2bcb"; g.fillRect(0, 0, W, H);

      // brand
      g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
      g.font = `800 34px ${fam}`; g.fontStretch = "extra-condensed";
      g.fillText("PNEUMOSCAN", 60, 64);

      // X-ray (heatmap when available)
      const img = await load(result.heatmap || preview);
      const S = 440, ix = 60, iy = 100;
      g.fillStyle = "#000"; g.fillRect(ix, iy, S, S);
      const r = img.width / img.height;
      const dw = r >= 1 ? S : S * r, dh = r >= 1 ? S / r : S;
      g.drawImage(img, ix + (S - dw) / 2, iy + (S - dh) / 2, dw, dh);

      // verdict panel
      const px = 540, py = 100, pw = 600, ph = 250;
      g.fillStyle = positive ? "#ffd21f" : "#0b7d4b";
      g.fillRect(px, py, pw, ph);
      g.fillStyle = positive ? "#0a0f2e" : "#fff";
      g.font = `800 76px ${fam}`; g.fontStretch = "extra-condensed";
      const lines = positive ? ["PNEUMONIA", "DETECTED"] : ["NO PNEUMONIA", "DETECTED"];
      g.fillText(lines[0], px + 32, py + 100);
      g.fillText(lines[1], px + 32, py + 180);
      g.font = `600 24px ${fam}`; g.fontStretch = "normal";
      g.fillText(`Model confidence ${result.confidence.toFixed(1)}%`, px + 32, py + 226);

      // confidence cells
      const on = Math.round(result.confidence / 5);
      for (let i = 0; i < 20; i++) {
        g.globalAlpha = i < on ? 1 : 0.22;
        g.fillStyle = "#fff"; g.fillRect(px + i * 30, py + ph + 30, 24, 28);
      }
      g.globalAlpha = 1;

      // disclaimer
      g.fillStyle = "#c6d1ff"; g.font = `500 22px ${fam}`; g.fontStretch = "normal";
      g.fillText("Screening aid, not a diagnosis.", px, 470);
      g.fillText("A qualified doctor should review every X-ray.", px, 502);
      g.fillStyle = "#ffd21f"; g.fillRect(0, H - 14, W, 14);

      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      const file = new File([blob], "pneumoscan-result.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "PneumoScan result" }); return; } catch (e) { if (e?.name === "AbortError") return; }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "pneumoscan-result.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      setError("Could not create the result card. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // The logo and name go home: back to the top of the page, with no #hash left in the address bar.
  function goHome(e) {
    e?.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function goUpload(e) {
    e?.preventDefault();
    document.getElementById("desk")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(false);
    requestAnimationFrame(() => setFlash(true));
    setTimeout(() => setFlash(false), 1600);
    setTimeout(() => document.getElementById("drop")?.focus({ preventScroll: true }), 500);
  }

  async function runDemo(src = "/samples/pneumonia-1.jpeg") {
    try {
      const blob = await (await fetch(src)).blob();
      const f = new File([blob], "sample.jpeg", { type: blob.type || "image/jpeg" });
      pick(f);
      document.getElementById("desk")?.scrollIntoView({ behavior: "smooth", block: "center" });
      analyze(f);
    } catch {
      setError("Could not load the sample. Refresh the page and try again.");
    }
  }

  function clear() {
    setFile(null);
    setPreview(null);
    reset(false);
  }

  async function analyze(f = file) {
    if (!f) return;
    setLoading(true);
    reset(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`${API}/predict`, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "The analysis failed. Try again.");
      setResult(data);
      explain(data);
    } catch (e) {
      setError(
        e.message === "Failed to fetch"
          ? "Can't reach the analysis server. It may be waking up. Wait a few seconds, then press Read X-ray again."
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function explain(data) {
    try {
      const r = await fetch(`${API}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: data.label, confidence: data.confidence }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error();
      setExplanation(j.explanation);
    } catch {
      setExplainFailed(true);
    }
  }

  const positive = result?.label === "PNEUMONIA";
  const cells = result ? Math.round(result.confidence / 5) : 0;

  return (
    <main>
      <header className="nav">
        <a className="brand" href="/" aria-label="PneumoScan, back to the top" onClick={goHome}>
          <img className="logo" src="/logo.png" alt="" width="34" height="32" />
          PneumoScan
        </a>
        <nav aria-label="Page sections">
          <a href="#how" className={active === "how" ? "on" : ""}>How it works</a>
          <a href="#limits" className={active === "limits" ? "on" : ""}>Accuracy</a>
          <a href="#desk" className="nav-cta" onClick={goUpload}>Upload X-ray</a>
        </nav>
      </header>
      <section className="stage" id="try" aria-labelledby="title">

        <h1 id="title">Chest X-ray in. <span>Evidence out.</span></h1>
        <p className="lede">
          Upload a chest X-ray. The model says whether it sees pneumonia, shows the exact region that drove its answer, and explains it in plain language.
        </p>

        <div className="hero-cta">
          <button className="cta-big" onClick={() => runDemo()} disabled={loading}>
            See it work in one click
            <Arrow size={32} />
          </button>
          <a href="#desk" className="cta-link" onClick={goUpload}>Got your own chest X-ray? Test it yourself</a>
        </div>

        <div className="desk" id="desk">
          {/* ---------- Input sign ---------- */}
          <div className={`sign sign-input ${flash ? "flash" : ""}`}>
            <div className="sign-head">
              <span>Upload</span>
              <Arrow dir="right" className="flow-arrow" />
            </div>

            {!preview ? (
              <div
                id="drop"
                className={`drop ${drag ? "over" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.500" strokeLinecap="square" aria-hidden="true"><path d="M12 17V4M6 10l6-6 6 6M4 20h16" /></svg>
                <strong>Drop an X-ray here</strong>
                <span>or press to choose a file. JPG or PNG, up to 10 MB.</span>
              </div>
            ) : (
              <div className="viewer">
                <div className="film" ref={filmRef} onPointerMove={moveLens} onPointerLeave={() => setLens(null)}>
                  <img src={preview} alt="Your chest X-ray" onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 1)} />
                  {result?.heatmap && (
                    <>
                      <img
                        className="heat"
                        src={result.heatmap}
                        alt="Same X-ray with a heatmap of the regions that drove the result"
                        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                      />
                      <span className="seam" style={{ left: `${split}%` }} aria-hidden="true" />
                      <span className="tag tag-l">X-ray</span>
                      <span className="tag tag-r">Where the model looked</span>
                    </>
                  )}
                  {loading && <span className="sweep" aria-hidden="true" />}
                  {lens && (
                    <span
                      className="lens"
                      aria-hidden="true"
                      style={{
                        left: lens.x - LENS / 2, top: lens.y - LENS / 2, width: LENS, height: LENS,
                        backgroundImage: `url(${lens.src})`,
                        backgroundSize: `${lens.dw * ZOOM}px ${lens.dh * ZOOM}px`,
                        backgroundPosition: `${LENS / 2 - (lens.x - lens.ox) * ZOOM}px ${LENS / 2 - (lens.y - lens.oy) * ZOOM}px`,
                      }}
                    />
                  )}
                </div>
                {!loading && <p className="hint">Move over the image to zoom in.</p>}
                {result?.heatmap && (
                  <label className="slider">
                    <span className="sr">Compare the original X-ray with the heatmap</span>
                    <input type="range" min="0" max="100" value={split} onChange={(e) => setSplit(+e.target.value)} />
                  </label>
                )}
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

            <div className="actions">
              <button className="btn go" onClick={() => analyze()} disabled={!file || loading}>
                {loading ? "Reading…" : "Read X-ray"}
                {!loading && <Arrow />}
              </button>
              {file && <button className="btn quiet" onClick={clear} disabled={loading}>Remove image</button>}
            </div>

            <div className="samples">
              <p>No X-ray to hand? Use a dataset sample. Labels are the dataset’s.</p>
              <ul>
                {SAMPLES.map((s) => (
                  <li key={s.src}>
                    <button onClick={() => pickSample(s.src)} disabled={loading} aria-label={`Use sample: ${s.alt}`}>
                      <img src={s.src} alt="" />
                      <span>{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ---------- Output sign ---------- */}
          <div className="sign-col">
            {!result && !error && (
              <div className="sign sign-wait">
                <div className="sign-head">
                  <span>{loading ? "Reading" : "Result"}</span>
                  {loading && <span className="dots" aria-hidden="true" />}
                </div>
                {loading ? (
                  <p className="wait-text">
                    Reading the X-ray. The first request after a quiet spell can take up to a minute while the model loads.
                  </p>
                ) : (
                  <>
                    <p className="wait-text">After you press Read X-ray, you get:</p>
                    <ul className="preview">
                      <li><b>A verdict</b><span>Pneumonia detected, or not.</span></li>
                      <li><b>A confidence reading</b><span>How sure the model is.</span></li>
                      <li><b>A heatmap</b><span>Where on the X-ray it looked.</span></li>
                      <li><b>A plain explanation</b><span>What the result means and what to do next.</span></li>
                    </ul>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="sign sign-error" role="alert">
                <div className="sign-head"><span>Could not read</span></div>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <>
                <div className={`sign verdict ${positive ? "alert" : "clear"}`}>
                  <div className="verdict-text">
                    {positive ? "Pneumonia detected" : "No pneumonia detected"}
                  </div>
                  <div className="reading">
                    <div className="reading-top">
                      <span>Model confidence</span>
                      <b><CountUp to={result.confidence} />%</b>
                    </div>
                    <div className="cells" role="img" aria-label={`Confidence ${result.confidence.toFixed(1)} percent`}>
                      {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < cells ? "on" : ""} />)}
                    </div>
                  </div>
                </div>

                <div className="sign sign-explain">
                  <div className="sign-head"><span>What this means</span></div>
                  {explanation ? (
                    <p>{explanation}</p>
                  ) : explainFailed ? (
                    <p className="dim">The plain-language explanation is unavailable right now. The verdict and heatmap above are unaffected.</p>
                  ) : (
                    <p className="dim">Writing the explanation…</p>
                  )}
                  <button className="btn quiet save" onClick={saveCard} disabled={saving}>
                    {saving ? "Creating card…" : "Save result card"}
                  </button>
                </div>
              </>
            )}

            <div className="sign sign-chat">
              <div className="sign-head"><span>Ask about this result</span></div>
              <div className="log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation">
                {chat.length === 0 && (
                  <p className="log-empty">
                    {result ? "Ask a follow-up question, or start with one of these." : "Read an X-ray first, then ask questions about the result here."}
                  </p>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    {m.role === "assistant" && <img className="av" src="/logo.png" alt="" />}
                    <p>{m.content}</p>
                  </div>
                ))}
                {chatBusy && (
                  <div className="msg assistant">
                    <img className="av" src="/logo.png" alt="" />
                    <p><span className="typing" aria-label="Writing a reply"><i /><i /><i /></span></p>
                  </div>
                )}
              </div>
              {result && chat.length === 0 && (
                <div className="suggest">
                  {["What does this result mean?", "What should I do next?", "What is pneumonia?"].map((q) => (
                    <button key={q} onClick={() => sendChat(q)}>{q}</button>
                  ))}
                </div>
              )}
              <form className="composer" onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={result ? "Ask a question about this result" : "Available after a result"}
                  disabled={!result || chatBusy}
                  maxLength={500}
                  aria-label="Your question"
                />
                <button type="submit" disabled={!result || chatBusy || !draft.trim()} aria-label="Send question">
                  <Arrow size={22} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="route" id="how" aria-labelledby="route-title">
        <h2 id="route-title">What happens to your X-ray</h2>
        <div className="rail-wrap">
          <div className="rail">
            {STEPS.map((s, i) => (
              <Reveal as="article" index={i} key={s.title} className="card" tabIndex={0}>
                <StepVisual kind={s.title} />
                <div className="card-body">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="limits" id="limits" aria-labelledby="limits-title">
        <h2 id="limits-title">Accuracy you can check</h2>
        <div className="limits-copy">
          <p className="big">
            Tested on 1,172 held-out X-rays after training on 4,684 images from a public 5,856-image chest X-ray dataset.
          </p>
          <ul className="proof">
            <li><b>Open and reproducible</b><span>The training notebook and model architecture are public on GitHub.</span></li>
            <li><b>Evidence with every result</b><span>A confidence score and a heatmap show what the model based its answer on.</span></li>
            <li><b>Private by design</b><span>Your X-ray is analysed in memory and not stored. The assistant only sees the result, never the image.</span></li>
          </ul>
        </div>
        <DotMatrix />
        <p className="notice"><b>Built to support clinical judgement.</b> PneumoScan is a screening aid. A qualified doctor should review every X-ray.</p>
      </section>

      <footer>
        <a className="foot-brand" href="/" aria-label="PneumoScan, back to the top" onClick={goHome}>
          <span className="foot-logo"><img src="/logo.png" alt="" /></span>
          PneumoScan
        </a>
        <p>Not a doctor. Get it checked IRL.</p>
        <a href="https://github.com/aristotile-dev/Pneumonia-Detector-Machine-Learning-Tensorflow">Source and training notebook on GitHub</a>
      </footer>
    </main>
  );
}
