import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      'http://20.185.31.156:8080/api/v2/tables/mqkb58joekyqe2o/records',
      {
        headers: {
          'xc-token': 'hcm_SoiqCi8trnrGD6YXy-rxznvhzVo974h7CneE', // Replace with actual token
        },
        cache: 'no-store', // Don't cache the results
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NocoDB API Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch from NocoDB', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}