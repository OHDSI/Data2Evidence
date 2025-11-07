export class EmailResponse {
  status: string
  statusDescription: string

  constructor({ status, statusDescription }: EmailResponse) {
    this.status = status
    this.statusDescription = statusDescription
  }
}
