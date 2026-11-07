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
          <span className="api-km__icon" aria-hidden="true">🔑</span>
          <div>
            <h4 className="api-km__title">AI Provider API Keys</h4>
            <p className="api-km__subtitle">
              Bring Your Own Key (BYOK) for OpenAI, Claude, and Google Gemini.
            </p>
          </div>
        </div>
        <span className="api-km__count-pill" title="Stored keys limit">
          {keys.length} / {MAX_API_KEYS} Keys
        </span>
      </div>

      {/* Professional Privacy Banner */}
      <div className="api-km__privacy-banner">
        <div className="api-km__privacy-icon">🔒</div>
        <div className="api-km__privacy-text">
          <strong>100% Private &amp; Local:</strong> Your API keys are stored exclusively in your browser&apos;s
          local database (<code>localStorage</code>). They are never sent to our servers, and we never collect,
          track, or log any of your personal data or API traffic.
        </div>
      </div>

      {/* Add New Key Form */}
      {keys.length < MAX_API_KEYS ? (
        <form className="api-km__form" onSubmit={handleAddKey}>
          <div className="api-km__row">
            <div className="api-km__field api-km__field--provider">
              <label htmlFor="ai-provider-select" className="api-km__label">
                Provider
              </label>
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
                placeholder={`e.g. My ${providerDef.shortName} Key`}
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
              <div className="api-km__help-title">
                How to generate an API key for {providerDef.name}:
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
                  Open {providerDef.name} Dashboard ↗
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

