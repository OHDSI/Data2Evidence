function InvalidArgumentException(...args) {
  const error = Error.apply(this, args)

  this.name = 'InvalidArgumentException'
  this.message = error.message
  this.stack = error.stack
}

InvalidArgumentException.prototype = Object.create(Error.prototype)
InvalidArgumentException.prototype.constructor = InvalidArgumentException

export default InvalidArgumentException
