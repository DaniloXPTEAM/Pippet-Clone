import re, os, json, collections
root = r"C:\w\PiperLine\scripts\raw"
files = []
for dp, dn, fn in os.walk(root):
    for f in fn:
        if f.endswith(".js"): files.append(os.path.join(dp, f))
def rd(p): return open(p, encoding="utf-8", errors="replace").read()
kw = {
 "react": r"react\.production|ReactCurrentDispatcher|__SECRET_INTERNALS_DO_NOT_USE",
 "react-router": r"@remix-run/router|react-router|createBrowserRouter|RouterProvider",
 "axios": r"axios|isAxiosError",
 "redux": r"redux|createStore|configureStore",
 "zustand": r"zustand",
 "mobx": r"mobx",
 "recoil/jotai": r"recoil|jotai",
 "react-query": r"react-query|QueryClient|tanstack",
 "i18n": r"i18n|intl|formatMessage|useTranslation",
 "slardar/tea (ByteDance)": r"slardar|bytedance|byted|\btea\b|tea-sdk|apm_insight|mon-sg",
 "TikTok pixel": r"ttq\.|analytics\.tiktok|TiktokAnalytics",
 "bing UET": r"bat\.bing|UET|uetq",
 "google": r"gtag|googletagmanager|google-analytics|G-[A-Z0-9]{6,}",
 "facebook": r"fbq\(|connect\.facebook",
 "hotjar/clarity": r"hotjar|clarity\.ms",
 "sentry": r"sentry",
 "oauth providers": r"google|facebook|tiktok|apple|capcut",
 "webpack/rspack": r"__webpack_require__|webpackChunk|rspack|__rspack",
 "lazy/Suspense": r"React\.lazy|Suspense|lazy\(",
 "service worker": r"serviceWorker",
 "websocket": r"WebSocket|wss://",
 "web worker": r"new Worker|importScripts",
 "ffmpeg/wasm": r"ffmpeg|\.wasm|WebAssembly",
}
print("ARQUIVOS:", len(files))
for p in sorted(files, key=os.path.getsize, reverse=True)[:40]:
    t = rd(p); hits = {k: len(re.findall(v, t, re.I)) for k, v in kw.items()}
    hits = {k: v for k, v in hits.items() if v}
    print(f"\n{os.path.basename(p)[:48]:48s} {os.path.getsize(p)//1024:5d} KB  {hits}")
