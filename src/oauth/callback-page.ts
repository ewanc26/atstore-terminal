/**
 * Static callback page shown after the PDS redirects back to the CLI.
 * Deliberately self-contained: no scripts, fonts, or network requests.
 */
export const CALLBACK_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Signed in · atstore-terminal</title>
  <style>
    :root {
      --bg: #0b1020;
      --glow: #5b6cff;
      --card: rgba(255, 255, 255, 0.07);
      --border: rgba(255, 255, 255, 0.14);
      --text: #eef1f8;
      --muted: #aab3c9;
      --accent: #7ee0b8;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 20% 15%, rgba(91, 108, 255, 0.35), transparent 45%),
        radial-gradient(circle at 80% 85%, rgba(126, 224, 184, 0.22), transparent 45%),
        var(--bg);
    }

    main {
      width: min(100%, 420px);
      padding: 40px 32px 34px;
      text-align: center;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: var(--card);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(14px);
      animation: rise 320ms ease-out both;
    }

    .badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 22px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      font-size: 32px;
      font-weight: 600;
      color: #06251a;
      background: var(--accent);
      box-shadow: 0 0 0 8px rgba(126, 224, 184, 0.14);
    }

    h1 {
      margin: 0 0 10px;
      font-size: 1.75rem;
      letter-spacing: -0.025em;
    }

    p {
      margin: 0;
      line-height: 1.6;
      color: var(--muted);
    }

    .hint {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 0.925rem;
    }

    .brand {
      margin-top: 10px;
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      main { animation: none; }
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f4f6fb;
        --card: rgba(255, 255, 255, 0.86);
        --border: rgba(17, 24, 39, 0.1);
        --text: #111827;
        --muted: #52607a;
      }

      body {
        background:
          radial-gradient(circle at 20% 15%, rgba(91, 108, 255, 0.2), transparent 45%),
          radial-gradient(circle at 80% 85%, rgba(20, 160, 110, 0.16), transparent 45%),
          var(--bg);
      }

      main { box-shadow: 0 24px 70px rgba(17, 24, 39, 0.12); }
      .badge { color: #ffffff; }
    }
  </style>
</head>
<body>
  <main>
    <div class="badge" aria-hidden="true">✓</div>
    <h1>Signed in</h1>
    <p>Your ATStore terminal session is ready.</p>
    <p class="hint">You can close this tab and return to your terminal.</p>
    <div class="brand">atstore-terminal</div>
  </main>
</body>
</html>
`
