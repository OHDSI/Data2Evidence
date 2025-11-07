import { EmailResponse } from '../dtos'
import { Service } from 'typedi'
import { createLogger } from '../Logger'
import { EmailTemplateRequest } from '../types'

@Service()
export class EmailService {
  private readonly logger = createLogger(this.constructor.name)

  async send({ toEmail, templateId, data }: EmailTemplateRequest): Promise<EmailResponse> {
    return new Promise<EmailResponse>((resolve, reject) => {
      resolve(new EmailResponse({ status: 'EMAIL_NOT_SENT', statusDescription: 'error' }))
    })
  }
}
