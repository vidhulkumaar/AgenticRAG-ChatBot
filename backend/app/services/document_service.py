import os
import io
from typing import Dict, Any, Optional
from pypdf import PdfReader
try:
    import docx
except ImportError:
    docx = None

class DocumentService:
    @staticmethod
    def extract_text(filename: str, file_bytes: bytes) -> Optional[Dict[str, Any]]:
        """Extract plain text from uploaded file bytes based on file extension."""
        ext = os.path.splitext(filename)[-1].lower()
        text = ""

        try:
            if ext == ".pdf":
                pdf_file = io.BytesIO(file_bytes)
                reader = PdfReader(pdf_file)
                pages_text = []
                for idx, page in enumerate(reader.pages):
                    extracted = page.extract_text()
                    if extracted and extracted.strip():
                        pages_text.append(extracted.strip())
                text = "\n\n".join(pages_text)

            elif ext in [".txt", ".md", ".json", ".csv"]:
                # Attempt utf-8, fallback to latin-1
                try:
                    text = file_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    text = file_bytes.decode("latin-1", errors="replace")

            elif ext in [".docx"]:
                if docx is not None:
                    doc = docx.Document(io.BytesIO(file_bytes))
                    paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                    text = "\n\n".join(paras)
                else:
                    return None
            else:
                return None

            clean_text = text.strip()
            if not clean_text:
                return None

            return {
                "filename": filename,
                "text": clean_text,
                "size_bytes": len(file_bytes),
                "extension": ext
            }
        except Exception as e:
            print(f"Error extracting text from {filename}: {e}")
            return None

    @staticmethod
    def format_size(size_bytes: int) -> str:
        """Format bytes to human-readable size string."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{round(size_bytes / 1024, 1)} KB"
        else:
            return f"{round(size_bytes / (1024 * 1024), 2)} MB"
