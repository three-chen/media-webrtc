class EventEmitter {
  private callback: { [eventName: string]: Function[] }
  protected LiveRTCenv: Object | null = null

  public constructor() {
    this.callback = {}
  }

  public on(eventName: string, listener: Function): void {
    this.callback[eventName] = this.callback[eventName] || []
    this.callback[eventName].push(listener)
  }

  public emit(eventName: string, args?: any[]): void {
    const eventCallback = this.callback[eventName]
    if (eventCallback) {
      eventCallback.forEach((callback: Function) => callback.apply(this.LiveRTCenv, args))
    }
  }
}

export default EventEmitter
