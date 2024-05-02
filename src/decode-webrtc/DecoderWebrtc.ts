import LiveRTC from './webrtc-decoder-module'

// 解码httpflv
export class DecoderWebrtc {
  public container: HTMLVideoElement | undefined = undefined
  public room: string | undefined = undefined
  public url: string = 'ws://localhost:4000'
  public player: LiveRTC | null = null

  public static isSupported() {
    if (window.RTCPeerConnection) {
      return true
    }
    return false
  }

  constructor(room: string, container: HTMLVideoElement | undefined = undefined) {
    if (room) {
      this.room = room
      this.url = `ws://localhost:4000`
      this.player = new LiveRTC(this.room)
    }
    if (container) {
      this.setContainer(container)
    }
  }

  public setContainer(container: HTMLVideoElement): void {
    this.container = container
    this.attachMediaElement()
  }

  public attachMediaElement() {
    if (this.container && this.player) {
      this.player.attachMediaElement(this.container)
    }
  }

  public loadAndPlay() {
    this.player?.connect(this.url)
    // this.player?.load()
    // this.player?.play()
  }

  public detachMediaElement() {
    // this.player?.detachMediaElement()
    // this.player?.unload()
  }

  public destroy() {
    this.detachMediaElement()
    // this.player?.destroy()
  }
}
