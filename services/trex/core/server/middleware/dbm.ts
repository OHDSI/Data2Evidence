import { validator } from 'npm:hono/validator'

export const isValidDbDto = validator('json', (value, c) => {
    const dbCode = value.code || value.id;
    const r = RegExp(/^[A-Za-z0-9_]+$/)
    return r.test(dbCode) ? value : c.text('Database code invalid', 400)
})