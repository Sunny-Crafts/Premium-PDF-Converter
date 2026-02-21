import os
import uuid
from flask import Flask, render_template, request, send_file, jsonify, url_for, redirect
from PIL import Image
# We will import other libraries as we implement features:
# import pypdf
# from pdf2docx import Converter
# from docx2pdf import convert as docx_to_pdf

import json
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'super_secret_admin_key_change_in_production' # Required for sessions
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max
app.config['UPLOAD_FOLDER'] = 'uploads' # Renamed for persistence
app.config['HISTORY_FILE'] = 'data/history.json'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.dirname(app.config['HISTORY_FILE']), exist_ok=True)

# --- ADMIN HELPERS ---
def load_history():
    if not os.path.exists(app.config['HISTORY_FILE']):
        return []
    try:
        with open(app.config['HISTORY_FILE'], 'r') as f:
            return json.load(f)
    except:
        return []

def save_history(data):
    with open(app.config['HISTORY_FILE'], 'w') as f:
        json.dump(data, f, indent=4)

def log_activity(action, original_name, filename):
    history = load_history()
    entry = {
        'id': str(uuid.uuid4()),
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'action': action,
        'original_name': original_name,
        'filename': filename
    }
    history.insert(0, entry) # Prepend to show newest first
    save_history(history)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# --- ROUTES ---

@app.route('/')
def home():
    return render_template('home.html')

# --- ADMIN ROUTES ---
from flask import session, flash

@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        # Hardcoded credentials for simplicity
        if username == 'admin' and password == 'admin123':
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'error')
    return render_template('admin_login.html')

@app.route('/admin_logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('home'))

@app.route('/admin')
@login_required
def admin_dashboard():
    history = load_history()
    
    # Calculate Stats
    total_conversions = len(history)
    file_count = len([name for name in os.listdir(app.config['UPLOAD_FOLDER']) if os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], name))])
    
    # Calculate storage size
    total_size = 0
    for path, dirs, files in os.walk(app.config['UPLOAD_FOLDER']):
        for f in files:
            fp = os.path.join(path, f)
            total_size += os.path.getsize(fp)
    
    storage_used = f"{total_size / (1024*1024):.2f} MB"
    
    stats = {
        'total_conversions': total_conversions,
        'storage_used': storage_used,
        'file_count': file_count
    }
    
    return render_template('admin_dashboard.html', history=history, stats=stats)

# Feature 1: Image to PDF (Existing)
@app.route('/image-to-pdf')
def image_to_pdf():
    return render_template('image_to_pdf.html') # We need to rename index.html to this

@app.route('/convert', methods=['POST'])
def convert_image_to_pdf():
    # Existing Logic
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files[]')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No selected file'}), 400

    image_list = []
    try:
        for file in files:
            img = Image.open(file)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_list.append(img)
            
        if not image_list:
             return jsonify({'error': 'No valid images processed'}), 400

        filename = f"{uuid.uuid4()}.pdf"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        image_list[0].save(
            filepath, "PDF", resolution=100.0, save_all=True, append_images=image_list[1:]
        )
        
        # Log Activity
        log_activity('Image to PDF', files[0].filename + f" (+{len(files)-1} others)", filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=filename)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

import pypdf

# ... (Previous routes)

# Feature 2: Merge PDF
@app.route('/merge-pdf')
def merge_pdf():
    return render_template('merge_pdf.html')

@app.route('/merge-pdf-action', methods=['POST'])
def merge_pdf_action():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files[]')
    if not files or len(files) < 2:
        return jsonify({'error': 'Please select at least 2 PDF files'}), 400

    merger = pypdf.PdfWriter()
    temp_files = []

    try:
        for file in files:
            # We must save them temporarily because pypdf often prefers file paths or seekable streams
            # But we can try passing the file object directly if it's seekable.
            # Flask file objects are usually seekable.
            merger.append(file)
        
        filename = f"merged_{uuid.uuid4()}.pdf"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        merger.write(filepath)
        merger.close()

        # Log Activity
        log_activity('Merge PDF', files[0].filename + f" (+{len(files)-1} others)", filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=filename)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/compress-pdf')
def compress_pdf():
    return render_template('compress_pdf.html')

@app.route('/compress-pdf-action', methods=['POST'])
def compress_pdf_action():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    level = request.form.get('level', 'medium') # low, medium, high

    try:
        reader = pypdf.PdfReader(file)
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            # High compression: Compress content streams + reduce image quality if possible
            # pypdf's compression is mainly lossless content stream compression
            if level == 'high':
                page.compress_content_streams()
            elif level == 'medium':
                page.compress_content_streams()
            # for 'low', we might just clean up metadata, or do light compression
            
            writer.add_page(page)

        # Advanced Metadata stripping for size
        writer.add_metadata({}) 

        filename = f"compressed_{uuid.uuid4()}.pdf"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        writer.write(filepath)
        writer.close()
        
        # Log Activity
        log_activity('Compress PDF', file.filename, filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=filename)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/word-to-pdf')
def word_to_pdf():
    return render_template('word_to_pdf.html')

# Word -> PDF
@app.route('/word-to-pdf-action', methods=['POST'])
def word_to_pdf_action():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400

    try:
        from docx2pdf import convert
        
        input_filename = f"input_{uuid.uuid4()}.docx"
        input_path = os.path.join(os.path.abspath(app.config['UPLOAD_FOLDER']), input_filename)
        output_filename = f"converted_{uuid.uuid4()}.pdf"
        output_path = os.path.join(os.path.abspath(app.config['UPLOAD_FOLDER']), output_filename)
        
        file.save(input_path)
        
        # docx2pdf conversion (requires Word installed on Windows)
        convert(input_path, output_path)
        
        # Log Activity
        log_activity('Word to PDF', file.filename, output_filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=output_filename)})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

# PDF -> Word
@app.route('/pdf-to-word-action', methods=['POST'])
def pdf_to_word_action():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400

    try:
        from pdf2docx import Converter
        
        input_filename = f"input_{uuid.uuid4()}.pdf"
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_filename)
        output_filename = f"converted_{uuid.uuid4()}.docx"
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        
        file.save(input_path)
        
        cv = Converter(input_path)
        cv.convert(output_path, start=0, end=None)
        cv.close()
        
        # Log Activity
        log_activity('PDF to Word', file.filename, output_filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=output_filename)})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/pdf-to-jpg')
def pdf_to_jpg():
    return render_template('pdf_to_jpg.html')

@app.route('/pdf-to-jpg-action', methods=['POST'])
def pdf_to_jpg_action():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400

    try:
        import zipfile
        
        reader = pypdf.PdfReader(file)
        
        # Create a ZIP file for the images
        zip_filename = f"extracted_images_{uuid.uuid4()}.zip"
        zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
        
        count = 0
        with zipfile.ZipFile(zip_path, 'w') as zf:
            for page_num, page in enumerate(reader.pages):
                for image_file_object in page.images:
                    # image_file_object.name, image_file_object.data
                    zf.writestr(f"page{page_num+1}_{image_file_object.name}", image_file_object.data)
                    count += 1
        
        if count == 0:
            return jsonify({'error': 'No images found in this PDF to extract.'}), 400

        # Log Activity
        log_activity('PDF to JPG', file.filename, zip_filename)

        return jsonify({'success': True, 'download_url': url_for('download_file', filename=zip_filename)})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/image-tools')
def image_tools():
    return render_template('image_tools.html')

@app.route('/image-tools/compress', methods=['POST'])
def compress_image():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    target_size_kb = request.form.get('target_size_kb', '')
    
    try:
        from io import BytesIO
        
        img = Image.open(file)
        if img.mode != 'RGB': img = img.convert('RGB')
        
        filename = f"compressed_{uuid.uuid4()}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # If target size specified, compress to that target
        if target_size_kb:
            target_bytes = int(target_size_kb) * 1024
            
            # Binary search for optimal quality
            quality_min, quality_max = 5, 95
            best_quality = 50
            
            for _ in range(10):  # Max 10 iterations
                quality = (quality_min + quality_max) // 2
                
                # Save to memory first to check size
                buffer = BytesIO()
                img.save(buffer, 'JPEG', quality=quality, optimize=True)
                current_size = buffer.tell()
                
                if current_size <= target_bytes:
                    best_quality = quality
                    quality_min = quality + 1
                else:
                    quality_max = quality - 1
                    
                if quality_min > quality_max:
                    break
            
            img.save(filepath, 'JPEG', quality=best_quality, optimize=True)
        else:
            # No target size, save with default quality
            img.save(filepath, 'JPEG', quality=80, optimize=True)
        
        # Log Activity
        log_activity('Compress Image', file.filename, filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=filename)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/image-tools/resize', methods=['POST'])
def resize_image():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    w_str = request.form.get('width', '')
    h_str = request.form.get('height', '')
    target_size_kb = request.form.get('target_size_kb', '')
    
    try:
        from io import BytesIO
        
        img = Image.open(file)
        orig_w, orig_h = img.size
        
        new_w = int(w_str) if w_str else None
        new_h = int(h_str) if h_str else None
        
        # If dimensions provided, resize to those dimensions
        if new_w or new_h:
            if new_w and not new_h:
                ratio = new_w / orig_w
                new_h = int(orig_h * ratio)
            elif new_h and not new_w:
                ratio = new_h / orig_h
                new_w = int(orig_w * ratio)
                
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Convert to RGB if needed (for JPEG compatibility)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        filename = f"resized_{uuid.uuid4()}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # If target size specified, INCREASE image to reach that target
        if target_size_kb:
            target_bytes = int(target_size_kb) * 1024
            
            # First check current size at max quality
            buffer = BytesIO()
            img.save(buffer, 'JPEG', quality=100)
            current_size = buffer.tell()
            
            # If current size is already >= target, just save at max quality
            if current_size >= target_bytes:
                img.save(filepath, 'JPEG', quality=100)
            else:
                # Need to upscale the image to increase file size
                # Calculate scale factor needed (approximate)
                scale_factor = (target_bytes / current_size) ** 0.5
                scale_factor = min(scale_factor, 4.0)  # Cap at 4x upscale
                
                curr_w, curr_h = img.size
                new_w = int(curr_w * scale_factor)
                new_h = int(curr_h * scale_factor)
                
                # Upscale the image
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                # Save at max quality to maximize file size
                img.save(filepath, 'JPEG', quality=100)
        else:
            # No target size, save with high quality
            img.save(filepath, 'JPEG', quality=95, optimize=True)
        
        # Log Activity
        log_activity('Increase Image Size', file.filename, filename)
        
        return jsonify({'success': True, 'download_url': url_for('download_file', filename=filename)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Shared Download Route
@app.route('/download/<filename>')
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return "File not found", 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
