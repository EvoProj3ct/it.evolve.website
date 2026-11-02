export interface YouTubePlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoData(): { video_id?: string; title?: string; isLive?: boolean };
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
export type PlayerEvent = { target: YouTubePlayer; data: number };
export type YouTubeApi = { Player: new (element: HTMLElement, options: {
  host?: string; width: string; height: string;
  playerVars: Record<string, string | number>;
  events: { onReady: (event: { target: YouTubePlayer }) => void; onStateChange: (event: PlayerEvent) => void; onError: (event: PlayerEvent) => void; onAutoplayBlocked: () => void };
}) => YouTubePlayer };
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let loading: Promise<YouTubeApi> | null = null;

export function loadYouTube(): Promise<YouTubeApi> {
  const host = window as YouTubeWindow;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = host.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const cleanup = () => { window.clearTimeout(timeout); host.onYouTubeIframeAPIReady = previous; };
    const fail = () => { cleanup(); script.remove(); loading = null; reject(new Error("YouTube non si è caricato. Controlla la connessione e riprova.")); };
    const timeout = window.setTimeout(fail, 20000);
    host.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } catch { /* Altro player presente nella pagina. */ }
      cleanup();
      if (host.YT?.Player) resolve(host.YT); else fail();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
