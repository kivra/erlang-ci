// Renders a GitHub PR comment body from rebar3_audit JSON output.
// Used by the summary job in ci.yml via actions/github-script.

function renderAuditSummary(auditJson) {
  if (!auditJson || !auditJson.trim()) return null;

  let audit;
  try { audit = JSON.parse(auditJson); } catch { return null; }

  const vulns = audit.vulnerabilities || [];
  const scanned = audit.dependencies_scanned || 0;
  const lines = ['<!-- erlang-ci-summary -->'];

  if (vulns.length === 0) {
    lines.push('### :shield: Security Audit');
    lines.push(`No vulnerabilities found in ${scanned} dependencies.`);
  } else {
    lines.push(`### :rotating_light: Security Audit — ${vulns.length} ${vulns.length === 1 ? 'vulnerability' : 'vulnerabilities'} found`);
    lines.push('');

    const severity_icon = {
      critical: ':red_circle:',
      high: ':orange_circle:',
      medium: ':yellow_circle:',
      low: ':green_circle:',
      unknown: ':white_circle:',
    };

    lines.push('| Severity | Package | Version | Advisory | Fix |');
    lines.push('|:---:|---|---|---|---|');

    for (const v of vulns) {
      const sev = (v.severity || 'unknown').toLowerCase();
      const icon = severity_icon[sev] || ':white_circle:';
      const label = sev.charAt(0).toUpperCase() + sev.slice(1);
      const advisory = v.cve_id
        ? `[${v.ghsa_id}](${v.url}) (${v.cve_id})`
        : `[${v.ghsa_id}](${v.url})`;
      const fix = v.patched_version
        ? `Upgrade to \`${v.patched_version}\``
        : 'No fix available';
      lines.push(`| ${icon} ${label} | **${v.package}** | \`${v.current_version}\` | ${advisory} | ${fix} |`);
    }

    lines.push('');

    for (const v of vulns) {
      lines.push(`<details><summary>${v.ghsa_id} — ${v.package}</summary>`);
      lines.push('');
      lines.push(`> ${v.summary}`);
      lines.push(`>`);
      lines.push(`> **Vulnerable range:** \`${v.vulnerable_range}\``);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push(`${scanned} dependencies scanned.`);
  }

  return lines.join('\n');
}

module.exports = { renderAuditSummary };
