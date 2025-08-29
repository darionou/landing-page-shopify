const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Simplified Liquid simulator
class LiquidRenderer {
  constructor() {
    this.snippets = {};
    this.loadSnippets();
  }

  loadSnippets() {
    const snippetsDir = path.join(__dirname, 'snippets');
    if (fs.existsSync(snippetsDir)) {
      const files = fs.readdirSync(snippetsDir);
      files.forEach(file => {
        if (file.endsWith('.liquid')) {
          const name = file.replace('.liquid', '');
          const content = fs.readFileSync(path.join(snippetsDir, file), 'utf8');
          this.snippets[name] = content;
        }
      });
    }
  }

  render(liquidContent, variables = {}) {
    let rendered = liquidContent;

    // Remove Liquid comments
    rendered = rendered.replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/g, '');

    // Replace section variables
    const sectionId = variables.section?.id || 'test-section-123';
    rendered = rendered.replace(/{{\s*section\.id\s*}}/g, sectionId);

    // Replace settings with default values
    rendered = rendered.replace(/{{\s*section\.settings\.(\w+)\s*\|\s*default:\s*['"]([^'"]*)['"]\s*}}/g, 
      (match, setting, defaultValue) => {
        return variables.section?.settings?.[setting] || defaultValue;
      });

    // Process render tags (snippets)
    rendered = rendered.replace(/{%\s*render\s+['"]([^'"]+)['"]\s*(?:,\s*(\w+):\s*([^%]+))?\s*%}/g, 
      (match, snippetName, paramName, paramValue) => {
        if (this.snippets[snippetName]) {
          let snippetContent = this.snippets[snippetName];
          if (paramName && paramValue) {
            let value = paramValue.trim();
            
            // If the value is section.id, replace it with the actual ID
            if (value === 'section.id') {
              value = variables.section?.id || 'default-section';
            }
            
            console.log(`Rendering snippet ${snippetName} with ${paramName}: ${value}`);
            snippetContent = snippetContent.replace(new RegExp(`{{\\s*${paramName}\\s*(?:\\|[^}]*)?}}`, 'g'), value);
          }
          return this.render(snippetContent, variables);
        }
        return `<!-- Snippet ${snippetName} not found -->`;
      });

    // Remove schema
    rendered = rendered.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '');

    // Remove other unprocessed Liquid tags
    rendered = rendered.replace(/{%[^%]*%}/g, '');
    rendered = rendered.replace(/{{[^}]*}}/g, '');

    return rendered;
  }
}

const renderer = new LiquidRenderer();

app.get('/', (req, res) => {
  try {
    // Read the template file
    const sectionPath = path.join(__dirname, 'templates/page.personalized-landing.liquid');
    const sectionContent = fs.readFileSync(sectionPath, 'utf8');

    const variables = {
      section: {
        id: 'personalized-landing-123',
        settings: {
          welcome_prefix: 'Welcome back,',
          loading_text: 'Loading your personalized content...',
          error_title: 'Welcome!',
          error_message: 'We are having trouble loading your personalized content.',
          retry_text: 'Retry'
        }
      }
    };

    // Render the Liquid content
    const renderedContent = renderer.render(sectionContent, variables);

    // Create the complete HTML page
    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personalized Landing Page - Local Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .debug-bar {
            background: #333;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14px;
        }
        .debug-bar a {
            color: #007acc;
            text-decoration: none;
            margin: 0 10px;
        }
        .debug-info {
            background: #e3f2fd;
            padding: 10px;
            margin: 10px;
            border-radius: 4px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="debug-bar">
        🔧 Local Test | 
        <a href="/?user_id=gid://shopify/Customer/7408906436798">With Valid Shopify ID</a> | 
        <a href="/">Without User ID</a> | 
        <a href="/api/health">Health Check</a>
    </div>
    
    <div class="debug-info">
        <strong>Debug Info:</strong> User ID from query: ${req.query.user_id || 'Not provided'}
    </div>
    
    ${renderedContent}
</body>
</html>`;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/apps/personalized-landing/proxy/user-landing', async (req, res) => {
  const userId = req.query.user_id;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    // Call your Node.js app running on port 3001
    const fetch = require('node-fetch');
    const response = await fetch(`http://localhost:3001/proxy/user-landing?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-shop-domain': 'tabernex.myshopify.com'
      }
    });

    const data = await response.json();
    
    // Always return the real API response, even if it contains errors
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Error calling your app:', error);
    
    // Return connection error without fallback
    res.status(500).json({
      success: false,
      error: `Connection error: ${error.message}`,
      _debug: {
        source: 'connection_error',
        user_id: userId
      }
    });
  }
});

// API to test the connection
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Local server is running'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Local server started!`);
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Test with user_id: http://localhost:${PORT}?user_id=gid://shopify/Customer/7408906436798`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});