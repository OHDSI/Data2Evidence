export class AnnotationError extends Error {
  constructor(public message: string) {
    super(message)
    this.name = 'MRIAnnotationError'
  }
}
