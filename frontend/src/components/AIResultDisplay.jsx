import React, { useState } from 'react';
import { FiCopy, FiCheck, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';

function parseContent(content) {
  if (!content) return [];

  if (typeof content === 'object' && !Array.isArray(content)) {
    return Object.entries(content).map(([key, value]) => ({
      title: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      content: value,
    }));
  }

  if (Array.isArray(content)) {
    return [{ title: 'Results', content: content }];
  }

  const text = String(content);
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { title: '', lines: [] };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    const boldHeaderMatch = line.match(/^\*\*(.+?)\*\*/);
    if (headerMatch) {
      if (currentSection.title || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: headerMatch[1], lines: [] };
    } else if (boldHeaderMatch && line.trim() === `**${boldHeaderMatch[1]}**`) {
      if (currentSection.title || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: boldHeaderMatch[1], lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.title || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

function renderValue(value, depth = 0) {
  if (value === null || value === undefined) return <span className="text-muted">N/A</span>;

  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span>{value}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">None</span>;
    if (typeof value[0] === 'object') {
      return (
        <div className="ai-result-cards">
          {value.map((item, i) => (
            <div key={i} className="ai-result-card">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <strong style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    {k.replace(/[_-]/g, ' ')}
                  </strong>
                  <div style={{ fontSize: 14 }}>{renderValue(v, depth + 1)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return (
      <ul>
        {value.map((item, i) => (
          <li key={i}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--accent)', fontSize: 13 }}>
              {k.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
            </strong>{' '}
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  const text = String(value);
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length <= 1) {
    return <span>{text.replace(/\*\*(.*?)\*\*/g, '$1')}</span>;
  }

  return (
    <div>
      {lines.map((line, i) => {
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().match(/^\d+\.\s/);
        if (isBullet) {
          const clean = line.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
          return (
            <div key={i} style={{ padding: '4px 0 4px 20px', position: 'relative', fontSize: 14, color: 'var(--text-secondary)' }}>
              <span style={{ position: 'absolute', left: 0, top: 10, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              {clean.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          );
        }
        return <p key={i} style={{ marginBottom: 6, fontSize: 14, color: 'var(--text-secondary)' }}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
      })}
    </div>
  );
}

function RenderSection({ section }) {
  if (section.content !== undefined) {
    return (
      <div className="ai-result-section">
        {section.title && <h3>{section.title}</h3>}
        {renderValue(section.content)}
      </div>
    );
  }

  const bullets = [];
  const paragraphs = [];
  for (const line of section.lines || []) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
      bullets.push(trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
    } else {
      paragraphs.push(trimmed);
    }
  }

  return (
    <div className="ai-result-section">
      {section.title && <h3>{section.title}</h3>}
      {paragraphs.map((p, i) => (
        <p key={i}>{p.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
      ))}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>{b.replace(/\*\*(.*?)\*\*/g, '$1')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AIResultDisplay({ result, featureName, icon: Icon = FiCpu }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const content = result.data || result.result || result.content || result.response || result;
  const timestamp = result.timestamp || new Date().toLocaleString();

  const handleCopy = () => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sections = parseContent(content);

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <div className="ai-result-header-left">
          <div className="ai-result-icon"><Icon /></div>
          <div>
            <div className="ai-result-title">{featureName || 'AI Result'}</div>
            <div className="ai-result-timestamp">{timestamp}</div>
          </div>
        </div>
        <button className="ai-copy-btn" onClick={handleCopy}>
          {copied ? <FiCheck /> : <FiCopy />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="ai-result-body">
        {sections.length > 0 ? (
          sections.map((section, i) => <RenderSection key={i} section={section} />)
        ) : (
          <div className="ai-result-section">
            {typeof content === 'string' ? (
              <p>{content}</p>
            ) : (
              renderValue(content)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
