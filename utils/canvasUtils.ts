export function getCoordinates(event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement | null, isTouch: boolean = false) {
    if (!canvas) return { x: 0, y: 0 }
  
    let x = 0
    let y = 0
  
    const rect = canvas.getBoundingClientRect()
    if (isTouch) {
      const touch = (event as TouchEvent).touches[0]
      x = (touch.clientX - rect.left) / rect.width
      y = (touch.clientY - rect.top) / rect.height
    } else {
      x = ((event as MouseEvent).clientX - rect.left) / rect.width
      y = ((event as MouseEvent).clientY - rect.top) / rect.height
    }
  
    return { x, y }
}
  
export function drawLine(ctx: CanvasRenderingContext2D | null, lineData: { startX: number; startY: number; endX: number; endY: number }) {
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(lineData.startX, lineData.startY)
      ctx.lineTo(lineData.endX, lineData.endY)
      ctx.stroke()
    }
}
