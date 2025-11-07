export class EmailMessage {
  to: string
  messageHTML: string
  messageText: string
  result?: string
  error?: string

  constructor({ to, messageHTML, messageText }: EmailMessage) {
    this.to = to
    this.messageHTML = messageHTML
    this.messageText = messageText
  }
}
