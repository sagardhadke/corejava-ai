import { useState, useEffect } from 'react';
import {
  MAX_API_KEYS,
  AI_PROVIDERS,
  getStoredApiKeys,
  addApiKey,
  deleteApiKey,
  maskApiKey,
  testApiKeyConnection,
  validateStoredKeysDaily,
} from '../models/apiKeyStorage.js';
import './ApiKeyManager.css';

export default function ApiKeyManager() {
  const [keys, setKeys] = useState(() => getStoredApiKeys());
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [keyInput, setKeyInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Daily validation on mount
  useEffect(() => {
    let mounted = true;
    validateStoredKeysDaily().then((updated) => {
      if (mounted && updated) {
        setKeys(updated);
      }
    });
    return () => { mounted = false; };
  }, []);

  const providerDef = AI_PROVIDERS[selectedProvider] || AI_PROVIDERS.openai;

  const handleAddKey = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const res = addApiKey({
      provider: selectedProvider,
      key: keyInput,
      label: labelInput,
    });

    if (res.success) {
      setKeys(res.keys);
      setKeyInput('');
      setLabelInput('');
      setStatusMessage({ type: 'success', text: `✓ ${providerDef.shortName} key added successfully.` });
    } else {
      setStatusMessage({ type: 'error', text: res.error });
    }
  };

  const handleDelete = (id) => {
    const updated = deleteApiKey(id);
    setKeys(updated);
    setStatusMessage({ type: 'info', text: 'API key removed from local storage.' });
  };

  const handleTestKey = async (keyRecord) => {
    setTestingId(keyRecord.id);
    setStatusMessage(null);
    const res = await testApiKeyConnection(keyRecord.provider, keyRecord.key);
    setTestingId(null);

    if (res.ok) {
      setStatusMessage({ type: 'success', text: `✓ ${res.message || 'Key verified successfully'}` });
    } else {
      setStatusMessage({ type: 'error', text: `✕ ${res.error || 'Key validation failed'}` });
    }
  };

  return (
    <div className="api-km">
      <div className="api-km__header">
        <div className="api-km__title-wrap">
          <span className="api-km__icon-gold" aria-hidden="true">🔑</span>
          <div>
            <h4 className="api-km__title">AI Provider API Keys</h4>
            <p className="api-km__subtitle">
              Bring Your Own Key (BYOK) for direct offline browser-to-AI execution.
            </p>
          </div>
        </div>
        <span className="api-km__count-pill" title="Stored keys limit">
          {keys.length} / {MAX_API_KEYS} Keys
        </span>
      </div>

      {/* Senior-Level Privacy Guarantee */}
      <div className="api-km__privacy-banner">
        <div className="api-km__privacy-shield" aria-hidden="true">
          <ShieldCheckIcon />
        </div>
        <div className="api-km__privacy-text">
          <strong>100% Private &amp; Local:</strong> Your API keys are stored exclusively in your browser&apos;s
          local database (<code>localStorage</code>). They are used strictly for direct client requests and never pass
          through our servers. We never collect or track your API usage, personal data, or course progress.
        </div>
      </div>

      {/* Add New Key Form */}
      {keys.length < MAX_API_KEYS ? (
        <form className="api-km__form" onSubmit={handleAddKey}>
          <div className="api-km__row">
            <div className="api-km__field api-km__field--provider">
              <label htmlFor="ai-provider-select" className="api-km__label">
                AI Provider
              </label>
              <div className="api-km__select-wrap">
                <span className="api-km__provider-icon" aria-hidden="true">
                  <ProviderFavicon provider={selectedProvider} />
                </span>
                <select
                  id="ai-provider-select"
                  className="api-km__select"
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setStatusMessage(null);
                  }}
                >
                  {Object.values(AI_PROVIDERS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="api-km__field api-km__field--key">
              <label htmlFor="ai-key-input" className="api-km__label">
                API Secret Key
              </label>
              <div className="api-km__input-wrap">
                <input
                  id="ai-key-input"
                  type={showKey ? 'text' : 'password'}
                  className="api-km__input"
                  placeholder={providerDef.keyPlaceholder}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  required
                />
                <button
                  type="button"
                  className="api-km__toggle-btn"
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? 'Hide key' : 'Show key'}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? '👁️' : '🔒'}
                </button>
              </div>
            </div>
          </div>

          <div className="api-km__row api-km__row--sub">
            <div className="api-km__field api-km__field--label">
              <label htmlFor="ai-label-input" className="api-km__label">
                Friendly Label (optional)
              </label>
              <input
                id="ai-label-input"
                type="text"
                className="api-km__input"
                placeholder={`e.g. Personal ${providerDef.shortName} Key`}
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
              />
            </div>

            <div className="api-km__form-actions">
              <button
                type="button"
                className="api-km__help-btn"
                onClick={() => setShowHelp((v) => !v)}
              >
                ❓ How to get a {providerDef.shortName} key
              </button>
              <button type="submit" className="api-km__add-btn">
                + Add Key
              </button>
            </div>
          </div>

          {/* Expandable Help Guide Dialog / Box */}
          {showHelp && (
            <div className="api-km__help-box">
              <div className="api-km__help-head">
                <ProviderFavicon provider={selectedProvider} />
                <span className="api-km__help-title">
                  How to generate an API key for {providerDef.name}:
                </span>
              </div>
              <ol className="api-km__help-list">
                {providerDef.helpSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <div className="api-km__help-footer">
                <a
                  href={providerDef.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-km__help-link"
                >
                  Open {providerDef.name} Developer Console ↗
                </a>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="api-km__max-banner">
          Maximum of {MAX_API_KEYS} API keys reached. Delete an existing key to add a new one.
        </div>
      )}

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div className={`api-km__status api-km__status--${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Stored Keys List */}
      <div className="api-km__list-wrap">
        <h5 className="api-km__list-title">Saved Keys on This Device</h5>
        {keys.length === 0 ? (
          <div className="api-km__empty">
            No API keys stored yet. Add an OpenAI, Claude, or Gemini key above.
          </div>
        ) : (
          <div className="api-km__keys-list">
            {keys.map((k) => {
              const prov = AI_PROVIDERS[k.provider] || { shortName: k.provider, badgeClass: '' };
              const isTesting = testingId === k.id;
              return (
                <div key={k.id} className="api-km__key-card">
                  <div className="api-km__key-info">
                    <div className="api-km__key-tags">
                      <span className="api-km__key-favicon" aria-hidden="true">
                        <ProviderFavicon provider={k.provider} />
                      </span>
                      <span className={`api-km__badge ${prov.badgeClass}`}>
                        {prov.shortName}
                      </span>
                      <span className="api-km__key-label">{k.label}</span>
                      <span className="api-km__key-date">Checked: {k.lastValidatedAt}</span>
                    </div>
                    <code className="api-km__key-code">{maskApiKey(k.key)}</code>
                  </div>

                  <div className="api-km__key-actions">
                    <button
                      type="button"
                      className="api-km__action-btn api-km__action-btn--test"
                      onClick={() => handleTestKey(k)}
                      disabled={isTesting}
                      title="Test connection to provider"
                    >
                      {isTesting ? 'Testing...' : '⚡ Test'}
                    </button>
                    <button
                      type="button"
                      className="api-km__action-btn api-km__action-btn--delete"
                      onClick={() => handleDelete(k.id)}
                      title="Remove key from local storage"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Provider Favicons: Crisp vector SVGs for OpenAI, Anthropic Claude, and Google Gemini
 */
export function ProviderFavicon({ provider }) {
  if (provider === 'openai') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ai-prov-svg ai-prov-svg--openai">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3427 7.897zm16.5991 3.8558L13.1038 8.3843l2.0153-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    );
  }

  if (provider === 'anthropic') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ai-prov-svg ai-prov-svg--anthropic">
        <path d="M13.684 2.5a1.2 1.2 0 0 0-2.368 0L9.08 14.65l-4.83-8.8a1.2 1.2 0 0 0-2.09 1.18l6.38 11.63-3.69 3.01a1.2 1.2 0 1 0 1.52 1.86l4.28-3.49 4.28 3.49a1.2 1.2 0 0 0 1.52-1.86l-3.69-3.01 6.38-11.63a1.2 1.2 0 0 0-2.09-1.18l-4.83 8.8L13.684 2.5z" />
      </svg>
    );
  }

  if (provider === 'gemini') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ai-prov-svg ai-prov-svg--gemini">
        <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12Z" />
      </svg>
    );
  }

  return <span>🔑</span>;
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
