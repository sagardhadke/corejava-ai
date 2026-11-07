import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
          {/* Provider Selection (Interactive Cards + Native Accessible Select) */}
          <div className="api-km__field">
            <div className="api-km__field-header">
              <label htmlFor="ai-provider-select" className="api-km__label">
                AI Provider
              </label>
              <button
                type="button"
                className="api-km__help-btn"
                onClick={() => setShowHelp(true)}
                aria-haspopup="dialog"
                aria-expanded={showHelp}
                title={`Open step-by-step developer guide for ${providerDef.shortName}`}
              >
                <span className="api-km__help-btn-icon" aria-hidden="true">📖</span>
                <span>How to get a {providerDef.shortName} key</span>
                <span className="api-km__help-btn-arrow" aria-hidden="true">↗</span>
              </button>
            </div>

            <div className="api-km__provider-cards" role="radiogroup" aria-label="Available Services">
              {Object.values(AI_PROVIDERS).map((p) => {
                const isSelected = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`api-km__provider-card ${isSelected ? 'api-km__provider-card--active' : ''}`}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setStatusMessage(null);
                    }}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <span className="api-km__provider-card-icon" aria-hidden="true">
                      <ProviderFavicon provider={p.id} />
                    </span>
                    <span className="api-km__provider-card-name">{p.shortName}</span>
                  </button>
                );
              })}
            </div>

            {/* Native select element kept for test compatibility & assistive tech */}
            <select
              id="ai-provider-select"
              className="api-km__select-native"
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

          {/* API Secret Key Field (Full Width) */}
          <div className="api-km__field">
            <label htmlFor="ai-key-input" className="api-km__label">
              API Secret Key
            </label>
            <div className="api-km__input-wrap">
              <input
                id="ai-key-input"
                type={showKey ? 'text' : 'password'}
                className="api-km__input api-km__input--code"
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

          {/* Optional Friendly Label Field */}
          <div className="api-km__field">
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

          {/* Submit Action */}
          <div className="api-km__submit-wrap">
            <button type="submit" className="api-km__add-btn">
              + Add Key
            </button>
          </div>
        </form>
      ) : (
        <div className="api-km__max-banner">
          Maximum of {MAX_API_KEYS} API keys reached. Delete an existing key to add a new one.
        </div>
      )}

      {/* Senior Modal Dialog for Step-by-Step API Key Setup */}
      <ApiKeyHelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        providerDef={providerDef}
      />

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
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    );
  }

  if (provider === 'gemini') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ai-prov-svg ai-prov-svg--gemini">
        <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
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

/**
 * Senior Architect Help Guide Modal for API Key Generation
 * Features:
 * - Full-screen blurred backdrop with ESC and backdrop-click to dismiss
 * - Direct Console Hero Redirect Card (1-click link to official provider key portal)
 * - 4-step clear, numbered setup guide
 * - 100% Client-Side Privacy assurance
 * - Accessible keyboard navigation with ESC listener
 */
export function ApiKeyHelpModal({ open, onClose, providerDef }) {
  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !providerDef) return null;

  const modalContent = (
    <div
      className="api-help-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="api-help-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-help-title"
        aria-describedby="api-help-desc"
      >
        {/* Header */}
        <div className="api-help-modal__header">
          <div className="api-help-modal__header-left">
            <span className="api-help-modal__favicon" aria-hidden="true">
              <ProviderFavicon provider={providerDef.id} />
            </span>
            <div>
              <div className="api-help-modal__pill-label">DEVELOPER SETUP GUIDE</div>
              <h3 id="api-help-title" className="api-help-modal__title">
                How to get a {providerDef.shortName} key
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="api-help-modal__close-btn"
            onClick={onClose}
            aria-label="Close guide"
            title="Close dialog (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="api-help-modal__body">
          <p id="api-help-desc" className="api-help-modal__desc">
            Follow the 4 quick steps below to generate an API key directly from your {providerDef.name} account.
          </p>

          {/* Primary Call-to-Action Hero Box: Direct Console Redirect */}
          <div className="api-help-cta-card">
            <div className="api-help-cta-card__left">
              <span className="api-help-cta-card__badge">OFFICIAL CONSOLE</span>
              <h4 className="api-help-cta-card__title">
                {providerDef.name} Portal
              </h4>
              <p className="api-help-cta-card__subtitle">
                Redirect directly to your {providerDef.shortName} developer console in a secure tab to create and copy your key.
              </p>
            </div>
            <a
              href={providerDef.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="api-help-cta-btn"
            >
              <span>Open {providerDef.shortName} Console</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* Step-by-Step Interactive Roadmap */}
          <div className="api-help-steps">
            <div className="api-help-steps__title">Step-by-Step Instructions</div>
            <ol className="api-help-steps__list">
              {providerDef.helpSteps.map((step, idx) => (
                <li key={idx} className="api-help-step-item">
                  <div className="api-help-step-num" aria-hidden="true">
                    {idx + 1}
                  </div>
                  <div className="api-help-step-content">
                    <span className="api-help-step-text">{step}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Local Security & Privacy Notice */}
          <div className="api-help-privacy-box">
            <div className="api-help-privacy-icon" aria-hidden="true">
              <ShieldCheckIcon />
            </div>
            <div className="api-help-privacy-text">
              <strong>100% Client-Side Privacy:</strong> Your secret key stays on this device. It is stored exclusively in your browser&apos;s local storage and used solely for direct requests to {providerDef.shortName}.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="api-help-modal__footer">
          <a
            href={providerDef.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="api-help-secondary-link"
          >
            Open {providerDef.name} Developer Console ↗
          </a>
          <button
            type="button"
            className="api-help-dismiss-btn"
            onClick={onClose}
          >
            Got it, I&apos;m Ready
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
