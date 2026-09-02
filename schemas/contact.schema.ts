import { z } from "zod"

const noControlChars = (value: string) => {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return false
    }
  }
  return true
}

const nameSchema = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(30, "Name must be at most 30 characters")
  .refine(noControlChars, "Name contains invalid characters")
  .refine(
    (value) => !/\s{2,}/.test(value),
    "Name cannot contain consecutive spaces",
  )
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}' .-]{2,29}$/u,
    "Name contains invalid characters",
  )

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .max(20, "Phone number is too long")
  .refine(noControlChars, "Phone number contains invalid characters")
  .transform((value) => value.replace(/[^\d+]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"))

const messageSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}, z
  .string()
  .max(150, "Message must be at most 150 characters")
  .refine(noControlChars, "Message contains invalid characters")
  .optional())

const contactSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    message: messageSchema,
  })
  .strict()

type ContactSchemaType = z.infer<typeof contactSchema>

export { type ContactSchemaType, contactSchema }
