export function getObjectValues(obj: any): any[] {
  const values: any[] = []
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      values.push(value)
    }
  }
  return values
}

/**
 * 生成随机数字或大小写字母的组合，4个一组返回
 */
export function g4(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const maxPos = chars.length
  let g = ''
  for (let i = 0; i < 4; i++) {
    g += chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return g
}
