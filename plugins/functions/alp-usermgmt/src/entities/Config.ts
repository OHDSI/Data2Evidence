export class Config {
  public code: string
  public value: string

  constructor({ code, value }: Config) {
    this.code = code
    this.value = value
  }
}
