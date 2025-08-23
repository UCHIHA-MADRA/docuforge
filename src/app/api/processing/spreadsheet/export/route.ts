import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { data, format } = await request.json()
    
    // Convert x-spreadsheet data to workbook
    const workbook = XLSX.utils.book_new()
    
    // Process each sheet
    Object.keys(data).forEach(sheetName => {
      const sheet = data[sheetName]
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows || [])
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    let buffer: Buffer
    let contentType: string
    let filename: string

    if (format === 'xlsx') {
      buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      filename = 'spreadsheet.xlsx'
    } else {
      // CSV - export first sheet only
      const firstSheet = Object.keys(data)[0]
      buffer = Buffer.from(XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]))
      contentType = 'text/csv'
      filename = 'spreadsheet.csv'
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}
