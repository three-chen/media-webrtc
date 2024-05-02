const { ipcRenderer, desktopCapturer } = require('electron')

import LiveRTC from './webrtc-encoder-module'

// 编码 webrtc
export class EncoderWebrtc {
  public plat: string
  public room: string
  public url: string
  public ffmpeggProcess: any | undefined = undefined
  public liveRTC: LiveRTC

  constructor(plat: string, room: string) {
    this.plat = plat
    this.room = room
    this.url = `ws://localhost:4000`
    this.liveRTC = new LiveRTC(this.room)
  }

  public async runWithExec(command: string, channel: string) {
    ipcRenderer.send(channel, command)
  }

  public async runWithSpawn(command: string, args: string[]) {
    ipcRenderer.send('ffmpegCommandSpawn', JSON.stringify({ command, args }))
  }

  public async cameraStreamSpawn() {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then((stream: MediaStream) => {
        this.liveRTC.setLocalStream(stream)
        this.liveRTC.connect(this.url)
      })
      resolve(void 0)
    })
  }

  public async desktopStreamSpawn() {
    console.log('desktopStreamSpawn desktopCapturer', desktopCapturer)
    ipcRenderer.send('main-desktop-stream', '')

    return new Promise((resolve, reject) => {
      ipcRenderer.on('main-desktop-stream-response', async (event: any, arg: any) => {
        const sourceId = arg
        console.log('main-desktop-stream-response', sourceId)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            // audio: false,
            // video: {
            //   mandatory: {
            //     chromeMediaSource: 'desktop',
            //     chromeMediaSourceId: sourceId,
            //     minWidth: 1280,
            //     maxWidth: 1280,
            //     minHeight: 720,
            //     maxHeight: 720
            //   }
            // }
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          })
          console.log('stream', stream)
          this.liveRTC.setLocalStream(stream)
          // console.log(document.getElementsByClassName('video')[0])
          // ;(document.getElementsByClassName('video')[0] as HTMLVideoElement).srcObject = stream
          this.liveRTC.connect(this.url)
        } catch (e) {
          console.log('getUserMedia error:', e)
        }
        resolve(void 0)
      })
    })
    // this.liveRTC.connect(this.url)
  }

  public destroy() {
    // if (this.ffmpegProcess) {
    //   this.ffmpegProcess.kill('SIGINT')
    // }
  }
}
