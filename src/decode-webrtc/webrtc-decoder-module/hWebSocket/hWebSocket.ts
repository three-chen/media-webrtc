import type { RoomSocketEvent } from './types'

// websocket with heart beat
class HWebSocket {
  public ws: WebSocket
  // 心跳间隔 55 秒
  private heartBeatGap: number
  // 超时时间 5 秒
  private timeoutInterval: number
  // heartBeatTimeout 标识
  private heartBeatTimeout: NodeJS.Timeout | null = null
  // 未在timeout时间内返回pong，则断开连接或恢复连接
  private timeout: NodeJS.Timeout | null = null

  constructor(url: string, heartBeatI: number = 55 * 1000) {
    this.ws = new WebSocket(url)
    this.heartBeatGap = heartBeatI
    this.timeoutInterval = 5 * 1000

    this.startHearBeat()
    this.ws.addEventListener('message', () => {
      this.resetHeartBeat()
    })
  }

  public startHearBeat() {
    const that = this
    console.log('startHearBeat')

    that.heartBeatTimeout = setTimeout(() => {
      that.sendHeartBeat()
    }, this.heartBeatGap)
  }

  public sendHeartBeat() {
    const that = this
    const roomSocketEvent: RoomSocketEvent = {
      eventName: '__heart_beat',
      data: {
        message: 'ping'
      }
    }
    console.log('send ping')

    that.ws.send(JSON.stringify(roomSocketEvent))
    that.timeout = setTimeout(() => {
      that.clear()
    }, that.timeoutInterval)
  }

  public resetHeartBeat() {
    const that = this
    clearTimeout(that.heartBeatTimeout!)
    clearTimeout(that.timeout!)
    that.heartBeatTimeout = setTimeout(() => {
      that.sendHeartBeat()
    }, that.heartBeatGap)
  }

  public clear() {
    const that = this
    clearTimeout(that.heartBeatTimeout!)
    clearTimeout(that.timeout!)
    console.log('我删的')

    that.ws.close()
  }
}

export default HWebSocket
