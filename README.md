# PDF Converter & Image Tools

A powerful, web-based utility for handling PDF and Image conversions. Built with Flask, this application provides a suite of tools for document manipulation, image resizing, and PDF management.

## 🚀 Features

### PDF Tools
- **Image to PDF**: Convert multiple images into a single PDF document.
- **Merge PDF**: Combine multiple PDF files into one.
- **Compress PDF**: Reduce PDF file size with adjustable compression levels.
- **Word to PDF**: Convert `.docx` files to PDF.
- **PDF to Word**: Convert PDF documents back to editable Word files.
- **PDF to JPG**: Extract images from PDF pages.

### Image Tools
- **Compress Image**: Reduce image file size (KB) while maintaining quality.
- **Resize Image**: Change image dimensions or increase/decrease file size.

### Admin Dashboard
- **Activity Log**: Track all conversions and file operations.
- **Stats**: Monitor total conversions, storage usage, and file counts.

## 🛠️ Tech Stack
- **Backend**: Python, Flask
- **Libraries**:
  - `Pillow` (Image processing)
  - `pypdf` (PDF manipulation)
  - `pdf2docx` (PDF to Word)
  - `docx2pdf` (Word to PDF)
  