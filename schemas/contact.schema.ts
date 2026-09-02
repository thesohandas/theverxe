import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(3).max(30),
  phone: z.string().min(10).max(16),
  message: z.string().max(200).optional(),
})

type ContactSchemaType = z.infer<typeof contactSchema>

export { type ContactSchemaType, contactSchema }
