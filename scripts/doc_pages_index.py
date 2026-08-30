#!/usr/bin/env python3
"""
Extract all pages from Sphinx or MkDocs documentation and map them to source files.

Usage:
    doc_pages_index.py <docs_url> [options]

Example:
    doc_pages_index.py https://nwb-schema.readthedocs.io/en/latest/
    doc_pages_index.py https://bids-specification.readthedocs.io/en/stable/
    doc_pages_index.py https://docs.datalad.org/en/stable/ --source-repo https://github.com/datalad/datalad/blob/maint/scripts/source
    doc_pages_index.py https://docs.python.org/3/ --validate
"""

import argparse
import json
import re
import sys
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)
from urllib.error import (
    HTTPError,
    URLError,
)
from urllib.parse import (
    urljoin,
    urlparse,
)
from urllib.request import (
    Request,
    urlopen,
)


def fetch_url(url, timeout=30):
    """Fetch content from a URL."""
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=timeout) as response:
            return response.read().decode('utf-8')
    except (URLError, HTTPError) as e:
        return None


def check_url_exists(url, timeout=10):
    """Check if a URL is reachable (HEAD request)."""
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'}, method='HEAD')
        with urlopen(req, timeout=timeout) as response:
            return response.status == 200
    except:
        # Try GET as fallback (some servers don't support HEAD)
        try:
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req, timeout=timeout) as response:
                return response.status == 200
        except:
            return False


def detect_doc_type(docs_url):
    """
    Detect whether documentation is built with Sphinx or MkDocs.

    Returns:
        'sphinx', 'mkdocs', or None
    """
    # Ensure docs_url ends with /
    if not docs_url.endswith('/'):
        docs_url += '/'

    # Try Sphinx first (searchindex.js)
    sphinx_index = urljoin(docs_url, 'searchindex.js')
    if fetch_url(sphinx_index, timeout=10):
        return 'sphinx'

    # Try MkDocs (search/search_index.json)
    mkdocs_index = urljoin(docs_url, 'search/search_index.json')
    if fetch_url(mkdocs_index, timeout=10):
        return 'mkdocs'

    return None


def extract_mkdocs_edit_url(main_page_html):
    """
    Extract GitHub edit URL from MkDocs page to deduce source repository.

    Returns base URL like: https://github.com/org/repo/blob/branch/src/
    """
    if not main_page_html:
        return None

    # Look for "Edit this page" or similar GitHub links
    # Pattern: href="https://github.com/org/repo/edit/branch/path/file.md"
    patterns = [
        r'href="(https://github\.com/[^/]+/[^/]+)/edit/([^/]+)/(.+?\.md)"',
        r'href="(https://github\.com/[^/]+/[^/]+)/blob/([^/]+)/(.+?\.md)"',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, main_page_html)
        if matches:
            repo_url, branch, file_path = matches[0]

            # Extract the source directory (everything except the filename)
            if '/' in file_path:
                source_dir = '/'.join(file_path.split('/')[:-1])
                return f'{repo_url}/blob/{branch}/{source_dir}'
            else:
                return f'{repo_url}/blob/{branch}'

    return None


def get_sphinx_pages(docs_url, source_repo_url=None, validate=False):
    """Extract all pages from Sphinx documentation."""
    # Ensure docs_url ends with /
    if not docs_url.endswith('/'):
        docs_url += '/'

    # Fetch searchindex.js
    searchindex_url = urljoin(docs_url, 'searchindex.js')
    print(f"Fetching Sphinx search index from: {searchindex_url}", file=sys.stderr)

    content = fetch_url(searchindex_url)
    if not content:
        print("ERROR: Could not fetch searchindex.js", file=sys.stderr)
        return None

    # Parse the JavaScript to extract JSON
    match = re.search(r'Search\.setIndex\((.*)\)', content, re.DOTALL)
    if not match:
        print("ERROR: Could not parse searchindex.js format", file=sys.stderr)
        return None

    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in searchindex.js: {e}", file=sys.stderr)
        return None

    docnames = data.get('docnames', [])
    titles = data.get('titles', [])

    if not docnames:
        print("WARNING: No documents found in searchindex.js", file=sys.stderr)

    print(f"Found {len(docnames)} documents", file=sys.stderr)

    # Check if _sources/ directory is available (standard Sphinx feature)
    print("Checking for _sources/ directory...", file=sys.stderr)
    test_source_url = urljoin(docs_url, '_sources/index.rst.txt')
    has_sources_dir = check_url_exists(test_source_url)

    if has_sources_dir:
        print("✓ Found _sources/ directory (will use for source URLs)", file=sys.stderr)
    else:
        print("✗ No _sources/ directory found", file=sys.stderr)
        if not source_repo_url:
            print("  Consider providing --source-repo for source file URLs", file=sys.stderr)

    # Build page index
    pages = []
    for i, docname in enumerate(docnames):
        title = titles[i] if i < len(titles) else None

        page_info = {
            'docname': docname,
            'title': title,
            'html_url': urljoin(docs_url, f'{docname}.html'),
            'source_filename': f'{docname}.rst',
        }

        # Determine source URL (prioritize _sources/, then repo URL)
        source_url = None

        if has_sources_dir:
            # Use _sources/*.rst.txt (standard Sphinx "View page source")
            source_url = urljoin(docs_url, f'_sources/{docname}.rst.txt')

        if source_repo_url:
            # Add repository URL as well (or instead if no _sources/)
            repo_url = source_repo_url.rstrip('/') + '/'
            page_info['repo_source_url'] = urljoin(repo_url, f'{docname}.rst')

            # If no _sources/ URL, use repo URL as primary
            if not source_url:
                source_url = page_info['repo_source_url']

        if source_url:
            page_info['source_url'] = source_url

        pages.append(page_info)

    result = {
        'docs_url': docs_url,
        'doc_type': 'sphinx',
        'has_sources_dir': has_sources_dir,
        'total_pages': len(pages),
        'pages': pages
    }

    if source_repo_url:
        result['source_repo_url'] = source_repo_url

    # Validate URLs if requested
    if validate:
        print(f"\nValidating source URLs for {len(pages)} pages...", file=sys.stderr)
        validate_urls(pages, result)

    return result


def get_mkdocs_pages(docs_url, source_repo_url=None, validate=False):
    """Extract all pages from MkDocs documentation."""
    # Ensure docs_url ends with /
    if not docs_url.endswith('/'):
        docs_url += '/'

    # Fetch search/search_index.json
    searchindex_url = urljoin(docs_url, 'search/search_index.json')
    print(f"Fetching MkDocs search index from: {searchindex_url}", file=sys.stderr)

    content = fetch_url(searchindex_url)
    if not content:
        print("ERROR: Could not fetch search/search_index.json", file=sys.stderr)
        return None

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in search index: {e}", file=sys.stderr)
        return None

    docs = data.get('docs', [])
    if not docs:
        print("WARNING: No documents found in search index", file=sys.stderr)

    # Filter and group documents
    # MkDocs includes anchors (page.html#section) as separate entries
    # We only want the base pages (page.html)
    pages_dict = {}
    for doc in docs:
        location = doc.get('location', '')
        title = doc.get('title', '')

        # Skip empty locations
        if not location:
            continue

        # Extract base page (remove anchor)
        if '#' in location:
            base_page = location.split('#')[0]
        else:
            base_page = location

        # Skip if we already have this page
        if base_page in pages_dict:
            continue

        # Store page info (use first occurrence for title)
        pages_dict[base_page] = {
            'location': base_page,
            'title': title
        }

    print(f"Found {len(pages_dict)} unique pages (filtered from {len(docs)} entries)", file=sys.stderr)

    # Try to extract source repo from "Edit this page" links
    detected_repo_url = None
    if not source_repo_url:
        print("Attempting to detect source repository from 'Edit this page' links...", file=sys.stderr)
        main_page = fetch_url(docs_url)
        detected_repo_url = extract_mkdocs_edit_url(main_page)

        if detected_repo_url:
            print(f"✓ Detected source repository: {detected_repo_url}", file=sys.stderr)
            source_repo_url = detected_repo_url
        else:
            print("✗ Could not detect source repository", file=sys.stderr)
            print("  Consider providing --source-repo option", file=sys.stderr)

    # MkDocs doesn't serve _sources/ directory
    has_sources_dir = False

    # Build page index
    pages = []
    for base_page, info in sorted(pages_dict.items()):
        # Convert location to docname (remove .html extension)
        docname = base_page.replace('.html', '') if base_page.endswith('.html') else base_page

        # MkDocs uses .md files
        source_filename = f'{docname}.md'

        page_info = {
            'docname': docname,
            'title': info['title'] or docname,
            'html_url': urljoin(docs_url, base_page),
            'source_filename': source_filename,
        }

        # Add source URL if we have repo info
        if source_repo_url:
            repo_url = source_repo_url.rstrip('/') + '/'
            source_url = urljoin(repo_url, source_filename)
            page_info['source_url'] = source_url
            page_info['repo_source_url'] = source_url

        pages.append(page_info)

    result = {
        'docs_url': docs_url,
        'doc_type': 'mkdocs',
        'has_sources_dir': has_sources_dir,
        'total_pages': len(pages),
        'pages': pages
    }

    if source_repo_url:
        result['source_repo_url'] = source_repo_url

    # Validate URLs if requested
    if validate:
        print(f"\nValidating source URLs for {len(pages)} pages...", file=sys.stderr)
        validate_urls(pages, result)

    return result


def get_all_pages(docs_url, source_repo_url=None, validate=False):
    """
    Extract all pages from Sphinx or MkDocs documentation.

    Auto-detects the documentation type and calls the appropriate handler.

    Args:
        docs_url: Base URL of the documentation
        source_repo_url: Optional source repository base URL
        validate: If True, validate that source URLs are reachable

    Returns:
        Dictionary with page information
    """
    # Detect documentation type
    print(f"Detecting documentation type for {docs_url}", file=sys.stderr)
    doc_type = detect_doc_type(docs_url)

    if doc_type == 'sphinx':
        print("✓ Detected: Sphinx documentation", file=sys.stderr)
        return get_sphinx_pages(docs_url, source_repo_url, validate)
    elif doc_type == 'mkdocs':
        print("✓ Detected: MkDocs documentation", file=sys.stderr)
        return get_mkdocs_pages(docs_url, source_repo_url, validate)
    else:
        print("ERROR: Could not detect documentation type", file=sys.stderr)
        print("  Tried: Sphinx (searchindex.js), MkDocs (search/search_index.json)", file=sys.stderr)
        print("  This may not be Sphinx or MkDocs documentation", file=sys.stderr)
        return None


def validate_urls(pages, result):
    """Validate that source URLs are reachable."""
    urls_to_check = []

    for page in pages:
        if 'source_url' in page:
            urls_to_check.append((page['docname'], 'source_url', page['source_url']))
        if 'repo_source_url' in page:
            urls_to_check.append((page['docname'], 'repo_source_url', page['repo_source_url']))

    if not urls_to_check:
        print("  No URLs to validate", file=sys.stderr)
        return

    print(f"  Checking {len(urls_to_check)} URLs...", file=sys.stderr)

    valid_count = 0
    invalid_count = 0
    invalid_urls = []

    # Use thread pool for faster validation
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {
            executor.submit(check_url_exists, url): (docname, url_type, url)
            for docname, url_type, url in urls_to_check
        }

        for i, future in enumerate(as_completed(future_to_url), 1):
            docname, url_type, url = future_to_url[future]
            is_valid = future.result()

            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1
                invalid_urls.append((docname, url_type, url))

            if i % 10 == 0:
                print(f"  Progress: {i}/{len(urls_to_check)} URLs checked", file=sys.stderr)

    print(f"\n  Validation complete:", file=sys.stderr)
    print(f"    ✓ Valid:   {valid_count}", file=sys.stderr)
    print(f"    ✗ Invalid: {invalid_count}", file=sys.stderr)

    if invalid_urls:
        print(f"\n  Invalid URLs (first 10):", file=sys.stderr)
        for docname, url_type, url in invalid_urls[:10]:
            print(f"    {docname} ({url_type}): {url}", file=sys.stderr)
        if len(invalid_urls) > 10:
            print(f"    ... and {len(invalid_urls) - 10} more", file=sys.stderr)

    # Add validation results to result dict
    result['validation'] = {
        'validated': True,
        'total_checked': len(urls_to_check),
        'valid_count': valid_count,
        'invalid_count': invalid_count,
        'invalid_urls': [
            {'docname': doc, 'url_type': typ, 'url': url}
            for doc, typ, url in invalid_urls
        ]
    }


def main():
    parser = argparse.ArgumentParser(
        description='Extract all pages from Sphinx or MkDocs documentation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('docs_url', help='Base URL of the documentation (Sphinx or MkDocs)')
    parser.add_argument('--source-repo', '--github-repo', '--github', dest='source_repo_url',
                        help='Source repository base URL (e.g., GitHub) for source files (optional)')
    parser.add_argument('-o', '--output', help='Output JSON file (default: stdout)')
    parser.add_argument('--format', choices=['json', 'text', 'figpack'], default='json',
                        help='Output format (default: json). figpack = {docPages: [...]} schema')
    parser.add_argument('--validate', action='store_true',
                        help='Validate that source URLs are reachable (slower)')

    args = parser.parse_args()

    result = get_all_pages(args.docs_url, args.source_repo_url, args.validate)

    if not result:
        sys.exit(1)

    # Output results
    if args.format == 'json':
        output = json.dumps(result, indent=2)
    elif args.format == 'figpack':
        # Convert to figpack schema: {docPages: [{title, url, sourceUrl, includeFromStart}]}
        doc_pages = []
        for page in result['pages']:
            # Skip pages without source_url
            if not page.get('source_url'):
                print(f"WARNING: Skipping {page['docname']} - no source_url available", file=sys.stderr)
                continue

            doc_page = {
                'title': page.get('title') or page['docname'],
                'url': page['html_url'],
                'sourceUrl': page['source_url'],
                'includeFromStart': True  # As requested, always true
            }
            doc_pages.append(doc_page)

        figpack_output = {'docPages': doc_pages}
        output = json.dumps(figpack_output, indent=2)
    else:  # text format
        lines = [
            f"Documentation Index ({result.get('doc_type', 'unknown').upper()})",
            f"=" * 80,
            f"Documentation URL:  {result['docs_url']}",
            f"Type:               {result.get('doc_type', 'unknown')}",
            f"Has _sources/ dir:  {result['has_sources_dir']}",
        ]

        if result.get('source_repo_url'):
            lines.append(f"Source Repository:  {result['source_repo_url']}")

        lines.extend([
            f"Total Pages:        {result['total_pages']}",
            f"=" * 80,
            ""
        ])

        for page in result['pages']:
            lines.append(f"{page['docname']}")
            if page.get('title'):
                lines.append(f"  Title:      {page['title']}")
            lines.append(f"  HTML:       {page['html_url']}")
            lines.append(f"  Source:     {page['source_filename']}")
            if page.get('source_url'):
                lines.append(f"  Source URL: {page['source_url']}")
            if page.get('repo_source_url') and page.get('repo_source_url') != page.get('source_url'):
                lines.append(f"  Repo URL:   {page['repo_source_url']}")
            lines.append("")

        if result.get('validation'):
            val = result['validation']
            lines.extend([
                "",
                "=" * 80,
                "Validation Results",
                "=" * 80,
                f"Total URLs checked: {val['total_checked']}",
                f"Valid:              {val['valid_count']}",
                f"Invalid:            {val['invalid_count']}",
            ])

        output = '\n'.join(lines)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"\nOutput written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()
