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

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sunny-Crafts/PDF-Converter.git
   cd PDF-Converter
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```
   The app will be available at `http://127.0.0.1:5000`.

> [!IMPORTANT]
> **Word to PDF** functionality requires Microsoft Word to be installed on the host system (Windows).

## 🛡️ Admin Access
Access the dashboard at `/admin`.
- **Username**: `admin`
- **Password**: `admin123`
*(Note: Change these in `app.py` for production use)*

## 📄 License
Distributed under the MIT License.
