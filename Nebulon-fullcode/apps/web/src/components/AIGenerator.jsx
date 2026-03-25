import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import './AIGenerator.css';

const FIXED_WHATSAPP_NUMBER = '9324787961';
const LOCAL_DRAFT_KEY = 'ai-catalog-builder-draft-v1';
const OPENROUTER_MODELS = [
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-exp:free',
];

function createInitialBusinessData() {
  return {
    businessName: '',
    email: '',
    whatsapp: FIXED_WHATSAPP_NUMBER,
    logo: '',
    address: '',
    themeDescription: '',
    products: [{ name: '', price: '', description: '', image: '' }],
  };
}

function sanitizeWhatsAppNumber(value) {
  return (value || '').replace(/\D/g, '');
}

function buildWhatsAppLink(productName, price, description, businessName = '') {
  const messageParts = [];
  messageParts.push(`Product: ${productName}`);
  messageParts.push(`Price: ${price}`);
  if (description) messageParts.push(`Description: ${description}`);
  if (businessName) messageParts.push(`Business: ${businessName}`);
  messageParts.push('I found this product and want to share it with you.');
  const message = encodeURIComponent(messageParts.join('\n'));
  return `https://wa.me/?text=${message}`;
}

function formatProductsForPrompt(products) {
  return products
    .map((p, i) => {
      const shortDescription = (p.description || '').trim().slice(0, 180);
      const imageLine = p.image
        ? `   ImagePlaceholder: {{PRODUCT_IMAGE_${i + 1}}}`
        : `   ImagePlaceholder: {{PRODUCT_IMAGE_${i + 1}}} (no upload, use a clean placeholder image)`;
      return `
${i + 1}. Product: ${p.name}
   Price: ${p.price}
   Description: ${shortDescription || 'Generate a professional description'}
${imageLine}
  WhatsAppLinkPlaceholder: {{WHATSAPP_LINK_${i + 1}}}
`;
    })
    .join('');
}

function injectLocalProductImages(html, products) {
  let updatedHtml = html;
  products.forEach((product, index) => {
    const token = `{{PRODUCT_IMAGE_${index + 1}}}`;
    const source = product.image || '';
    updatedHtml = updatedHtml.split(token).join(source);
  });
  return updatedHtml;
}

function injectLocalLogo(html, logo) {
  return html.split('{{BUSINESS_LOGO}}').join(logo || '');
}

function injectWhatsAppLinks(html, products, businessName) {
  let updatedHtml = html;
  products.forEach((product, index) => {
    const token = `{{WHATSAPP_LINK_${index + 1}}}`;
    const link = buildWhatsAppLink(product.name, product.price || 'the listed price', product.description, businessName);
    updatedHtml = updatedHtml.split(token).join(link);
  });
  return updatedHtml;
}

function ensureWhatsAppLinksOpenNewTab(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const anchors = doc.querySelectorAll('a[href^="https://wa.me/"]');
    anchors.forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  } catch (e) {
    return html;
  }
}

function AIGenerator() {
  const [step, setStep] = useState('input');
  const [businessData, setBusinessData] = useState(createInitialBusinessData);
  const [generatedWebsite, setGeneratedWebsite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeModelUsed, setActiveModelUsed] = useState('');
  const previewWrapperRef = useRef(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (parsed?.products?.length) {
        setBusinessData({
          ...createInitialBusinessData(),
          ...parsed,
          whatsapp: FIXED_WHATSAPP_NUMBER,
        });
      }
    } catch { /* Ignore malformed local cache. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(businessData));
  }, [businessData]);

  function updateBusinessData(field, value) {
    setBusinessData((prev) => ({ ...prev, [field]: value }));
  }

  function updateProduct(index, field, value) {
    const updated = [...businessData.products];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessData((prev) => ({ ...prev, products: updated }));
  }

  function addProduct() {
    setBusinessData((prev) => ({
      ...prev,
      products: [...prev.products, { name: '', price: '', description: '', image: '' }],
    }));
  }

  function handleImageUpload(index, file) {
    const reader = new FileReader();
    reader.onload = (e) => { updateProduct(index, 'image', e.target.result); };
    if (file) reader.readAsDataURL(file);
  }

  function handleLogoUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => { updateBusinessData('logo', e.target.result); };
    if (file) reader.readAsDataURL(file);
  }

  async function generateWebsite() {
    if (!businessData.businessName.trim()) { setError('Please enter your business name'); return; }
    if (!businessData.logo) { setError('Please upload your business logo before generating.'); return; }

    const whatsappNumber = sanitizeWhatsAppNumber(businessData.whatsapp);
    if (businessData.whatsapp && whatsappNumber.length < 8) {
      setError('Please enter a valid WhatsApp number including country code or leave it blank for sharing mode.');
      return;
    }

    const maxModelProducts = 6;
    const validProducts = businessData.products
      .filter((p) => p.name.trim())
      .slice(0, maxModelProducts)
      .map((p) => ({
        name: p.name.trim().slice(0, 40),
        price: p.price.trim().slice(0, 20),
        description: (p.description || '').trim().slice(0, 180),
        image: p.image,
      }));

    if (!validProducts.length) { setError('Please add at least one product'); return; }

    if (businessData.products.filter((p) => p.name.trim()).length > maxModelProducts) {
      setStatusMessage(`Using first ${maxModelProducts} products to fit model context.`);
    }

    setLoading(true);
    setError('');
    setActiveModelUsed('');
    setStatusMessage('Analyzing your business data...');

    try {
      const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
      if (!openrouterApiKey) {
        throw new Error('Missing VITE_OPENROUTER_API_KEY in your .env file');
      }

      const prompt = `You are a world-class UI/UX designer and frontend developer known for creating award-winning, visually stunning websites. Generate ONE complete HTML catalog page that looks like it was designed by a top design agency.

BUSINESS INFO:
- Name: ${businessData.businessName}
- Email: ${businessData.email || 'Not provided'}
- WhatsApp: ${sanitizeWhatsAppNumber(businessData.whatsapp)}
- Logo: src="{{BUSINESS_LOGO}}"
- Address: ${businessData.address || 'Not provided'}
- Style: ${businessData.themeDescription || 'Modern dark luxury with vibrant accents'}

PRODUCTS (${validProducts.length} total):
${formatProductsForPrompt(validProducts)}

DESIGN REQUIREMENTS — MAKE IT VISUALLY STUNNING:
1. Output ONE complete HTML document with ALL CSS embedded in a <style> tag.
2. Import Google Font "Inter" via <link> in <head>. Use font-family: 'Inter', sans-serif throughout.
3. Use a DARK MODE color scheme as default (rich dark backgrounds like #0a0a0f, #121218, #1a1a2e). Use vibrant accent colors (electric blue, neon green, warm amber, etc.) based on the style preference.
4. HERO SECTION:
   - Full-width with a subtle gradient background or mesh pattern
   - Large bold business name with letter-spacing and gradient text color
   - Logo displayed cleanly with max-height: 80px
   - A short tagline or subtitle
5. PRODUCT GRID:
   - ${validProducts.length === 1 ? 'Single centered card, max-width 400px' : validProducts.length === 2 ? '2-column grid on desktop, 1 on mobile' : 'auto-fit grid with minmax(280px, 1fr)'}
   - Each card MUST have: glassmorphism effect (background: rgba(255,255,255,0.05), backdrop-filter: blur(10px), border: 1px solid rgba(255,255,255,0.1))
   - Smooth hover effect: transform scale(1.03) + box-shadow glow with accent color
   - Product image with border-radius, object-fit: cover, aspect-ratio: 4/3
   - Product name bold, price with accent color and large font
   - Description in muted text
   - WhatsApp button: bold, rounded-pill, accent background with hover glow effect
   - Use exact ImagePlaceholder tokens as img src values
   - Use exact WhatsAppLinkPlaceholder tokens as button href values
6. CONTACT/ABOUT SECTION: Clean card with glassmorphism, icon-style labels for email/address
7. FOOTER: Minimal, with copyright and business name
8. CSS ANIMATIONS: Add subtle fade-in animation on page load for cards (use @keyframes + animation-delay per card)
9. Add smooth scroll behavior, box-sizing: border-box globally
10. Fully responsive with media queries for mobile (<768px) and tablet

OUTPUT: Return ONLY the raw HTML. No markdown fences, no explanations. Just <html>...</html>.`;

      setStatusMessage('Calling AI to generate your website...');

      let data = null;
      let lastError = '';
      let resolvedModel = '';

      for (const model of OPENROUTER_MODELS) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterApiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AI Catalog Builder',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: 'You are an expert frontend developer who outputs only valid complete HTML documents.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
        });
        if (response.ok) { data = await response.json(); resolvedModel = model; break; }

        const errorBody = await response.text();
        const message = `API Error ${response.status}: ${errorBody}`;
        lastError = message;
        if (!message.includes('not found') && !message.includes('model')) { throw new Error(message); }
      }

      if (!data) { throw new Error(lastError || 'No supported OpenRouter model available for this API key.'); }

      setActiveModelUsed(resolvedModel);
      setStatusMessage('Processing AI response...');

      const normalizedContent = (data?.choices?.[0]?.message?.content || '').trim();
      const rawHtmlContent = normalizedContent
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const withLogo = injectLocalLogo(rawHtmlContent, businessData.logo);
      const withImages = injectLocalProductImages(withLogo, validProducts);
      const htmlContentRaw = injectWhatsAppLinks(withImages, validProducts, businessData.businessName);
      const htmlContent = ensureWhatsAppLinksOpenNewTab(htmlContentRaw);

      if (!htmlContent.toLowerCase().includes('<html')) {
        throw new Error('AI response did not contain a valid HTML document');
      }

      setGeneratedWebsite({ html: htmlContent, businessName: businessData.businessName });
      setStep('post-generate');
      setStatusMessage('');
    } catch (err) {
      const lower = (err.message || '').toLowerCase();
      if (lower.includes('reduce the length') || lower.includes('context') || lower.includes('tokens')) {
        setError('Error: Prompt too long for model context. Reduce number of products or shorten descriptions/images, then try again.');
      } else {
        setError(`Error: ${err.message}. Make sure your VITE_OPENROUTER_API_KEY is set in .env and your OpenRouter key has credits.`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadWebsite() {
    if (!generatedWebsite) return;
    try {
      setStatusMessage('Preparing download...');
      const zip = new JSZip();
      zip.file('index.html', generatedWebsite.html);
      zip.file('README.txt', `Catalog Website for ${generatedWebsite.businessName}\n\nTo view:\n1. Extract this ZIP\n2. Open index.html in a web browser\n3. Done!\n\nThis website includes:\n- Product catalog\n- WhatsApp inquiry buttons\n- Responsive design\n- Contact information`);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedWebsite.businessName.toLowerCase().replace(/\s+/g, '-')}-catalog.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatusMessage('');
    } catch (err) {
      setError('Error downloading website: ' + err.message);
    }
  }

  function clearLocalDraft() {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setBusinessData(createInitialBusinessData());
  }

  async function enterFullscreenPreview() {
    try {
      if (previewWrapperRef.current?.requestFullscreen) {
        await previewWrapperRef.current.requestFullscreen();
      }
    } catch { /* Fullscreen API may be blocked */ }
  }

  function openPreviewInNewTab() {
    if (!generatedWebsite?.html) return;
    const blob = new Blob([generatedWebsite.html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }

  function renderInputForm() {
    return (
      <div className="ai-input-container">
        <div className="ai-input-card">
          <h1>🚀 AI Catalog Website Builder</h1>
          <p>Enter your business details & products. AI will generate your complete website!</p>

          <div className="ai-form-group">
            <label>Business Name *</label>
            <input type="text" value={businessData.businessName} onChange={(e) => updateBusinessData('businessName', e.target.value)} placeholder="e.g., Artisan Candles Studio" />
          </div>

          <div className="ai-form-row">
            <div className="ai-form-group">
              <label>Email</label>
              <input type="email" value={businessData.email} onChange={(e) => updateBusinessData('email', e.target.value)} placeholder="contact@business.com" />
            </div>
            <div className="ai-form-group">
              <label>WhatsApp Number (optional)</label>
              <input type="text" value={businessData.whatsapp} onChange={(e) => updateBusinessData('whatsapp', e.target.value)} placeholder="e.g. 919876543210" />
            </div>
          </div>

          <div className="ai-form-group">
            <label>Business Logo *</label>
            <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
            {businessData.logo ? <img src={businessData.logo} alt="Logo preview" className="ai-image-preview" /> : null}
          </div>

          <div className="ai-form-group">
            <label>Address</label>
            <input type="text" value={businessData.address} onChange={(e) => updateBusinessData('address', e.target.value)} placeholder="Your business location" />
          </div>

          <div className="ai-form-group">
            <label>Theme/Style Description *</label>
            <textarea value={businessData.themeDescription} onChange={(e) => updateBusinessData('themeDescription', e.target.value)} placeholder="e.g., Dark green neon modern tech, Warm pastels minimalist, Bold bright luxury, etc." rows="3" />
          </div>

          <h3>Products *</h3>
          <div className="ai-products-list">
            {businessData.products.map((product, index) => (
              <div className="ai-product-card" key={index}>
                <h4>Product {index + 1}</h4>
                <div className="ai-form-group">
                  <label>Product Name *</label>
                  <input type="text" value={product.name} onChange={(e) => updateProduct(index, 'name', e.target.value)} placeholder="e.g., Lavender Candle" />
                </div>
                <div className="ai-form-group">
                  <label>Price *</label>
                  <input type="text" value={product.price} onChange={(e) => updateProduct(index, 'price', e.target.value)} placeholder="e.g., Rs 499" />
                </div>
                <div className="ai-form-group">
                  <label>Description</label>
                  <textarea value={product.description} onChange={(e) => updateProduct(index, 'description', e.target.value)} placeholder="AI will generate if empty" rows="2" />
                </div>
                <div className="ai-form-group">
                  <label>Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files?.[0])} />
                  {product.image && <img src={product.image} alt="Preview" className="ai-image-preview" />}
                </div>
              </div>
            ))}
          </div>

          <button className="ai-btn ai-btn-secondary" onClick={addProduct}>+ Add Product</button>
          <button className="ai-btn ai-btn-subtle" onClick={clearLocalDraft} type="button">Clear Local Draft</button>

          {error && <p className="ai-error">{error}</p>}

          <button className="ai-btn ai-btn-primary" onClick={generateWebsite} disabled={loading}>
            {loading ? 'Generating...' : '✨ Generate Website with AI'}
          </button>
        </div>
      </div>
    );
  }

  function renderGenerating() {
    return (
      <div className="ai-generating-container">
        <div className="ai-generating-card">
          <div className="ai-spinner"></div>
          <h2>Creating Your Website</h2>
          <p>{statusMessage}</p>
        </div>
      </div>
    );
  }

  function renderPostGenerate() {
    return (
      <div className="ai-generating-container">
        <div className="ai-generating-card">
          <h2>Website Generated Successfully</h2>
          {activeModelUsed ? <p>Active model used: {activeModelUsed}</p> : null}
          <p>Do you want to edit details before preview?</p>
          <div className="ai-preview-actions">
            <button className="ai-btn ai-btn-secondary" onClick={() => setStep('input')}>Edit Details</button>
            <button className="ai-btn ai-btn-primary" onClick={() => setStep('preview')}>Continue to Preview</button>
          </div>
        </div>
      </div>
    );
  }

  function renderPreview() {
    return (
      <div className="ai-preview-container" ref={previewWrapperRef}>
        <div className="ai-preview-toolbar">
          <div>
            <h2>✨ Your AI-Generated Website</h2>
            {activeModelUsed ? <p>Active model used: {activeModelUsed}</p> : null}
          </div>
          <div className="ai-preview-actions">
            <button className="ai-btn ai-btn-secondary" onClick={() => { setStep('input'); setGeneratedWebsite(null); }}>← Edit</button>
            <button className="ai-btn ai-btn-primary" onClick={downloadWebsite}>⬇️ Download Website</button>
            <button className="ai-btn ai-btn-secondary" onClick={enterFullscreenPreview}>⛶ Full Screen</button>
            <button className="ai-btn ai-btn-secondary" onClick={openPreviewInNewTab}>↗ Open in New Tab</button>
          </div>
        </div>
        <iframe title="Generated Website Preview" className="ai-preview-iframe" srcDoc={generatedWebsite.html} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />
      </div>
    );
  }

  return (
    <div className={`ai-generator ${step === 'preview' ? 'preview-mode' : ''}`}>
      {step === 'input' && !loading && renderInputForm()}
      {loading && renderGenerating()}
      {step === 'post-generate' && !loading && generatedWebsite && renderPostGenerate()}
      {step === 'preview' && generatedWebsite && renderPreview()}
    </div>
  );
}

export default AIGenerator;
