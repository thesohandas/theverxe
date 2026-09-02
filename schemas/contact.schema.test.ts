import { describe, expect, it } from "bun:test"
import { type ContactSchemaType, contactSchema } from "./contact.schema"

const validBase = {
  name: "Sohan Das",
  phone: "9876543210",
} satisfies Record<string, unknown>

function parseContact(data: unknown) {
  return contactSchema.safeParse(data)
}

function expectValid(data: unknown, expected: ContactSchemaType) {
  const result = parseContact(data)
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).toEqual(expected)
  }
}

function expectInvalid(data: unknown, messageSubstring?: string) {
  const result = parseContact(data)
  expect(result.success).toBe(false)
  if (!result.success && messageSubstring) {
    const messages = result.error.issues.map((issue) => issue.message).join(" ")
    expect(messages).toContain(messageSubstring)
  }
}

function expectInvalidPath(data: unknown, path: (string | number)[]) {
  const result = parseContact(data)
  expect(result.success).toBe(false)
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path.join("."))
    expect(paths).toContain(path.join("."))
  }
}

describe("contactSchema", () => {
  describe("valid payloads", () => {
    it("accepts a minimal payload with required fields only", () => {
      expectValid(validBase, {
        name: "Sohan Das",
        phone: "9876543210",
      })
    })

    it("accepts a payload with a message", () => {
      expectValid(
        { ...validBase, message: "Looking forward to connecting." },
        {
          name: "Sohan Das",
          phone: "9876543210",
          message: "Looking forward to connecting.",
        },
      )
    })

    it("trims leading and trailing whitespace from all string fields", () => {
      expectValid(
        {
          name: "  Lisa Ann  ",
          phone: "  +91 98765 43210  ",
          message: "  Hello there  ",
        },
        {
          name: "Lisa Ann",
          phone: "+919876543210",
          message: "Hello there",
        },
      )
    })

    it("normalizes formatted phone numbers", () => {
      const formattedPhones = [
        "+91 98765 43210",
        "(987) 654-3210",
        "987-654-3210",
        "987.654.3210",
        "+1 (415) 555-2671",
      ]

      for (const phone of formattedPhones) {
        const result = parseContact({ name: "Alex Morgan", phone })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toMatch(/^\+?[1-9]\d{9,14}$/)
        }
      }
    })

    it("accepts unicode names", () => {
      const names = ["José", "Müller", "Åsa", "नमन", "محمد"]

      for (const name of names) {
        expectValid(
          { name, phone: "9876543210" },
          { name, phone: "9876543210" },
        )
      }
    })

    it("accepts allowed punctuation in names", () => {
      const names = ["Mary-Jane", "O'Connor", "Dr. Smith"]

      for (const name of names) {
        expectValid(
          { name, phone: "9876543210" },
          { name, phone: "9876543210" },
        )
      }
    })

    it("accepts names at the minimum and maximum length boundaries", () => {
      expectValid(
        { name: "Ann", phone: "9876543210" },
        { name: "Ann", phone: "9876543210" },
      )
      expectValid(
        { name: "A".repeat(30), phone: "9876543210" },
        { name: "A".repeat(30), phone: "9876543210" },
      )
    })

    it("accepts phone numbers at digit-count boundaries", () => {
      expectValid(
        { name: "Sohan Das", phone: "1234567890" },
        { name: "Sohan Das", phone: "1234567890" },
      )
      expectValid(
        { name: "Sohan Das", phone: "+123456789012345" },
        { name: "Sohan Das", phone: "+123456789012345" },
      )
    })

    it("accepts messages at the maximum length boundary", () => {
      const message = "m".repeat(150)
      expectValid({ ...validBase, message }, { ...validBase, message })
    })

    it("omits blank optional messages", () => {
      for (const message of ["", "   ", "\t", "\n"]) {
        expectValid({ ...validBase, message }, validBase)
      }
    })

    it("treats null and undefined message values as omitted", () => {
      expectValid({ ...validBase, message: null }, validBase)
      expectValid({ ...validBase, message: undefined }, validBase)
    })
  })

  describe("name validation", () => {
    it("rejects names that are too short", () => {
      expectInvalid(
        { name: "Bo", phone: "9876543210" },
        "at least 3 characters",
      )
      expectInvalid({ name: "", phone: "9876543210" }, "at least 3 characters")
      expectInvalid(
        { name: "  Al  ", phone: "9876543210" },
        "at least 3 characters",
      )
    })

    it("rejects names that are too long", () => {
      expectInvalid(
        { name: "A".repeat(31), phone: "9876543210" },
        "at most 30 characters",
      )
    })

    it("rejects names with consecutive spaces", () => {
      expectInvalid(
        { name: "Mary  Jane", phone: "9876543210" },
        "consecutive spaces",
      )
    })

    it("rejects names with disallowed characters", () => {
      const invalidNames = [
        "John3",
        "John@Doe",
        "#Sohan",
        "Sohan!",
        "<script>",
        "John_Doe",
      ]

      for (const name of invalidNames) {
        expectInvalid({ name, phone: "9876543210" }, "invalid characters")
      }
    })

    it("rejects names containing blocked control characters", () => {
      const controlCharacters = [
        "\u0000",
        "\u0008",
        "\u000b",
        "\u000c",
        "\u000e",
        "\u001f",
        "\u007f",
      ]

      for (const controlCharacter of controlCharacters) {
        expectInvalid(
          { name: `So${controlCharacter}han`, phone: "9876543210" },
          "invalid characters",
        )
      }
    })

    it("rejects non-string names", () => {
      expectInvalid({ name: 123, phone: "9876543210" })
      expectInvalid({ name: null, phone: "9876543210" })
      expectInvalid({ name: ["Sohan"], phone: "9876543210" })
    })
  })

  describe("phone validation", () => {
    it("rejects missing and blank phone numbers", () => {
      expectInvalid({ name: "Sohan Das" })
      expectInvalid({ name: "Sohan Das", phone: "" }, "required")
      expectInvalid({ name: "Sohan Das", phone: "   " }, "required")
    })

    it("rejects phone numbers that are too long before normalization", () => {
      expectInvalid({ name: "Sohan Das", phone: "1".repeat(21) }, "too long")
    })

    it("rejects phone numbers with too few digits after normalization", () => {
      expectInvalid(
        { name: "Sohan Das", phone: "123456789" },
        "Invalid phone number",
      )
    })

    it("rejects phone numbers with too many digits after normalization", () => {
      expectInvalid(
        { name: "Sohan Das", phone: "1234567890123456" },
        "Invalid phone number",
      )
    })

    it("rejects phone numbers that do not start with a non-zero digit", () => {
      expectInvalid(
        { name: "Sohan Das", phone: "0987654321" },
        "Invalid phone number",
      )
      expectInvalid(
        { name: "Sohan Das", phone: "+0987654321" },
        "Invalid phone number",
      )
    })

    it("rejects alphabetic and symbolic phone values", () => {
      const invalidPhones = [
        "call-me-maybe",
        "phone-number",
        "++++++++++++",
        "abc1234567",
      ]

      for (const phone of invalidPhones) {
        expectInvalid({ name: "Sohan Das", phone }, "Invalid phone number")
      }
    })

    it("rejects phone numbers containing blocked control characters", () => {
      expectInvalid(
        { name: "Sohan Das", phone: "98765\u000043210" },
        "invalid characters",
      )
    })

    it("rejects non-string phone values", () => {
      expectInvalid({ name: "Sohan Das", phone: 9876543210 })
      expectInvalid({ name: "Sohan Das", phone: null })
      expectInvalid({ name: "Sohan Das", phone: ["9876543210"] })
    })
  })

  describe("message validation", () => {
    it("rejects messages longer than 150 characters", () => {
      expectInvalid(
        { ...validBase, message: "x".repeat(151) },
        "at most 150 characters",
      )
      expectInvalid(
        { ...validBase, message: `  ${"x".repeat(151)}  ` },
        "at most 150 characters",
      )
    })

    it("rejects messages containing real (byte-level) control characters", () => {
      expectInvalid(
        { ...validBase, message: "Hello\u0000world" },
        "invalid characters",
      )
      expectInvalid(
        { ...validBase, message: "Hello\u007fworld" },
        "invalid characters",
      )
    })

    it("rejects non-string message values", () => {
      expectInvalid({ ...validBase, message: 42 })
      expectInvalid({ ...validBase, message: { text: "hello" } })
      expectInvalid({ ...validBase, message: ["hello"] })
    })
  })

  describe("object-level validation", () => {
    it("rejects unknown keys because the schema is strict", () => {
      expectInvalid({ ...validBase, admin: true }, "Unrecognized key")
      expectInvalid({ ...validBase, extra: "field" }, "Unrecognized key")
    })

    it("rejects missing required fields and reports the correct field path", () => {
      expectInvalidPath({ phone: "9876543210" }, ["name"])
      expectInvalidPath({ name: "Sohan Das" }, ["phone"])
    })

    it("rejects non-object payloads", () => {
      expectInvalid(null)
      expectInvalid(undefined)
      expectInvalid("not-an-object")
      expectInvalid(42)
      expectInvalid([])
      expectInvalid(validBase.name)
    })

    it("rejects an empty object", () => {
      expectInvalid({})
    })
  })
})
