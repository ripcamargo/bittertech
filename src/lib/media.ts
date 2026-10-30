export type VideoSource =
  | { kind: 'embed'; src: string }
  | { kind: 'file'; src: string }

/** Aceita link do YouTube, do Vimeo ou o caminho de um arquivo de vídeo local. */
export function parseVideo(url: string): VideoSource {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` }
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` }
  return { kind: 'file', src: url }
}
