const MIN_COL_WIDTH = 100

function preventEvent(e) {
  const ev = e || window.event
  if (ev.preventDefault) {
    ev.preventDefault()
  } else {
    ev.returnValue = false
  }
  if (ev.stopPropagation) {
    ev.stopPropagation()
  }
  return false
}

function getWidth(x) {
  let y
  if (x.currentStyle) {
    y = x.clientWidth - parseInt(x.currentStyle.paddingLeft, 10) - parseInt(x.currentStyle.paddingRight, 10)
  } else if (window.getComputedStyle) {
    y = document.defaultView.getComputedStyle(x).getPropertyValue('width')
  }
  return y || 0
}

function findParent(el, tag) {
  if (el === document.body) {
    return el
  }

  let current = el.parentElement
  while (current.tagName !== tag && current !== document.body) {
    current = current.parentElement
  }

  return current
}

function createGripper() {
  const gripper = document.createElement('div')
  gripper.className = 'divColResizeGripper'
  gripper.innerHTML = '&nbsp;'
  return gripper
}

function computeCellWidth(width, cell: HTMLElement) {
  const startWidth = parseInt(getWidth(cell), 10)
  return startWidth + width
}

// main class prototype
class ColumnResize {
  public cb: any
  public targetCell: any // cell that will be resized
  public dragX: any // last event X mouse coordinate
  public container: HTMLElement
  public gripper: HTMLElement
  public initialContainerWidth: number

  public saveOnmouseup: any // save document onmouseup event handler
  public saveOnmousemove: any // save document onmousemove event handler
  public saveBodyCursor: any // save body cursor property
  constructor({ el, cb }) {
    if (el.tagName !== 'THEAD') {
      return
    }
    this.cb = cb

    // get nearest parent div. Gripper will be added to this container
    this.container = findParent(el, 'DIV')

    // gripper position is absolute
    this.container.style.position = 'relative'

    this.targetCell = null // cell that will be resized
    this.dragX = null // last event X mouse coordinate

    this.saveOnmouseup = null // save document onmouseup event handler
    this.saveOnmousemove = null // save document onmousemove event handler
    this.saveBodyCursor = null // save body cursor property

    // prepare table header to be draggable
    // it runs during class creation
    el.addEventListener(
      'mousedown',
      event => {
        if (event.target.classList.contains('headerGrip')) {
          this.createGripper()
          this.targetCell = findParent(event.target, 'TH')

          // if interaction cell is clicked, look for the last attribute to resize instead
          if (!this.targetCell.getAttribute('data-parent-path')) {
            const parentPath = this.targetCell.getAttribute('data-path')
            const nodes = document.querySelectorAll(`[data-parent-path="${parentPath}"]`)

            if (nodes.length > 0) {
              this.targetCell = nodes.item(nodes.length - 1)
            }
          }

          this.startColumnDrag.call(this, event)
        }
      },
      false
    )
  }

  // ============================================================
  // methods

  public resizeContainer(addWidth) {
    this.container.style.width = `${this.initialContainerWidth + addWidth}px`
  }

  // ============================================================
  // do drag column width
  public columnDrag(evt) {
    const e = evt || window.event
    const X = e.clientX || e.pageX
    const relativeX = X - this.container.getBoundingClientRect().left
    this.gripper.style.left = `${relativeX}px`

    // // the difference between stop and start column drag
    // const widthChange = relativeX - this.dragX;
    // // tslint:disable-next-line:no-console
    // console.log(widthChange);
    // this.resizeContainer(widthChange < 0 ? 0 : widthChange);
    preventEvent(e)
    return false
  }

  // ============================================================
  // stops column dragging
  public stopColumnDrag(evt) {
    const e = evt || window.event

    // location where mouse stopped
    const X = e.clientX || e.pageX

    // restore handlers & cursor
    document.onmouseup = this.saveOnmouseup
    document.onmousemove = this.saveOnmousemove
    document.body.style.cursor = this.saveBodyCursor

    // the difference between stop and start column drag
    const widthChange = X - this.container.getBoundingClientRect().left - this.dragX

    // stop location is less than start location, dont update width
    // if (widthChange > 0) {

    let newCellWidth = computeCellWidth(widthChange, this.targetCell)

    if (newCellWidth > 0) {
      newCellWidth = newCellWidth < MIN_COL_WIDTH ? MIN_COL_WIDTH : newCellWidth
      const oldCellWidth = this.targetCell.getBoundingClientRect().width
      this.targetCell.style.width = `${newCellWidth}px`
      const resizedCellWidth = this.targetCell.getBoundingClientRect().width

      // Check if the width really changed, if not, do not resize container;
      if (oldCellWidth !== resizedCellWidth) {
        // change the width of the container first before changing the widths inside the table
        this.resizeContainer(widthChange)
        this.cb(this.targetCell)
      } else {
        // rolback width
        this.resizeContainer(0)
      }
    }

    this.gripper.parentNode.removeChild(this.gripper)
    preventEvent(e)
  }

  // ============================================================
  // init data and start dragging
  public startColumnDrag(evt) {
    const e = evt || window.event

    // remember dragging object
    this.dragX = e.clientX || e.pageX
    this.dragX = this.dragX - this.container.getBoundingClientRect().left

    // remember width of container so it can be restored later if needed
    this.initialContainerWidth = this.container.getBoundingClientRect().width

    this.gripper.style.left = `${this.dragX}px`

    this.saveOnmouseup = document.onmouseup
    document.onmouseup = this.stopColumnDrag.bind(this)

    this.saveBodyCursor = document.body.style.cursor
    document.body.style.cursor = 'w-resize'

    // fire!
    this.saveOnmousemove = document.onmousemove
    document.onmousemove = this.columnDrag.bind(this)

    preventEvent(e)
  }

  private createGripper() {
    this.gripper = createGripper()
    this.container.appendChild(this.gripper)
  }
}

export default {
  mounted(el, { value }: { value?: () => void }) {
    if (!value) {
      return
    }
    return new ColumnResize({ el, cb: value })
  },
}
