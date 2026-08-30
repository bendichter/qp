# Sphinx and MkDocs Documentation Index Extraction

## Overview

This directory contains a script to extract a complete index of all pages from **Sphinx** or **MkDocs** documentation and map them to their source files. The script auto-detects the documentation type.

## Documentation Index Files

### Sphinx

Sphinx generates several index/inventory files:

1. **`objects.inv`** - Binary inventory file (zlib-compressed)
   - Contains 1,291 entries for DataLad docs
   - Indexes all documented objects: classes, functions, methods, attributes, etc.
   - Used for cross-referencing (`:func:`, `:class:`, etc.) and `intersphinx`
   - **Format**: Binary header + compressed data
   - **Use case**: API documentation, cross-project references

2. **`searchindex.js`** - JavaScript search index ✓ **Used by this script**
   - Contains **143 pages** for DataLad docs
   - Has `docnames` array listing all documentation pages
   - Has `titles` array with page titles
   - Has `alltitles` mapping titles to documents
   - **Format**: JavaScript with JSON data
   - **Use case**: Full-text search, complete page listing

3. **`_sources/` directory** - Source files served by docs
   - Most Sphinx sites serve raw `.rst.txt` files
   - Accessible via "View page source" links
   - **Most reliable** source URL option (no guessing needed)

### MkDocs

MkDocs generates:

1. **`search/search_index.json`** - JSON search index ✓ **Used by this script**
   - Contains **43 pages** (BIDS) + **1,415 anchor entries**
   - Each entry has: `location`, `title`, `text`
   - Includes both pages and anchors (filtered by this script)
   - **Format**: Pure JSON
   - **Use case**: Full-text search, page discovery

2. **"Edit this page" links** - Repository source references
   - MkDocs doesn't serve `_sources/` directory
   - Links to GitHub/GitLab edit URLs
   - Script auto-detects repository from these links
   - **Use case**: Source file URL construction

## The Script

**File**: `doc_pages_index.py`

### Features

- ✓ **Auto-detects documentation type** (Sphinx or MkDocs)
- ✓ **Sphinx support**: Extracts pages from `searchindex.js`, uses `_sources/` directory when available
- ✓ **MkDocs support**: Extracts pages from `search/search_index.json`, auto-detects source repository
- ✓ Maps docnames to source files (`.rst` for Sphinx, `.md` for MkDocs)
- ✓ **Prioritizes served sources** (`_sources/` for Sphinx, GitHub for MkDocs)
- ✓ Optionally includes repository URLs when provided
- ✓ **Validates URLs** to ensure they're reachable (optional, concurrent)
- ✓ **Three output formats**: JSON (full metadata), text (human-readable), figpack (compatible schema)
- ✓ Works with any Sphinx or MkDocs documentation site

### Key Features

**v3 - MkDocs Support:**
1. **Auto-detection** - Automatically detects Sphinx vs MkDocs
2. **MkDocs support** - Parses `search/search_index.json`, filters anchors, auto-detects GitHub repo
3. **Unified interface** - Same command works for both documentation types

**v2 - Sphinx Enhancements:**
1. **No more hallucinated URLs** - Uses actual `_sources/` directory when available
2. **Renamed `github_url` → `source_url`** - More generic, doesn't assume GitHub
3. **Added `--validate` option** - Checks if URLs are actually reachable (concurrent)
4. **Both URLs available** - When `--source-repo` is provided, both `source_url` and `repo_source_url` are included
5. **Figpack format support** - New `--format figpack` option outputs in [figpack](https://flatironinstitute.github.io/figpack/) schema

### Usage

```bash
# Simplest usage - auto-detects documentation type
./doc_pages_index.py https://nwb-schema.readthedocs.io/en/latest/  # Sphinx
./doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/  # MkDocs

# Sphinx with _sources/ directory (auto-detected)
./doc_pages_index.py https://nwb-schema.readthedocs.io/en/latest/

# MkDocs with auto-detected GitHub repository
./doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/

# With explicit repository URL (works for both Sphinx and MkDocs)
./doc_pages_index.py https://docs.datalad.org/en/stable/ \
  --source-repo https://github.com/datalad/datalad/blob/maint/scripts/source

# Validate that URLs are reachable
./doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/ --validate

# Save to file
./doc_pages_index.py https://nwb-schema.readthedocs.io/en/latest/ -o index.json

# Text format output
./doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/ --format text

# Figpack format (compatible with figpack schema)
./doc_pages_index.py https://docs.datalad.org/en/stable/ --format figpack -o doc-pages.json
```

### Output Format

**JSON** (default):
```json
{
  "docs_url": "https://nwb-schema.readthedocs.io/en/latest/",
  "has_sources_dir": true,
  "total_pages": 6,
  "pages": [
    {
      "docname": "credits",
      "title": "Credits",
      "html_url": "https://nwb-schema.readthedocs.io/en/latest/credits.html",
      "rst_filename": "credits.rst",
      "source_url": "https://nwb-schema.readthedocs.io/en/latest/_sources/credits.rst.txt"
    },
    ...
  ]
}
```

With `--source-repo` option:
```json
{
  "docs_url": "https://docs.datalad.org/en/stable/",
  "has_sources_dir": true,
  "source_repo_url": "https://github.com/datalad/datalad/blob/maint/scripts/source",
  "total_pages": 143,
  "pages": [
    {
      "docname": "acknowledgements",
      "title": "Acknowledgments",
      "html_url": "https://docs.datalad.org/en/stable/acknowledgements.html",
      "rst_filename": "acknowledgements.rst",
      "source_url": "https://docs.datalad.org/en/stable/_sources/acknowledgements.rst.txt",
      "repo_source_url": "https://github.com/datalad/datalad/blob/maint/scripts/source/acknowledgements.rst"
    },
    ...
  ]
}
```

With `--validate` option:
```json
{
  "docs_url": "...",
  "pages": [...],
  "validation": {
    "validated": true,
    "total_checked": 6,
    "valid_count": 6,
    "invalid_count": 0,
    "invalid_urls": []
  }
}
```

**Figpack** format (compatible with [figpack](https://flatironinstitute.github.io/figpack/) schema):
```json
{
  "docPages": [
    {
      "title": "Acknowledgments",
      "url": "https://docs.datalad.org/en/stable/acknowledgements.html",
      "sourceUrl": "https://docs.datalad.org/en/stable/_sources/acknowledgements.rst.txt",
      "includeFromStart": true
    },
    {
      "title": "Background and motivation",
      "url": "https://docs.datalad.org/en/stable/background.html",
      "sourceUrl": "https://docs.datalad.org/en/stable/_sources/background.rst.txt",
      "includeFromStart": true
    },
    ...
  ]
}
```

**Text** format:
```
Sphinx Documentation Index
================================================================================
Documentation URL:  https://nwb-schema.readthedocs.io/en/latest/
Has _sources/ dir:  True
Total Pages:        6
================================================================================

credits
  Title:      Credits
  HTML:       https://nwb-schema.readthedocs.io/en/latest/credits.html
  RST File:   credits.rst
  Source URL: https://nwb-schema.readthedocs.io/en/latest/_sources/credits.rst.txt
...
```

## Source URL Priority

The script uses the following priority for source URLs:

1. **`_sources/` directory** (e.g., `https://example.com/scripts/_sources/page.rst.txt`)
   - Always preferred when available
   - Direct from the docs site (most reliable)
   - Accessible via "View page source" links

2. **Repository URL** (e.g., GitHub)
   - Only when provided via `--source-repo`
   - Useful for linking to editable source
   - Both URLs included in output when available

3. **No source URL**
   - If neither is available, only HTML URLs are provided
   - Use `--source-repo` option to add repository links

## Validation Feature

The `--validate` option checks if source URLs are actually reachable:

```bash
./doc_pages_index.py https://example.com/scripts/ --validate
```

Features:
- Uses concurrent checking (10 parallel workers) for speed
- Tries HEAD requests first, falls back to GET if needed
- Reports progress every 10 URLs
- Shows summary of valid/invalid URLs
- Lists invalid URLs in output (up to 10 shown in stderr)

Example output:
```
Validating source URLs for 143 pages...
  Checking 143 URLs...
  Progress: 10/143 URLs checked
  ...

  Validation complete:
    ✓ Valid:   143
    ✗ Invalid: 0
```

## Sphinx vs MkDocs Comparison

| Feature | Sphinx | MkDocs |
|---------|--------|--------|
| **Search index** | `searchindex.js` | `search/search_index.json` |
| **Source files** | `_sources/*.rst.txt` (served) | Not served (GitHub only) |
| **Detection** | Automatic | Automatic |
| **Source URL** | From `_sources/` or `--source-repo` | Auto-detected from "Edit" links or `--source-repo` |
| **File format** | `.rst` → `.html` | `.md` → `.html` |
| **Anchors** | Filtered separately | Included in search index (filtered by script) |

## Examples

### Sphinx Examples

#### NWB Format Documentation (Sphinx with _sources/)
```bash
./doc_pages_index.py https://nwb-schema.readthedocs.io/en/latest/ -o nwb.json
# Auto-detects: Sphinx
# Uses: _sources/ directory
# Result: 6 pages with .rst.txt sources
```

#### DataLad Documentation (Sphinx with GitHub repo)
```bash
./doc_pages_index.py https://docs.datalad.org/en/stable/ \
  --source-repo https://github.com/datalad/datalad/blob/maint/scripts/source \
  -o datalad.json
# Auto-detects: Sphinx
# Provides: Both _sources/ URLs and GitHub URLs
# Result: 143 pages
```

#### Sphinx Documentation with Validation
```bash
./doc_pages_index.py https://www.sphinx-doc.org/en/master/ --validate
# Auto-detects: Sphinx
# Validates: All source URLs are reachable
```

### MkDocs Examples

#### BIDS Specification (MkDocs with auto-detected repo)
```bash
./doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/ -o bids.json
# Auto-detects: MkDocs
# Auto-detects repo: https://github.com/bids-standard/bids-specification
# Filters: 43 unique pages from 1458 search entries (removes anchors)
# Result: 43 pages with .md sources from GitHub
```

#### MkDocs with Manual Repo URL
```bash
./doc_pages_index.py https://example-mkdocs.readthedocs.io/en/latest/ \
  --source-repo https://github.com/org/repo/blob/main/docs \
  --format text
# Auto-detects: MkDocs
# Uses: Provided repository URL
# Output: Human-readable text format
```

### Universal Examples (Both Types)

#### Figpack Format Output
```bash
# Works with both Sphinx and MkDocs
./doc_pages_index.py https://docs.datalad.org/en/stable/ \
  --format figpack -o doc-pages.json

# Auto-detects documentation type
# Output: figpack schema with includeFromStart: true for all pages
```

#### Python Documentation (Sphinx)
```bash
./doc_pages_index.py https://docs.python.org/3/ \
  --source-repo https://github.com/python/cpython/blob/main/Doc \
  --format text
```

## Command-Line Options

- `docs_url` - Base URL of documentation (Sphinx or MkDocs, auto-detected) (required)
- `--source-repo URL` - Source repository base URL (optional, also accepts `--github-repo` or `--github`)
  - For Sphinx: Supplements or replaces `_sources/` URLs
  - For MkDocs: Used if auto-detection fails
- `-o FILE`, `--output FILE` - Output file (default: stdout)
- `--format {json,text,figpack}` - Output format (default: json)
  - `json` - Full metadata with all fields (includes `doc_type`, `has_sources_dir`)
  - `text` - Human-readable text format
  - `figpack` - Compatible with [figpack](https://flatironinstitute.github.io/figpack/) schema (`{docPages: [...]}`)
- `--validate` - Validate that source URLs are reachable (optional, slower)

## Notes

- **Auto-detection**: Tries Sphinx (`searchindex.js`) first, then MkDocs (`search/search_index.json`)
- **Sphinx**: `_sources/` directory is a standard feature (most sites have it)
- **MkDocs**: Auto-detects repository from "Edit this page" links when possible
- **Filtering**: MkDocs anchor entries (`page.html#section`) are automatically filtered
- **Validation**: Optional but recommended to verify URLs are reachable
- **No authentication**: Works with public documentation only
- **Compatible**: Python 3.6+
