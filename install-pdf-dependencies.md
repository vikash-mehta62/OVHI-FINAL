# PDF Generation Dependencies

To enable PDF invoice generation, you need to install the following dependencies:

## Required Dependencies

```bash
npm install jspdf jspdf-autotable
```

## Optional Dependencies (for enhanced features)

```bash
npm install @types/jspdf  # TypeScript types (if using TypeScript)
```

## Installation Command

Run this command in your project root:

```bash
npm install jspdf jspdf-autotable
```

## What These Libraries Do

- **jsPDF**: Core PDF generation library for JavaScript
- **jspdf-autotable**: Plugin for jsPDF that adds table generation capabilities

## Usage

After installation, the PDF generation will work automatically with the enhanced billing dashboard. The system will:

1. Generate invoices from bills
2. Create professional PDF invoices with:
   - Company header and branding
   - Patient information
   - Itemized services with pricing
   - Payment history (if any)
   - Professional formatting and styling
   - Download and preview capabilities

## Features Included

- **Professional Layout**: Company header, patient info, itemized billing
- **Status Indicators**: Color-coded status badges
- **Payment History**: Shows all payments made against the invoice
- **Responsive Design**: Works on all screen sizes
- **Download & Preview**: Both download and browser preview options
- **Automatic Numbering**: Sequential invoice numbers (INV-2025-0001 format)
- **Currency Formatting**: Proper USD formatting throughout
- **Date Formatting**: Professional date display
- **Notes Support**: Custom notes and payment instructions