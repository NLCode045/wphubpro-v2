import { Client, Databases } from 'node-appwrite';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Decryptie helper functie (Matcht exact jouw encrypt logica)
 */
function decrypt(encryptedData, encryptionKey) {
  try {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    // De sleutel wordt afgeleid via SHA256 (exact zoals in je add-site function)
    const derivedKey = crypto.createHash('sha256').update(String(encryptionKey), 'utf8').digest();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    throw new Error('Decryptie van API sleutel mislukt: ' + err.message);
  }
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // 1. Request body parsen
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (err) {
    return res.json({ success: false, message: 'Invalid JSON body' }, 400);
  }

  const { siteId, action, plugin_slug } = body;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Zorg dat deze in je Function settings staat!

  if (!siteId || !action) {
    return res.json({ success: false, message: 'siteId and action are required' }, 400);
  }

  try {
    log(`Ophalen site gegevens voor: ${siteId}`);

    // 2. Haal de site doc op uit de collectie
    const site = await databases.getDocument(
      'platform_db', // Jouw database ID
      'sites',       // Jouw collection ID
      siteId
    );

    const targetUrl = site.site_url || site.siteUrl;
    
    // 3. Ontsleutel de API key
    if (!site.api_key) {
      throw new Error('Geen api_key gevonden in het site document.');
    }
    
    const decryptedApiKey = decrypt(site.api_key, ENCRYPTION_KEY);
    log(`Sleutel succesvol ontsleuteld.`);

    // 4. JWT genereren (ondertekend met de PLATTE tekst sleutel)
    const token = jwt.sign(
      {
        action,
        plugin_slug: plugin_slug || null,
        exp: Math.floor(Date.now() / 1000) + 60
      },
      decryptedApiKey
    );

    // 5. URL voorbereiden met Nginx fallback parameter
    const urlWithToken = new URL(targetUrl);
    urlWithToken.searchParams.append('wphub_token', token);

    log(`Verbinding maken met agent op: ${targetUrl}`);

    // 6. Request sturen naar WordPress
    const response = await fetch(urlWithToken.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-WPHubPro-Recovery': 'true',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      return res.json({ success: true, data });
    } catch (parseError) {
      error(`WP stuurde geen JSON: ${responseText.substring(0, 200)}`);
      return res.json({ 
        success: false, 
        message: 'Site stuurde HTML (Fatal Error). Controleer of de ontsleutelde sleutel overeenkomt met de waarde in de WP database.',
        debug: responseText.substring(0, 100)
      }, 500);
    }

  } catch (err) {
    error(`Fout: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};