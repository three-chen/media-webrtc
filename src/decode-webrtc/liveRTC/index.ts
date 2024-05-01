import EventEmitter from './EventEmitter'
import HWebSocket from './hWebSocket/hWebSocket'

import type { RoomSocketEvent, rtcConfig } from './hWebSocket/types'

import { configuration } from './constants'
import { getObjectValues } from './utils'

const PeerConnection = window.RTCPeerConnection

class LiveRTC extends EventEmitter {
  public rtcConfig: rtcConfig = {}

  // 本地的socket
  private socket: HWebSocket | null = null
  //保存所有与本地相连的远程peer connection， 键为socket id，值为PeerConnection类型
  private remotePeerConn: Map<string, RTCPeerConnection> | null = null
  // 保存本地socketId和所有对方的socketId
  private socketId: string = ''
  private connSocketIds: string[] = []

  // 本地流
  private localStream: MediaStream | null = null
  //远程流的id
  private remoteStreams: string[] = []

  public constructor(roomAlias: string, username: string) {
    super()
    // 将EventEmiiter调用的this指定为LiveRTC的this
    this.LiveRTCenv = this
    this.rtcConfig.roomAlias = roomAlias
    this.rtcConfig.userName = username
    this.init()
  }

  public init() {
    this.on('_message', this.handleMessage)
    this.on('_joined', this.handleJoined)
    this.on('_new_peer', this.handleNewPeer)
    this.on('_ready', this.handleReady)
    this.on('_ice_candidate', this.handleIceCandidate)
    this.on('_offer', this.handleOffer)
    this.on('_answer', this.handleAnswer)
    this.on('_remove_peer', this.handleRemovePeer)
    this.on('_create_stream', this.handleCreateStream)
    this.on('_add_stream', this.handleAddStream)
    this.on('_heart_beat', this.handleHeartBeat)
  }

  /**
   * @param wsUrl : websocket url
   *
   */
  connect(wsUrl: string) {
    const that = this
    that.socket = new HWebSocket(wsUrl)
    that.socket.ws.onopen = () => {
      console.log('websocket connected')
      const roomSocketEvent: RoomSocketEvent = {
        eventName: '__joinRoom',
        data: {
          roomAlias: that.rtcConfig.roomAlias,
          // userName: `anony-${g4()}${g4()}-${g4()}${g4()}`
          userName: that.rtcConfig.userName
        }
      }
      that.socket!.ws.send(JSON.stringify(roomSocketEvent))
    }

    that.socket.ws.addEventListener('message', e => {
      const roomSocketEvent: RoomSocketEvent = JSON.parse(e.data)
      that.emit(roomSocketEvent.eventName, getObjectValues(roomSocketEvent.data))
    })

    that.socket.ws.onclose = () => {
      console.log('websocket closed')
    }
  }

  public handleAddStream(socketIds: string[]) {
    const that = this

    if (that.localStream && socketIds) {
      // 拿到remotePeerConn中的socketIds对应的peerConns
      const remotepcs: RTCPeerConnection[] = []
      that.remotePeerConn!.forEach(function (value, key) {
        if (socketIds.includes(key)) {
          remotepcs.push(value)
        }
      })

      for (const remotepc of remotepcs) {
        for (const track of that.localStream.getTracks()) {
          remotepc.addTrack(track, that.localStream)
        }
      }
    } else {
      console.log('stream or peerConn is not ready', this.localStream)
    }
  }

  public async handleCreateStream(constraints?: MediaStreamConstraints) {
    const that = this

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream: MediaStream) => {
        that.localStream = stream

        that.emit('_ready')

        const video = document.createElement('video')
        video.srcObject = stream
        video.setAttribute('class', 'video')
        video.setAttribute('autoplay', 'true')
        video.setAttribute('controls', 'true')
        video.setAttribute('playsinline', 'true')
        video.setAttribute('id', 'local')
        that.rtcConfig.localVideoBox!.appendChild(video)
      })
      .catch(err => {
        console.log(err.name + ': ' + err.message)
      })
  }

  public attachBox(mediaEl: HTMLDivElement, chatEl: HTMLDivElement) {
    this.rtcConfig.localVideoBox = mediaEl
    this.rtcConfig.localChatBox = chatEl
  }

  /**
   *
   * @param socketId 对方的socketId
   * @returns
   */
  public createPeerConnection(socketId: string): RTCPeerConnection {
    const that = this
    const pc = new PeerConnection(configuration)
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        const roomSocketEvent: RoomSocketEvent = {
          eventName: '__ice_candidate',
          data: {
            socketId: socketId, //发送给socketId
            iceCandidate: event.candidate
          }
        }
        // console.log('send ice candidate', roomSocketEvent)

        that.socket!.ws.send(JSON.stringify(roomSocketEvent))
      }
    }
    pc.ontrack = (event: any) => {
      console.log('ontrack steams', event)

      if (that.remoteStreams.indexOf(event.streams[0].id) === -1) {
        const video = document.createElement('video')
        video.srcObject = event.streams[0]
        video.setAttribute('class', 'video')
        video.setAttribute('autoplay', 'true')
        video.setAttribute('controls', 'true')
        video.setAttribute('playsinline', 'true')
        video.setAttribute('id', socketId)
        that.rtcConfig.localVideoBox!.appendChild(video)

        that.remoteStreams.push(event.streams[0].id)
      }
    }
    pc.oniceconnectionstatechange = (event: any) => {
      if (pc.connectionState === 'connected') {
        console.log('peers connected')
      }
    }

    return pc
  }

  public createRemotePeerConnections(socketIds: string[]): Map<string, RTCPeerConnection> {
    const that = this
    const pcs: Map<string, RTCPeerConnection> = new Map()
    for (const socketId of socketIds) {
      const pc = that.createPeerConnection(socketId)
      pcs.set(socketId, pc)
    }
    return pcs
  }

  /**
   *
   * @param socketIds 向数组 socketIds 里的 socket 发送 offer
   */
  public async sendOffer(socketIds: string[]) {
    const that = this

    for (const socketId of socketIds) {
      const pc = that.remotePeerConn!.get(socketId)
      const offer: RTCSessionDescriptionInit = await pc!.createOffer()
      await pc!.setLocalDescription(offer)

      const roomSocketEvent: RoomSocketEvent = {
        eventName: '__offer',
        data: {
          socketId: socketId,
          offer: offer
        }
      }

      that.socket!.ws.send(JSON.stringify(roomSocketEvent))
    }
  }

  public async sendAnswer(socketIds: string[]) {
    const that = this

    for (const socketId of socketIds) {
      const pc = that.remotePeerConn!.get(socketId)
      const answer: RTCSessionDescriptionInit = await pc!.createAnswer()
      await pc!.setLocalDescription(answer)

      const roomSocketEvent: RoomSocketEvent = {
        eventName: '__answer',
        data: {
          socketId: socketId,
          answer: answer
        }
      }

      that.socket!.ws.send(JSON.stringify(roomSocketEvent))
    }
  }

  public sendMessage(message: string) {
    const that = this
    const roomSocketEvent: RoomSocketEvent = {
      eventName: '__message',
      data: {
        message: message
      }
    }

    that.socket!.ws.send(JSON.stringify(roomSocketEvent))
  }

  public handleMessage(userName: string, message: string) {
    const div = document.createElement('div')
    div.innerHTML = `<div>${userName}说：</div><div>${message}</div>`
    this.rtcConfig.localChatBox!.appendChild(div)
  }

  /**
   *
   * @param roomA roomAlias 加入的房间名
   * @param mySocketId 本地的socketId
   * @param connSocketIds 所有远程的socketId
   */
  public async handleJoined(roomA: string, mySocketId: string, connSocketIds: string[]) {
    console.log(roomA, mySocketId, connSocketIds)

    const that = this
    that.rtcConfig.roomAlias = roomA
    that.socketId = mySocketId
    that.connSocketIds = connSocketIds
    that.remotePeerConn = that.createRemotePeerConnections(that.connSocketIds)

    that.emit('_create_stream', [{ audio: true, video: true }])
  }

  /**
   *
   * @param socketId 新增的远程socketId
   */
  public handleNewPeer(socketId: string) {
    const that = this
    that.connSocketIds.push(socketId)
    const rpc = that.createPeerConnection(socketId)
    that.remotePeerConn!.set(socketId, rpc)

    that.emit('_add_stream', [socketId])
  }

  public handleReady() {
    const that = this

    that.emit('_add_stream', [that.connSocketIds])
    that.sendOffer(that.connSocketIds)
  }

  /**
   *
   * @param socketId 发送者的socketId
   * @param iceCandidate 从turn服务器返回ice candidate
   */
  public handleIceCandidate(socketId: string, iceCandidate: RTCIceCandidateInit) {
    const that = this
    const pc = that.remotePeerConn!.get(socketId)
    if (pc) {
      pc.addIceCandidate(iceCandidate)
      console.log('add ice candidate', socketId)
    } else {
      console.log('pc is not exist')
    }
  }

  /**
   *
   * @param socketId 发送者的socketId
   * @param offer 发送来的offer
   */
  public async handleOffer(socketId: string, offer: RTCSessionDescriptionInit) {
    const that = this
    const rpc = that.remotePeerConn!.get(socketId)
    rpc!.setRemoteDescription(offer)

    that.sendAnswer([socketId])
  }

  /**
   *
   * @param socketId 发送者的socketId
   * @param answer 发送来的answer
   */
  public async handleAnswer(socketId: string, answer: RTCSessionDescriptionInit) {
    const that = this
    const rpc = that.remotePeerConn!.get(socketId)
    console.log('handleAnswer', socketId, answer)

    rpc!.setRemoteDescription(answer)
  }

  public disconnect() {
    const that = this
    const roomSocketEvent: RoomSocketEvent = {
      eventName: '__remove_peer',
      data: {}
    }
    that.socket!.ws.send(JSON.stringify(roomSocketEvent))
  }

  public handleRemovePeer(socketId: string) {
    const that = this
    const rpc = that.remotePeerConn!.get(socketId)
    if (rpc) {
      rpc.close()
      that.remotePeerConn!.delete(socketId)
      // 从数组中删除socketId
      const socketIdIndex = that.connSocketIds!.indexOf(socketId)
      if (socketIdIndex !== -1) {
        that.connSocketIds!.splice(socketIdIndex, 1)
        console.log('handleRemovePeer', socketId, '已删除')
      } else {
        console.log('handleRemovePeer', socketId, '不存在')
      }

      // 从 localVideoBox 中删除 video 元素，id 为 socketId
      const videoBox = document.getElementById(socketId)
      if (videoBox) {
        videoBox.parentNode!.removeChild(videoBox)
      }
    }
  }

  public handleHeartBeat(pong: string) {
    const that = this
    that.socket!.resetHeartBeat()
    console.log('heart beat', pong)
  }
}

export default LiveRTC
