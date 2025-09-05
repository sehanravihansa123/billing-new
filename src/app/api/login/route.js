// src/app/api/login/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const { email, password } = await req.json();

  // Example: hardcoded credentials
  const validUser = {
    email: "admin@example.com",
    password: "password123"
  };

  if (email === validUser.email && password === validUser.password) {
    return NextResponse.json({ success: true, message: "Login successful!" });
  } else {
    return NextResponse.json({ success: false, message: "Invalid credentials." }, { status: 401 });
  }
}
