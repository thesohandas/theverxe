import { describe, expect, it } from "bun:test"
import { type ContactSchemaType, contactSchema } from "./contact.schema"

/**
 * Mirrors what the contact form always POSTs as JSON:
 * `{ name, phone, message }` — message may be an empty string.
 */
function formPayload(
  overrides: Partial<{ name: string; phone: string; message: string }> = {},
) {
  return {
    name: "Sohan Das",
    phone: "9876543210",
    message: "",
    ...overrides,
  }
}

function parse(data: unknown) {
  return contactSchema.safeParse(data)
}

function expectValid(data: unknown, expected: ContactSchemaType) {
  const result = parse(data)
  expect(result.success).toBe(true)
  if (!result.success) return
  // Compare the JSON wire shape the API would actually emit
  // (JSON.stringify drops `undefined` values).
  expect(JSON.parse(JSON.stringify(result.data))).toEqual(expected)
}

function expectInvalid(
  data: unknown,
  options: {
    path?: (string | number)[]
    message?: string
  } = {},
) {
  const result = parse(data)
  expect(result.success).toBe(false)
  if (result.success) return

  if (options.path) {
    const paths = result.error.issues.map((issue) => issue.path.join("."))
    expect(paths).toContain(options.path.join("."))
  }

  if (options.message) {
    const messages = result.error.issues
      .map((issue) => issue.message)
      .join("\n")
    expect(messages).toContain(options.message)
  }
}

describe("contactSchema", () => {
  describe("form payload shape", () => {
    it("accepts the exact JSON body the form sends with an empty message", () => {
      expectValid(formPayload(), {
        name: "Sohan Das",
        phone: "9876543210",
      })
    })

    it("accepts the exact JSON body the form sends with a filled message", () => {
      expectValid(formPayload({ message: "Looking forward to connecting." }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "Looking forward to connecting.",
      })
    })

    it("never returns keys other than name, phone, and message", () => {
      const result = parse(formPayload({ message: "Hello from the form." }))
      expect(result.success).toBe(true)
      if (!result.success) return
      for (const key of Object.keys(result.data)) {
        expect(["name", "phone", "message"]).toContain(key)
      }
    })

    it("rejects unexpected fields (mass-assignment / probe keys)", () => {
      const probes = [
        JSON.parse(
          '{"name":"Sohan Das","phone":"9876543210","message":"","admin":true}',
        ),
        JSON.parse(
          '{"name":"Sohan Das","phone":"9876543210","message":"","__proto__":{"x":1}}',
        ),
        JSON.parse(
          '{"name":"Sohan Das","phone":"9876543210","message":"","constructor":{"x":1}}',
        ),
      ]

      for (const payload of probes) {
        expectInvalid(payload, { message: "Unrecognized key" })
      }
    })
  })

  describe("name", () => {
    it("trims surrounding whitespace before validating length", () => {
      expectValid(formPayload({ name: "  Lisa Ann  " }), {
        name: "Lisa Ann",
        phone: "9876543210",
      })
    })

    it("accepts unicode letters and names with accents", () => {
      for (const name of ["José", "Müller", "Åsa", "नमन", "محمد"]) {
        expectValid(formPayload({ name }), {
          name,
          phone: "9876543210",
        })
      }
    })

    it("accepts allowed punctuation (hyphen, apostrophe, period, single spaces)", () => {
      for (const name of ["Mary-Jane", "O'Connor", "Dr. Smith"]) {
        expectValid(formPayload({ name }), {
          name,
          phone: "9876543210",
        })
      }
    })

    it("accepts the min and max length boundaries (3 and 30)", () => {
      expectValid(formPayload({ name: "Ann" }), {
        name: "Ann",
        phone: "9876543210",
      })
      expectValid(formPayload({ name: "A".repeat(30) }), {
        name: "A".repeat(30),
        phone: "9876543210",
      })
    })

    it("rejects missing, blank, and too-short names", () => {
      expectInvalid({ phone: "9876543210", message: "" }, { path: ["name"] })
      expectInvalid(formPayload({ name: "" }), {
        path: ["name"],
        message: "at least 3 characters",
      })
      expectInvalid(formPayload({ name: "  Al  " }), {
        path: ["name"],
        message: "at least 3 characters",
      })
      expectInvalid(formPayload({ name: "Bo" }), {
        path: ["name"],
        message: "at least 3 characters",
      })
    })

    it("rejects names longer than 30 characters", () => {
      expectInvalid(formPayload({ name: "A".repeat(31) }), {
        path: ["name"],
        message: "at most 30 characters",
      })
    })

    it("rejects consecutive spaces", () => {
      expectInvalid(formPayload({ name: "Mary  Jane" }), {
        path: ["name"],
        message: "consecutive spaces",
      })
    })

    it("rejects names that do not start with a letter", () => {
      for (const name of ["-Ann", "'Connor", ".Smith", "3ohn"]) {
        expectInvalid(formPayload({ name }), {
          path: ["name"],
          message: "invalid characters",
        })
      }
    })

    it("rejects digits, symbols, HTML, and underscores", () => {
      for (const name of [
        "John3",
        "John@Doe",
        "#Sohan",
        "Sohan!",
        "<script>",
        "John_Doe",
      ]) {
        expectInvalid(formPayload({ name }), {
          path: ["name"],
          message: "invalid characters",
        })
      }
    })

    it("rejects invisible / formatting unicode in names", () => {
      for (const name of [
        "So\u200Bhan", // zero-width space
        "Mary\u00A0Jane", // nbsp
        "So\u202Ehan", // RTL override
      ]) {
        expectInvalid(formPayload({ name }), {
          path: ["name"],
          message: "invalid characters",
        })
      }
    })

    it("rejects emoji in names", () => {
      expectInvalid(formPayload({ name: "Bob😀" }), {
        path: ["name"],
        message: "invalid characters",
      })
    })

    it("rejects C0/C1 control characters in names", () => {
      for (const control of [
        "\u0000",
        "\u0008",
        "\u000b",
        "\u000c",
        "\u000e",
        "\u001f",
        "\u007f",
      ]) {
        expectInvalid(formPayload({ name: `So${control}han` }), {
          path: ["name"],
          message: "invalid characters",
        })
      }
    })

    it("rejects non-string name values", () => {
      expectInvalid(
        { name: 123, phone: "9876543210", message: "" },
        {
          path: ["name"],
        },
      )
      expectInvalid(
        { name: null, phone: "9876543210", message: "" },
        {
          path: ["name"],
        },
      )
      expectInvalid(
        { name: ["Sohan"], phone: "9876543210", message: "" },
        {
          path: ["name"],
        },
      )
      expectInvalid(
        { name: true, phone: "9876543210", message: "" },
        {
          path: ["name"],
        },
      )
    })
  })

  describe("phone", () => {
    it("trims and normalizes common formatting to digits with optional leading +", () => {
      const cases: Array<[string, string]> = [
        ["+91 98765 43210", "+919876543210"],
        ["(987) 654-3210", "9876543210"],
        ["987-654-3210", "9876543210"],
        ["987.654.3210", "9876543210"],
        ["+1 (415) 555-2671", "+14155552671"],
        ["  +91 98765 43210  ", "+919876543210"],
      ]

      for (const [input, expected] of cases) {
        expectValid(formPayload({ phone: input }), {
          name: "Sohan Das",
          phone: expected,
        })
      }
    })

    it("accepts digit-count boundaries (10 and 15 digits, with and without +)", () => {
      expectValid(formPayload({ phone: "1234567890" }), {
        name: "Sohan Das",
        phone: "1234567890",
      })
      expectValid(formPayload({ phone: "+1234567890" }), {
        name: "Sohan Das",
        phone: "+1234567890",
      })
      expectValid(formPayload({ phone: "+123456789012345" }), {
        name: "Sohan Das",
        phone: "+123456789012345",
      })
    })

    it("rejects missing and blank phone numbers", () => {
      expectInvalid({ name: "Sohan Das", message: "" }, { path: ["phone"] })
      expectInvalid(formPayload({ phone: "" }), {
        path: ["phone"],
        message: "required",
      })
      expectInvalid(formPayload({ phone: "   " }), {
        path: ["phone"],
        message: "required",
      })
    })

    it("rejects phones that are too long before normalization", () => {
      expectInvalid(formPayload({ phone: "1".repeat(21) }), {
        path: ["phone"],
        message: "too long",
      })
    })

    it("rejects phones with too few or too many digits after normalization", () => {
      expectInvalid(formPayload({ phone: "123456789" }), {
        path: ["phone"],
        message: "Invalid phone number",
      })
      expectInvalid(formPayload({ phone: "1234567890123456" }), {
        path: ["phone"],
        message: "Invalid phone number",
      })
      expectInvalid(formPayload({ phone: "1 2 3 4 5 6 7 8 9" }), {
        path: ["phone"],
        message: "Invalid phone number",
      })
    })

    it("rejects phones that start with 0 after normalization", () => {
      expectInvalid(formPayload({ phone: "0987654321" }), {
        path: ["phone"],
        message: "Invalid phone number",
      })
      expectInvalid(formPayload({ phone: "+0987654321" }), {
        path: ["phone"],
        message: "Invalid phone number",
      })
    })

    it("rejects phones that are only punctuation or have a misplaced +", () => {
      for (const phone of [
        "() - .",
        "++++++++++++",
        "12+34567890",
        "++919876543210",
        "call-me-maybe",
        "abc1234567",
      ]) {
        expectInvalid(formPayload({ phone }), {
          path: ["phone"],
          message: "Invalid phone number",
        })
      }
    })

    it("rejects control characters in phone numbers", () => {
      expectInvalid(formPayload({ phone: "98765\u000043210" }), {
        path: ["phone"],
        message: "invalid characters",
      })
    })

    it("rejects non-string phone values", () => {
      expectInvalid(
        { name: "Sohan Das", phone: 9876543210, message: "" },
        {
          path: ["phone"],
        },
      )
      expectInvalid(
        { name: "Sohan Das", phone: null, message: "" },
        {
          path: ["phone"],
        },
      )
      expectInvalid(
        { name: "Sohan Das", phone: ["9876543210"], message: "" },
        { path: ["phone"] },
      )
    })
  })

  describe("message", () => {
    it("treats blank / whitespace-only messages as absent on the JSON wire", () => {
      for (const message of ["", "   ", "\t", "\n", "\r\n"]) {
        expectValid(formPayload({ message }), {
          name: "Sohan Das",
          phone: "9876543210",
        })
      }
    })

    /**
     * TDD: optional blanks must drop the key entirely — not leave
     * `message: undefined` on the parsed object.
     * Expected to FAIL until the schema strips omitted optionals.
     */
    it("omits the message property entirely when blank (no undefined key)", () => {
      const cases: unknown[] = [
        formPayload({ message: "" }),
        formPayload({ message: "   " }),
        { name: "Sohan Das", phone: "9876543210", message: null },
        { name: "Sohan Das", phone: "9876543210" },
      ]

      for (const payload of cases) {
        const result = parse(payload)
        console.log(payload)
        expect(result.success).toBe(true)
        if (!result.success) continue
        expect(Object.hasOwn(result.data, "message")).toBe(false)
      }
    })

    it("treats null and undefined message as absent on the JSON wire", () => {
      expectValid(
        { name: "Sohan Das", phone: "9876543210", message: null },
        { name: "Sohan Das", phone: "9876543210" },
      )
      expectValid(
        { name: "Sohan Das", phone: "9876543210", message: undefined },
        { name: "Sohan Das", phone: "9876543210" },
      )
      expectValid(
        { name: "Sohan Das", phone: "9876543210" },
        { name: "Sohan Das", phone: "9876543210" },
      )
    })

    it("trims surrounding whitespace from messages", () => {
      expectValid(formPayload({ message: "  Hello there  " }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "Hello there",
      })
    })

    it("accepts messages at the 150-character boundary", () => {
      const message = "m".repeat(150)
      expectValid(formPayload({ message }), {
        name: "Sohan Das",
        phone: "9876543210",
        message,
      })
    })

    it("rejects messages longer than 150 characters (including after trim)", () => {
      expectInvalid(formPayload({ message: "x".repeat(151) }), {
        path: ["message"],
        message: "at most 150 characters",
      })
      expectInvalid(formPayload({ message: `  ${"x".repeat(151)}  ` }), {
        path: ["message"],
        message: "at most 150 characters",
      })
    })

    it("stores HTML-looking text as plain text (no interpretation)", () => {
      const message = "<script>alert(1)</script>"
      expectValid(formPayload({ message }), {
        name: "Sohan Das",
        phone: "9876543210",
        message,
      })
    })

    it("allows emoji in messages", () => {
      expectValid(formPayload({ message: "hi 👋" }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "hi 👋",
      })
    })

    /**
     * TDD: textarea Enter produces real LF/CR. Those must not remain as
     * line-break control characters in the parsed output — normalize them
     * to spaces so storage/display cannot inject unexpected breaks.
     * Expected to FAIL until the schema is refactored.
     */
    it("normalizes real line breaks and tabs in messages to single spaces", () => {
      console.log("line1\nline2")
      expectValid(formPayload({ message: "line1\nline2" }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "line1 line2",
      })
      expectValid(formPayload({ message: "line1\r\nline2" }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "line1 line2",
      })
      expectValid(formPayload({ message: "hello\tworld" }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "hello world",
      })
      expectValid(formPayload({ message: "a\n\n\nb" }), {
        name: "Sohan Das",
        phone: "9876543210",
        message: "a b",
      })
    })

    it("rejects dangerous control characters (NUL, DEL, etc.)", () => {
      expectInvalid(formPayload({ message: "Hello\u0000world" }), {
        path: ["message"],
        message: "invalid characters",
      })
      expectInvalid(formPayload({ message: "Hello\u007fworld" }), {
        path: ["message"],
        message: "invalid characters",
      })
      expectInvalid(formPayload({ message: "Hello\u0008world" }), {
        path: ["message"],
        message: "invalid characters",
      })
    })

    it("preserves literal backslash-escape text without interpreting it", () => {
      const cases: Array<[string, string]> = [
        ["new\\nline", "new\\nline"],
        ["tab\\there", "tab\\there"],
        ["cr\\rreturn", "cr\\rreturn"],
        ["back\\\\slash", "back\\\\slash"],
        ['quote\\"here', 'quote\\"here'],
        ["null\\0byte", "null\\0byte"],
        ["unicode\\u0041esc", "unicode\\u0041esc"],
      ]

      for (const [input, expected] of cases) {
        const result = parse(formPayload({ message: input }))
        expect(result.success).toBe(true)
        if (!result.success) continue
        expect(result.data.message).toBe(expected)
        expect(result.data.message?.length).toBe(input.length)
      }
    })

    it("does not double-escape literal backslash sequences", () => {
      const result = parse(formPayload({ message: "new\\nline" }))
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.message).toBe("new\\nline")
      expect(result.data.message).not.toBe("new\\\\nline")
    })

    it("distinguishes real NUL bytes (rejected) from literal \\u0000 text (accepted)", () => {
      expectInvalid(formPayload({ message: "Hello\u0000world" }), {
        path: ["message"],
        message: "invalid characters",
      })

      const literal = parse(formPayload({ message: "Hello\\u0000world" }))
      expect(literal.success).toBe(true)
      if (!literal.success) return
      expect(literal.data.message).toBe("Hello\\u0000world")
    })

    it("rejects non-string message values", () => {
      expectInvalid(
        { name: "Sohan Das", phone: "9876543210", message: 42 },
        { path: ["message"] },
      )
      expectInvalid(
        { name: "Sohan Das", phone: "9876543210", message: { text: "hi" } },
        { path: ["message"] },
      )
      expectInvalid(
        { name: "Sohan Das", phone: "9876543210", message: ["hi"] },
        { path: ["message"] },
      )
    })
  })

  describe("object / type safety", () => {
    it("rejects non-object payloads", () => {
      for (const payload of [null, undefined, "not-an-object", 42, [], true]) {
        expectInvalid(payload)
      }
    })

    it("rejects an empty object", () => {
      expectInvalid({})
    })

    it("reports the correct path when a required field is missing", () => {
      expectInvalid({ phone: "9876543210", message: "" }, { path: ["name"] })
      expectInvalid({ name: "Sohan Das", message: "" }, { path: ["phone"] })
    })
  })
})
