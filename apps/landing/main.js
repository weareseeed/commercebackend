// --- Interactive Tab Code Snippets ---
const CODE_SNIPPETS = {
  seller: `// Initialize the SDK Client
<span class="code-keyword">import</span> { CommerceBackendClient } <span class="code-keyword">from</span> <span class="code-string">'@commercebackend/sdk-js'</span>;

<span class="code-keyword">const</span> client = <span class="code-keyword">new</span> <span class="code-function">CommerceBackendClient</span>({
  baseUrl: <span class="code-string">'https://api.commercebackend.com'</span>,
  apiKey: <span class="code-string">'cb_test_seller_8f7b2c...'</span>
});

<span class="code-comment">// Create a fixed-price listing for buyers to discover</span>
<span class="code-keyword">const</span> { listing } = <span class="code-keyword">await</span> client.<span class="code-function">createListing</span>({
  title: <span class="code-string">'Autonomous Agent Hardware DevKit'</span>,
  description: <span class="code-string">'Edge AI hardware kit pre-flashed with local runtime.'</span>,
  type: <span class="code-string">'physical_good'</span>,
  priceAmount: <span class="code-keyword">15000</span>, <span class="code-comment">// $150.00 in cents</span>
  currency: <span class="code-string">'USD'</span>,
  quantityAvailable: <span class="code-keyword">15</span>,
  attributes: {
    processor: <span class="code-string">'RK3588'</span>,
    ram_gb: <span class="code-keyword">16</span>
  },
  fulfillmentInstructions: <span class="code-string">'Ship via UPS Ground within 48 hours.'</span>
});

console.<span class="code-function">log</span>(<span class="code-string">\`Listing published! ID: \${listing.id}\`</span>);`,

  buyer: `// Initialize the SDK Client
<span class="code-keyword">import</span> { CommerceBackendClient } <span class="code-keyword">from</span> <span class="code-string">'@commercebackend/sdk-js'</span>;

<span class="code-keyword">const</span> baseUrl = <span class="code-string">'https://api.commercebackend.com'</span>;
<span class="code-keyword">const</span> apiKey = <span class="code-string">'cb_test_buyer_3d9e4a...'</span>;
<span class="code-keyword">const</span> client = <span class="code-keyword">new</span> <span class="code-function">CommerceBackendClient</span>({
  baseUrl,
  apiKey
});

<span class="code-comment">// 1. Search for catalog items matching keywords</span>
<span class="code-keyword">const</span> { results } = <span class="code-keyword">await</span> client.<span class="code-function">search</span>(<span class="code-string">'RK3588 devkit'</span>);
<span class="code-keyword">const</span> bestMatch = results[<span class="code-keyword">0</span>];
console.<span class="code-function">log</span>(<span class="code-string">\`Matched with score: \${bestMatch.score}\`</span>);

<span class="code-comment">// 2. Submit an offer before checkout</span>
<span class="code-keyword">const</span> { offer } = <span class="code-keyword">await</span> <span class="code-function">fetch</span>(
  <span class="code-string">\`\${baseUrl}/v1/listings/\${bestMatch.listing.id}/offers\`</span>,
  {
    method: <span class="code-string">'POST'</span>,
    headers: {
      authorization: <span class="code-string">\`Bearer \${apiKey}\`</span>,
      <span class="code-string">'content-type'</span>: <span class="code-string">'application/json'</span>
    },
    body: JSON.<span class="code-function">stringify</span>({
      quantity: <span class="code-keyword">1</span>,
      priceAmount: <span class="code-keyword">12500</span>,
      expiresAt: <span class="code-string">'2026-06-30T23:59:59Z'</span>
    })
  }
).<span class="code-function">then</span>(res =&gt; res.<span class="code-function">json</span>());

<span class="code-comment">// 3. Checkout uses accepted offer terms</span>
<span class="code-keyword">const</span> { checkoutIntent } = <span class="code-keyword">await</span> client.<span class="code-function">createCheckoutIntent</span>({
  listingId: bestMatch.listing.id,
  offerId: offer.id,
  quantity: offer.quantity,
  successUrl: <span class="code-string">'https://my-agent.com/success?id={CHECKOUT_INTENT_ID}'</span>,
  cancelUrl: <span class="code-string">'https://my-agent.com/cancel'</span>
});

console.<span class="code-function">log</span>(<span class="code-string">\`Redirect buyer to payment URL: \${checkoutIntent.checkoutUrl}\`</span>);`
};

document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const codeContent = document.getElementById('code-content');
  const fileTitle = document.getElementById('file-title');

  function loadTab(tabId) {
    // Update active tab class
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Load snippet
    if (codeContent && CODE_SNIPPETS[tabId]) {
      codeContent.innerHTML = CODE_SNIPPETS[tabId];
      if (fileTitle) {
        fileTitle.textContent = tabId === 'seller' ? 'seller-agent.ts' : 'buyer-agent.ts';
      }
    }
  }

  // Bind click handlers to tab buttons
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      loadTab(btn.dataset.tab);
    });
  });

  // Load default tab
  loadTab('seller');

  // Attempt to dynamically fetch and display local git origin URL if available
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    // Check local storage or document metadata for a configured repository URL
    githubLink.href = 'https://github.com/weareseeed/commercebackend';
  }
});
