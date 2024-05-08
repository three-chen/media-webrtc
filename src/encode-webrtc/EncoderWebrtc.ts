const { ipcRenderer, desktopCapturer } = require('electron')

import LiveRTC from './webrtc-encoder-module'

// 编码 webrtc
export class EncoderWebrtc {
  public plat: string
  public room: string
  public url: string
  public ffmpeggProcess: any | undefined = undefined
  public liveRTC: LiveRTC
  public isDesktopStreamCreated: boolean = false

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
    if (!this.isDesktopStreamCreated) {
      ipcRenderer.send('main-desktop-stream', '')

      return new Promise(async (resolve, reject) => {
        ipcRenderer.on('main-desktop-stream-response', async (event: any, arg: any) => {
          const sourceId = arg
          console.log('main-desktop-stream-response', sourceId)
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                // @ts-ignore
                mandatory: {
                  chromeMediaSource: 'desktop'
                }
              },
              video: {
                // @ts-ignore
                mandatory: {
                  chromeMediaSource: 'desktop'
                }
              }
            })
            console.log('stream', stream)
            this.liveRTC.setLocalStream(stream)
            this.liveRTC.connect(this.url)
            this.isDesktopStreamCreated = true
          } catch (e) {
            console.log('getUserMedia error:', e)
          }
          resolve(void 0)
        })
      })
    } else {
      return new Promise(async (resolve, reject) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              // @ts-ignore
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            },
            video: {
              // @ts-ignore
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          })
          console.log('stream', stream)
          this.liveRTC.setLocalStream(stream)
          this.liveRTC.connect(this.url)
        } catch (e) {
          console.log('getUserMedia error:', e)
        }
        resolve(void 0)
      })
    }
  }

  public destroy() {
    this.liveRTC.destroy()
  }
}
