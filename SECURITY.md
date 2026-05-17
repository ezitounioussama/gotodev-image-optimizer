# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | ✅        |

## Reporting a Vulnerability

Open an issue with the label `security`.

## Security Measures

- All image processing runs in isolated worker threads
- File paths are validated against path traversal attacks
- Image formats are verified by magic bytes, not file extensions
- SVGs are sanitized to remove scripts and event handlers
- Output filenames include content hashes for integrity
- No remote URL fetching is performed
- Zero usage of eval() or dynamic code generation
- CSP-compliant output
- npm publish uses --provenance for supply chain security
