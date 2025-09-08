import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 })
    }

    const text = await file.text() // read CSV content
    console.log("CSV Contents:\n", text)

    // Here you can parse CSV, save to DB, etc.
    return NextResponse.json({ success: true, message: `CSV "${file.name}" uploaded` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
