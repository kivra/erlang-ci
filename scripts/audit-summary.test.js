const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { renderAuditSummary } = require('./audit-summary');

describe('renderAuditSummary', () => {
  it('returns null for empty input', () => {
    assert.equal(renderAuditSummary(''), null);
    assert.equal(renderAuditSummary(null), null);
    assert.equal(renderAuditSummary(undefined), null);
    assert.equal(renderAuditSummary('   '), null);
  });

  it('returns null for invalid JSON', () => {
    assert.equal(renderAuditSummary('not json'), null);
    assert.equal(renderAuditSummary('===> No vulnerabilities found'), null);
  });

  it('renders clean audit with shield header', () => {
    const json = JSON.stringify({
      vulnerabilities: [],
      dependencies_scanned: 5
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes('<!-- erlang-ci-summary -->'));
    assert.ok(result.includes(':shield:'));
    assert.ok(result.includes('No vulnerabilities found in 5 dependencies'));
    assert.ok(!result.includes(':rotating_light:'));
  });

  it('renders single vulnerability', () => {
    const json = JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-1234-5678-9abc',
        cve_id: 'CVE-2025-1234',
        package: 'cowboy',
        current_version: '2.10.0',
        severity: 'high',
        vulnerable_range: '< 2.12.0',
        patched_version: '2.12.0',
        summary: 'HTTP request smuggling in cowboy',
        url: 'https://github.com/advisories/GHSA-1234-5678-9abc'
      }],
      dependencies_scanned: 8
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes(':rotating_light:'));
    assert.ok(result.includes('1 vulnerability found'));
    assert.ok(result.includes(':orange_circle: High'));
    assert.ok(result.includes('**cowboy**'));
    assert.ok(result.includes('`2.10.0`'));
    assert.ok(result.includes('[GHSA-1234-5678-9abc]'));
    assert.ok(result.includes('(CVE-2025-1234)'));
    assert.ok(result.includes('Upgrade to `2.12.0`'));
    assert.ok(result.includes('HTTP request smuggling'));
    assert.ok(result.includes('`< 2.12.0`'));
    assert.ok(result.includes('8 dependencies scanned'));
  });

  it('renders multiple vulnerabilities with different severities', () => {
    const json = JSON.stringify({
      vulnerabilities: [
        {
          ghsa_id: 'GHSA-aaaa-bbbb-cccc',
          cve_id: 'CVE-2025-0001',
          package: 'pgo',
          current_version: '0.14.0',
          severity: 'critical',
          vulnerable_range: '< 0.15.0',
          patched_version: '0.15.0',
          summary: 'SQL injection in pgo',
          url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc'
        },
        {
          ghsa_id: 'GHSA-dddd-eeee-ffff',
          cve_id: null,
          package: 'cowlib',
          current_version: '2.12.0',
          severity: 'medium',
          vulnerable_range: '>= 2.0.0, < 2.13.0',
          patched_version: '2.13.0',
          summary: 'Header parsing issue',
          url: 'https://github.com/advisories/GHSA-dddd-eeee-ffff'
        }
      ],
      dependencies_scanned: 12
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes('2 vulnerabilities found'));
    assert.ok(result.includes(':red_circle: Critical'));
    assert.ok(result.includes(':yellow_circle: Medium'));
    assert.ok(result.includes('**pgo**'));
    assert.ok(result.includes('**cowlib**'));
    // No CVE for second vuln — should not have parenthesized CVE
    assert.ok(result.includes('[GHSA-dddd-eeee-ffff](https://github.com/advisories/GHSA-dddd-eeee-ffff)'));
    assert.ok(!result.includes('GHSA-dddd-eeee-ffff) (CVE'));
  });

  it('renders vulnerability with no fix available', () => {
    const json = JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-xxxx-yyyy-zzzz',
        cve_id: null,
        package: 'somelib',
        current_version: '1.0.0',
        severity: 'low',
        vulnerable_range: '>= 0',
        patched_version: null,
        summary: 'Minor issue',
        url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz'
      }],
      dependencies_scanned: 3
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes(':green_circle: Low'));
    assert.ok(result.includes('No fix available'));
  });

  it('handles unknown severity', () => {
    const json = JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-0000-0000-0000',
        cve_id: null,
        package: 'mystery',
        current_version: '0.1.0',
        severity: 'unknown',
        vulnerable_range: '< 1.0.0',
        patched_version: '1.0.0',
        summary: 'Unknown severity vuln',
        url: 'https://github.com/advisories/GHSA-0000-0000-0000'
      }],
      dependencies_scanned: 1
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes(':white_circle: Unknown'));
  });

  it('handles missing severity field', () => {
    const json = JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-0000-0000-0000',
        cve_id: null,
        package: 'nofield',
        current_version: '0.1.0',
        vulnerable_range: '< 1.0.0',
        patched_version: null,
        summary: 'Missing severity',
        url: 'https://github.com/advisories/GHSA-0000-0000-0000'
      }],
      dependencies_scanned: 1
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes(':white_circle: Unknown'));
  });

  it('includes expandable details for each vulnerability', () => {
    const json = JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-1111-2222-3333',
        cve_id: 'CVE-2025-9999',
        package: 'testpkg',
        current_version: '1.0.0',
        severity: 'high',
        vulnerable_range: '>= 1.0.0, < 2.0.0',
        patched_version: '2.0.0',
        summary: 'A detailed vulnerability description',
        url: 'https://github.com/advisories/GHSA-1111-2222-3333'
      }],
      dependencies_scanned: 4
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes('<details><summary>GHSA-1111-2222-3333 — testpkg</summary>'));
    assert.ok(result.includes('A detailed vulnerability description'));
    assert.ok(result.includes('`>= 1.0.0, < 2.0.0`'));
    assert.ok(result.includes('</details>'));
  });

  it('handles zero dependencies scanned', () => {
    const json = JSON.stringify({
      vulnerabilities: [],
      dependencies_scanned: 0
    });
    const result = renderAuditSummary(json);
    assert.ok(result.includes('No vulnerabilities found in 0 dependencies'));
  });

  it('always includes the HTML marker comment', () => {
    const clean = renderAuditSummary(JSON.stringify({
      vulnerabilities: [],
      dependencies_scanned: 5
    }));
    assert.ok(clean.startsWith('<!-- erlang-ci-summary -->'));

    const dirty = renderAuditSummary(JSON.stringify({
      vulnerabilities: [{
        ghsa_id: 'GHSA-test',
        cve_id: null,
        package: 'pkg',
        current_version: '1.0.0',
        severity: 'low',
        vulnerable_range: '< 2.0.0',
        patched_version: '2.0.0',
        summary: 'test',
        url: 'https://example.com'
      }],
      dependencies_scanned: 1
    }));
    assert.ok(dirty.startsWith('<!-- erlang-ci-summary -->'));
  });
});
