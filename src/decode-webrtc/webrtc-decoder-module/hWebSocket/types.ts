interface DataInfo {
  roomAlias?: string //房间名
  message?: string //要发送的消息
  socketId?: string //创建的socketId
  connSocketIds?: string[] //所有对方连接的socketId数组
  offer?: any //sdp offer
  answer?: any //sdp answer
  iceCandidate?: any // ice candidate
}

export interface RoomSocketEvent {
  eventName: string
  data: DataInfo
}

export interface rtcConfig {
  // 房间名
  roomAlias?: string
  // 用户名
  socketId?: string
  // 本地视频元素
  localVideoEl?: HTMLVideoElement
}
